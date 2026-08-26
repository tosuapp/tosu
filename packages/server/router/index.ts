import {
    type ConfigBinding,
    ConfigManager,
    JsonSafeParse,
    downloadFile,
    getCachePath,
    getProgramPath,
    getStaticPath,
    platformResolver,
    unzip,
    wLogger
} from '@tosu/common';
import { autoUpdater } from '@tosu/updater';
import { exec } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import rosu from 'rosu-pp-js';

import type { Server } from '../index';
import { html, json } from '../utils';
import {
    buildEmptyPage,
    buildExternalCounters,
    buildInstructionLocal,
    buildLocalCounters,
    buildSettings,
    getLocalCounters,
    saveSettings
} from '../utils/counters';
import { type ISettings } from '../utils/counters.types';
import { directoryWalker } from '../utils/directories';
import type { TosuRequest } from '../utils/http';
import { parseCounterSettings } from '../utils/parseSettings';
import { SERVER_ASSETS_PATH } from '../utils/paths';
import {
    type Report,
    generateReport,
    generateReportHTML
} from '../utils/report';

const execAsync = promisify(exec);

function requestAddress(req: TosuRequest) {
    const host = req.headers.get('host');
    const referer = req.headers.get('referer');

    return new URL(
        host ? `http://${host}/` : referer || `http://${req.remoteAddress}/`
    );
}

export default function buildBaseApi(server: Server) {
    server.app.route('/json', 'GET', (req) => {
        const osuInstance = req.instanceManager.getInstance(
            req.instanceManager.focusedClient
        );
        if (!osuInstance) {
            throw new Error('osu is not ready/running');
        }

        return json(osuInstance.getState(req.instanceManager));
    });

    server.app.route(/^\/api\/counters\/search\/(?<query>.*)/, 'GET', (req) => {
        const query = decodeURI(req.params.query)
            .replace(/[^a-z0-9A-Z]/, '')
            .toLowerCase();

        const parseAddress = requestAddress(req);
        const parseReferer = new URL(
            req.headers.get('referer') || `http://${req.remoteAddress}/`
        );
        if (parseReferer.pathname === `/available`) {
            return buildExternalCounters(parseAddress.hostname, query);
        }

        return buildLocalCounters(parseAddress.hostname, query);
    });

    server.app.route(
        /^\/api\/counters\/download\/(?<url>.*)/,
        'GET',
        async (req) => {
            const folderName = req.query.name;
            if (!folderName) {
                return json({ error: 'no folder name' });
            }

            const cacheFolder = getCachePath();
            const staticPath = getStaticPath();
            const folderPath = path.join(staticPath, decodeURI(folderName));

            const tempPath = path.join(cacheFolder, `${Date.now()}.zip`);

            if (fs.existsSync(folderPath) && req.query.update !== 'true') {
                return json({ error: 'Folder already exist' });
            }

            if (!fs.existsSync(cacheFolder)) fs.mkdirSync(cacheFolder);

            let result: string;
            try {
                result = await downloadFile(req.params.url, tempPath);
            } catch (reason) {
                wLogger.error(
                    `Failed to download counter %${folderName}%:`,
                    (reason as Error).message
                );
                wLogger.debug(`Counter download error details:`, reason);

                return json({ error: (reason as Error).message });
            }

            try {
                await unzip(result, folderPath);
            } catch (reason) {
                fs.unlinkSync(tempPath);

                wLogger.error(
                    `Failed to unzip counter %${folderName}%:`,
                    (reason as Error).message
                );
                wLogger.debug('Counter unzip error details:', reason);

                return json({ error: (reason as Error).message });
            }

            wLogger.info(
                `PP Counter %${folderName}% downloaded successfully (%${req.headers.get('referer')}%)`
            );
            fs.unlinkSync(tempPath);

            server.WS_COMMANDS.redispatch('unzip', 'getOverlays', `__ingame__`);

            return json({ status: 'Finished', path: result });
        }
    );

    server.app.route(
        /^\/api\/counters\/open\/(?<name>.*)/,
        'GET',
        async (req) => {
            const folderName = req.params.name;
            if (!folderName) {
                return json({ error: 'no folder name' });
            }

            const staticPath = getStaticPath();
            let folderPath = path.join(staticPath, decodeURI(folderName));
            if (folderName === 'tosu.exe') folderPath = getProgramPath();
            else if (folderName === 'static.exe') folderPath = getStaticPath();

            if (!fs.existsSync(folderPath)) {
                return json({ error: "Folder doesn't exists" });
            }

            wLogger.info(
                `Opening PP Counter folder: %${folderName}% (%${req.headers.get('referer')}%)`
            );

            const platform = platformResolver(process.platform);
            try {
                await execAsync(`${platform.command} "${folderPath}"`, {
                    windowsHide: true
                });
            } catch (err) {
                wLogger.error(
                    `Failed to open folder %${folderName}%:`,
                    (err as Error).message
                );
                wLogger.debug('Folder open error details:', err);

                return json({
                    error: `Error opening folder: ${(err as Error).message}`
                });
            }

            return json({ status: 'opened' });
        }
    );

    server.app.route(/^\/api\/counters\/delete\/(?<name>.*)/, 'GET', (req) => {
        const folderName = req.params.name;
        if (!folderName) {
            return json({ error: 'no folder name' });
        }

        const staticPath = getStaticPath();
        const folderPath = path.join(staticPath, decodeURI(folderName));

        if (!fs.existsSync(folderPath)) {
            return json({ error: "Folder doesn't exists" });
        }

        wLogger.info(
            `PP Counter removed: %${folderName}% (%${req.headers.get('referer')}%)`
        );

        fs.rmSync(folderPath, { recursive: true, force: true });

        server.WS_COMMANDS.redispatch('remove', 'getOverlays', `__ingame__`);

        return json({ status: 'deleted' });
    });

    server.app.route(
        /^\/api\/counters\/settings\/(?<name>.*)/,
        'GET',
        (req) => {
            const folderName = req.params.name;
            if (!folderName) {
                return json({ error: 'No folder name' });
            }

            const settings = parseCounterSettings(folderName, 'parse');
            if (settings instanceof Error) {
                wLogger.debug(
                    `Failed to parse settings for %${folderName}%:`,
                    settings
                );

                return json({ error: settings.message });
            }

            wLogger.info(
                `Settings accessed for %${folderName}% (%${req.headers.get('referer')}%)`
            );

            return json(settings);
        }
    );

    server.app.route(
        /^\/api\/counters\/settings\/(?<name>.*)/,
        'POST',
        (req) => {
            const body: ISettings[] | Error = JsonSafeParse({
                isFile: false,
                payload: req.body,
                defaultValue: new Error('Failed to parse body')
            });
            if (body instanceof Error) throw body;

            const folderName = req.params.name;
            if (!folderName) {
                return json({ error: 'no folder name' });
            }

            if (req.query.update === 'yes') {
                const result = parseCounterSettings(
                    folderName,
                    'dev/save',
                    body as any
                );
                if (result instanceof Error) {
                    wLogger.debug(
                        `Failed to update settings for %${folderName}%:`,
                        result
                    );

                    return json({ error: result.message });
                }

                wLogger.info(
                    `Settings re-created for %${folderName}% (%${req.headers.get('referer')}%)`
                );

                fs.writeFileSync(
                    result.settingsPath!,
                    JSON.stringify(result.settings),
                    'utf8'
                );

                return json({ result: 'success' });
            }

            wLogger.info(
                `Settings saved for %${folderName}% (%${req.headers.get('referer')}%)`
            );

            const saved = saveSettings(folderName, body as any);
            if (saved instanceof Error) {
                wLogger.debug(
                    `Failed to save settings for %${folderName}%:`,
                    saved
                );

                return json({ error: saved.message });
            }

            server.WS_COMMANDS.redispatch(
                'save settings',
                'getSettings',
                folderName
            );

            return json({ result: 'success' });
        }
    );

    server.app.route('/api/runUpdates', 'GET', async () => {
        const result = await autoUpdater('server');
        if (result instanceof Error) return json({ status: result.message });

        return json({ status: result.status });
    });

    server.app.route('/api/settingsSave', 'POST', (req) => {
        const body: Record<ConfigBinding, string> | Error = JsonSafeParse({
            isFile: false,
            payload: req.body,
            defaultValue: new Error('Failed to parse body')
        });
        if (body instanceof Error) throw body;

        ConfigManager.refreshConfig(body, true);
        return json({ status: 'updated' });
    });

    server.app.route('/api/calculate/pp', 'GET', (req) => {
        const query = req.query;

        const osuInstance = req.instanceManager.getInstance(
            req.instanceManager.focusedClient
        );
        if (!osuInstance) {
            throw new Error('osu is not ready/running');
        }

        const { global, menu, beatmapPP } = osuInstance.getServices([
            'global',
            'menu',
            'beatmapPP'
        ]);

        let beatmap: rosu.Beatmap;
        const exists = fs.existsSync(query.path);
        if (exists) {
            const beatmapFilePath = path.join(
                global.songsFolder,
                menu.folder,
                menu.filename
            );

            const beatmapContent = fs.readFileSync(beatmapFilePath, 'utf8');
            beatmap = new rosu.Beatmap(beatmapContent);
        } else {
            const beatmapContent: string | undefined = beatmapPP.beatmapContent;
            if (!beatmapContent) {
                throw new Error('No beatmap currently playing');
            }

            beatmap = new rosu.Beatmap(beatmapContent);
        }

        if (query.mode !== undefined) {
            beatmap.convert(Number.parseInt(query.mode));
        }

        const params: rosu.PerformanceArgs = {};

        if (query.ar !== undefined) params.ar = +query.ar;
        if (query.cs !== undefined) params.cs = +query.cs;
        if (query.hp !== undefined) params.hp = +query.hp;
        if (query.od !== undefined) params.od = +query.od;

        if (query.clockRate !== undefined) params.clockRate = +query.clockRate;
        if (query.passedObjects !== undefined)
            params.passedObjects = +query.passedObjects;
        if (query.combo !== undefined) params.combo = +query.combo;
        if (query.nMisses !== undefined) params.misses = +query.nMisses;
        if (query.n100 !== undefined) params.n100 = +query.n100;
        if (query.n300 !== undefined) params.n300 = +query.n300;
        if (query.n50 !== undefined) params.n50 = +query.n50;
        if (query.nGeki !== undefined) params.nGeki = +query.nGeki;
        if (query.nKatu !== undefined) params.nKatu = +query.nKatu;
        if (query.mods !== undefined) params.mods = +query.mods;
        if (query.acc !== undefined) params.accuracy = +query.acc;
        if (query.sliderEndHits !== undefined)
            params.sliderEndHits = +query.sliderEndHits;
        if (query.smallTickHits !== undefined)
            params.smallTickHits = +query.smallTickHits;
        if (query.largeTickHits !== undefined)
            params.largeTickHits = +query.largeTickHits;
        if (query.hitresultPriority !== undefined)
            params.hitresultPriority = +query.hitresultPriority;

        const calculate = new rosu.Performance(params).calculate(beatmap);
        const response = json(calculate);

        beatmap.free();
        calculate.free();

        return response;
    });

    server.app.route('/api/generateReport', 'GET', async (req) => {
        // Report generation and streaming can outlive the 30 s idle timeout.
        server.app.server?.timeout(req.raw, 0);

        let report: Report;
        try {
            report = await generateReport(req.instanceManager);
        } catch (err) {
            return new Response(
                `Server Error: ${(err as Error).message || 'Unknown error'}`,
                {
                    status: 500,
                    headers: { 'Content-Type': 'text/plain; charset=utf-8' }
                }
            );
        }

        const encoder = new TextEncoder();
        const generator = generateReportHTML(report);
        const stream = new ReadableStream<Uint8Array>({
            async pull(controller) {
                try {
                    const { value, done } = await generator.next();
                    if (done) {
                        controller.close();
                        return;
                    }

                    controller.enqueue(encoder.encode(value));
                } catch (err) {
                    wLogger.warn(
                        'Failed to stream report:',
                        (err as Error).message
                    );
                    wLogger.debug('Report streaming error details:', err);

                    controller.error(err);
                }
            },
            cancel() {
                wLogger.debug('Report download cancelled by the client');
                return generator.return(undefined).then(() => undefined);
            }
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/html; charset=utf-8',
                'Content-Disposition': `attachment; filename="${encodeURIComponent(`tosu-report-${report.date.getTime()}.html`)}"`
            }
        });
    });

    server.app.route(/\/api\/ingame/, 'GET', async () => {
        let content: string;
        try {
            content = await Bun.file(
                path.join(SERVER_ASSETS_PATH, 'ingame.html')
            ).text();
        } catch (err) {
            wLogger.debug(`Failed to read ingame.html:`, err);

            return new Response(
                `Server Error: ${(err as NodeJS.ErrnoException).code}`,
                { status: 500 }
            );
        }

        const counters = getLocalCounters();
        content += `\n\n\n<script>\rwindow.COUNTERS = ${JSON.stringify(counters)}\r</script>\n`;

        return html(content);
    });

    server.app.route('/favicon.ico', 'GET', async () => {
        const file = Bun.file(path.join(SERVER_ASSETS_PATH, 'favicon.ico'));
        if (!(await file.exists())) {
            wLogger.debug(`Failed to read favicon.ico: not found`);

            return new Response('<html>page not found</html>', {
                status: 404,
                headers: { 'Content-Type': 'text/html' }
            });
        }

        return new Response(file, {
            headers: {
                'Content-Type': 'image/vnd.microsoft.icon; charset=utf-8'
            }
        });
    });

    server.app.route(/.*/, 'GET', async (req) => {
        const url = req.pathname || '/';
        try {
            if (url.startsWith(`/.well-know`)) {
                return new Response(null, {
                    status: 404,
                    statusText: 'Not Found'
                });
            }

            if (url === '/') {
                return await buildLocalCounters(requestAddress(req).hostname);
            }

            if (url === '/settings') {
                if (req.query.overlay) return await buildEmptyPage();
                return await buildSettings();
            }
            if (url === '/local-overlays') return await buildInstructionLocal();
            if (url === '/available') {
                return await buildExternalCounters(
                    requestAddress(req).hostname
                );
            }

            const staticPath = getStaticPath();

            const extension = path.extname(url);

            // ignore empty and one letter extension (extension returned with .)
            if (extension.length < 3 && !url.endsWith('/')) {
                return new Response(null, {
                    status: 301,
                    headers: { Location: url + '/' }
                });
            }

            const selectIndexHTML = url.endsWith('/')
                ? url + 'index.html'
                : url;
            return await directoryWalker({
                req,
                baseUrl: url,
                pathname: selectIndexHTML,
                folderPath: staticPath
            });
        } catch (error) {
            wLogger.warn(
                `Failed to process request for %${url}%:`,
                (error as Error).message
            );
            wLogger.debug(`Request error details for %${url}%:`, error);

            return new Response((error as Error).message || '', {
                status: 404
            });
        }
    });
}
