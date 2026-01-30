import {
    ConfigBinding,
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
import {
    DifficultyCalculatorFactory,
    Mod,
    ModsCollection,
    Beatmap as NativeBeatmap,
    OsuDifficultyCalculator,
    OsuPerformanceCalculator,
    PerformanceCalculatorFactory,
    Ruleset
} from '@tosuapp/osu-native-wrapper';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';

import { Server, sendJson } from '../index';
import {
    buildEmptyPage,
    buildExternalCounters,
    buildInstructionLocal,
    buildLocalCounters,
    buildSettings,
    getLocalCounters,
    saveSettings
} from '../utils/counters';
import { ISettings } from '../utils/counters.types';
import { directoryWalker } from '../utils/directories';
import { parseCounterSettings } from '../utils/parseSettings';
import { generateReport, generateReportHTML } from '../utils/report';

const pkgAssetsPath =
    'pkg' in process
        ? path.join(__dirname, 'assets')
        : path.join(__dirname, '../assets');

export default function buildBaseApi(server: Server) {
    server.app.route('/json', 'GET', (req, res) => {
        const osuInstance: any = req.instanceManager.getInstance(
            req.instanceManager.focusedClient
        );
        if (!osuInstance) {
            throw new Error('osu is not ready/running');
        }

        const json = osuInstance.getState(req.instanceManager);
        return sendJson(res, json);
    });

    server.app.route(
        /^\/api\/counters\/search\/(?<query>.*)/,
        'GET',
        (req, res) => {
            const query = decodeURI(req.params.query)
                .replace(/[^a-z0-9A-Z]/, '')
                .toLowerCase();

            const parseAddress = new URL(
                req.headers.host
                    ? `http://${req.headers.host}/`
                    : req.headers.referer ||
                          `http://${req.socket.remoteAddress}/`
            );

            const parseReferer = new URL(
                req.headers.referer || `http://${req.socket.remoteAddress}/`
            );
            if (parseReferer.pathname === `/available`) {
                return buildExternalCounters(res, parseAddress.hostname, query);
            }

            return buildLocalCounters(res, parseAddress.hostname, query);
        }
    );

    server.app.route(
        /^\/api\/counters\/download\/(?<url>.*)/,
        'GET',
        (req, res) => {
            const folderName = req.query.name;
            if (!folderName) {
                return sendJson(res, {
                    error: 'no folder name'
                });
            }

            const cacheFolder = getCachePath();
            const staticPath = getStaticPath();
            const folderPath = path.join(staticPath, decodeURI(folderName));

            const tempPath = path.join(cacheFolder, `${Date.now()}.zip`);

            if (fs.existsSync(folderPath) && req.query.update !== 'true') {
                return sendJson(res, {
                    error: 'Folder already exist'
                });
            }

            if (!fs.existsSync(cacheFolder)) fs.mkdirSync(cacheFolder);

            const startUnzip = (result: string) => {
                unzip(result, folderPath)
                    .then(() => {
                        wLogger.info(
                            `PP Counter downloaded: ${folderName} (${req.headers.referer})`
                        );
                        fs.unlinkSync(tempPath);

                        server.WS_COMMANDS.socket.emit(
                            'message',
                            'unzip',
                            'getOverlays',
                            `__ingame__`
                        );

                        sendJson(res, {
                            status: 'Finished',
                            path: result
                        });
                    })
                    .catch((reason) => {
                        fs.unlinkSync(tempPath);

                        wLogger.error(
                            '[overlay-unzip]',
                            folderName,
                            (reason as Error).message
                        );
                        wLogger.debug('[overlay-unzip]', folderName, reason);

                        sendJson(res, {
                            error: (reason as Error).message
                        });
                    });
            };

            downloadFile(req.params.url, tempPath)
                .then(startUnzip)
                .catch((reason) => {
                    wLogger.error(
                        '[overlay-download]',
                        folderName,
                        (reason as Error).message
                    );
                    wLogger.debug(`[overlay-download]`, folderName, reason);

                    sendJson(res, {
                        error: (reason as Error).message
                    });
                });
        }
    );

    server.app.route(
        /^\/api\/counters\/open\/(?<name>.*)/,
        'GET',
        (req, res) => {
            const folderName = req.params.name;
            if (!folderName) {
                return sendJson(res, {
                    error: 'no folder name'
                });
            }

            const staticPath = getStaticPath();
            let folderPath = path.join(staticPath, decodeURI(folderName));
            if (folderName === 'tosu.exe') folderPath = getProgramPath();
            else if (folderName === 'static.exe') folderPath = getStaticPath();

            if (!fs.existsSync(folderPath)) {
                return sendJson(res, {
                    error: "Folder doesn't exists"
                });
            }

            wLogger.info(
                `PP Counter opened: ${folderName} (${req.headers.referer})`
            );

            const platform = platformResolver(process.platform);
            exec(`${platform.command} "${folderPath}"`, (err) => {
                if (err) {
                    wLogger.error(
                        '/counters/open',
                        req.query.name,
                        'Error opening folder',
                        err.message
                    );
                    wLogger.debug(
                        '/counters/open',
                        req.query.name,
                        'Error opening folder',
                        err
                    );

                    return sendJson(res, {
                        error: `Error opening folder: ${err.message}`
                    });
                }

                return sendJson(res, {
                    status: 'opened'
                });
            });
        }
    );

    server.app.route(
        /^\/api\/counters\/delete\/(?<name>.*)/,
        'GET',
        (req, res) => {
            const folderName = req.params.name;
            if (!folderName) {
                return sendJson(res, {
                    error: 'no folder name'
                });
            }

            const staticPath = getStaticPath();
            const folderPath = path.join(staticPath, decodeURI(folderName));

            if (!fs.existsSync(folderPath)) {
                return sendJson(res, {
                    error: "Folder doesn't exists"
                });
            }

            wLogger.info(
                `PP Counter removed: ${folderName} (${req.headers.referer})`
            );

            fs.rmSync(folderPath, { recursive: true, force: true });

            server.WS_COMMANDS.socket.emit(
                'message',
                'remove',
                'getOverlays',
                `__ingame__`
            );

            return sendJson(res, {
                status: 'deleted'
            });
        }
    );

    server.app.route(
        /^\/api\/counters\/settings\/(?<name>.*)/,
        'GET',
        (req, res) => {
            const folderName = req.params.name;
            if (!folderName) {
                return sendJson(res, {
                    error: 'No folder name'
                });
            }

            const settings = parseCounterSettings(folderName, 'parse');
            if (settings instanceof Error) {
                wLogger.debug(`[overlay-settings]`, folderName, settings);

                return sendJson(res, {
                    error: settings.message
                });
            }

            wLogger.info(
                `Settings accessed: ${folderName} (${req.headers.referer})`
            );

            return sendJson(res, settings);
        }
    );

    server.app.route(
        /^\/api\/counters\/settings\/(?<name>.*)/,
        'POST',
        (req, res) => {
            const body: ISettings[] | Error = JsonSafeParse({
                isFile: false,
                payload: req.body,
                defaultValue: new Error('Failed to parse body')
            });
            if (body instanceof Error) throw body;

            const folderName = req.params.name;
            if (!folderName) {
                return sendJson(res, {
                    error: 'no folder name'
                });
            }

            if (req.query.update === 'yes') {
                const result = parseCounterSettings(
                    folderName,
                    'dev/save',
                    body as any
                );
                if (result instanceof Error) {
                    wLogger.debug(
                        `[overlay-settings]`,
                        'update',
                        folderName,
                        result
                    );

                    return sendJson(res, {
                        error: result.message
                    });
                }

                wLogger.info(
                    `Settings re:created: ${folderName} (${req.headers.referer})`
                );

                fs.writeFileSync(
                    result.settingsPath!,
                    JSON.stringify(result.settings),
                    'utf8'
                );

                return sendJson(res, { result: 'success' });
            }

            wLogger.info(
                `Settings saved: ${folderName} (${req.headers.referer})`
            );

            const html = saveSettings(folderName, body as any);
            if (html instanceof Error) {
                wLogger.debug(`[overlay-settings]`, 'save', folderName, html);

                return sendJson(res, {
                    error: html.message
                });
            }

            server.WS_COMMANDS.socket.emit(
                'message',
                'save settings',
                'getSettings',
                folderName
            );

            return sendJson(res, { result: 'success' });
        }
    );

    server.app.route('/api/runUpdates', 'GET', (req, res) =>
        autoUpdater('server', res)
    );

    server.app.route('/api/settingsSave', 'POST', async (req, res) => {
        const body: Record<ConfigBinding, string> | Error = JsonSafeParse({
            isFile: false,
            payload: req.body,
            defaultValue: new Error('Failed to parse body')
        });
        if (body instanceof Error) throw body;

        ConfigManager.refreshConfig(body, true);
        return sendJson(res, { status: 'updated' });
    });

    server.app.route('/api/calculate/pp', 'GET', (req, res) => {
        const query: any = req.query;

        const osuInstance: any = req.instanceManager.getInstance(
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

        let beatmap: NativeBeatmap | undefined;
        let destroyBeatmap = false;

        const exists = query.path ? fs.existsSync(query.path) : false;
        if (exists === true) {
            const beatmapFilePath = path.join(
                global.songsFolder,
                menu.folder,
                menu.filename
            );

            const beatmapContent = fs.readFileSync(beatmapFilePath, 'utf8');
            beatmap = NativeBeatmap.fromText(beatmapContent);
            destroyBeatmap = true;
        } else {
            beatmap = beatmapPP.getCurrentBeatmap();
        }

        if (!beatmap) {
            return sendJson(res, { error: 'beatmap_not_ready' });
        }

        // todo: beatmap conversion

        let nativeMods: ModsCollection | null = null;
        const nativeModsOwned: Mod[] = [];

        const rulesetId =
            query.mode !== undefined ? +query.mode : beatmap.native.rulesetId;
        const ruleset = Ruleset.fromId(rulesetId);
        try {
            const modsInput: string[] = [];
            if (query.mods !== undefined) {
                if (Array.isArray(query.mods)) {
                    modsInput.push(...query.mods.map((m: any) => String(m)));
                } else if (typeof query.mods === 'string') {
                    const parsed = Number(query.mods);
                    if (Number.isFinite(parsed)) {
                        // todo: numeric mod bitmasks not supported here
                    } else if (query.mods.includes(',')) {
                        modsInput.push(
                            ...query.mods
                                .split(',')
                                .map((m: string) => m.trim())
                                .filter(Boolean)
                        );
                    } else {
                        modsInput.push(...(query.mods.match(/.{1,2}/g) || []));
                    }
                }
            }

            if (modsInput.length > 0) {
                nativeMods = ModsCollection.create();

                for (const acronym of modsInput) {
                    let mod: Mod;
                    try {
                        mod = Mod.create(acronym.toUpperCase());
                    } catch {
                        continue;
                    }

                    nativeModsOwned.push(mod);
                    nativeMods.add(mod);
                }
            }

            const difficultyCalc =
                DifficultyCalculatorFactory.create<OsuDifficultyCalculator>(
                    ruleset,
                    beatmap
                );
            const performanceCalc =
                PerformanceCalculatorFactory.create<OsuPerformanceCalculator>(
                    ruleset
                );

            try {
                const difficulty = nativeMods
                    ? difficultyCalc.calculateWithMods(nativeMods)
                    : difficultyCalc.calculate();

                // todo: ar/cs/hp/od/clockRate/passedObjects

                const perf = performanceCalc.calculate(
                    {
                        ruleset,
                        beatmap,
                        mods: nativeMods,
                        maxCombo: query.combo !== undefined ? +query.combo : 0,
                        accuracy:
                            query.acc !== undefined ? +query.acc / 100 : 0,
                        countMiss:
                            query.nMisses !== undefined ? +query.nMisses : 0,
                        countOk: query.n100 !== undefined ? +query.n100 : 0,
                        countGreat: query.n300 !== undefined ? +query.n300 : 0,
                        countMeh: query.n50 !== undefined ? +query.n50 : 0,
                        countPerfect:
                            query.nGeki !== undefined ? +query.nGeki : 0,
                        countGood: query.nKatu !== undefined ? +query.nKatu : 0
                    },
                    difficulty
                );

                sendJson(res, {
                    pp: perf.total,
                    ...perf,
                    difficulty: {
                        starRating: difficulty.starRating,
                        maxCombo: difficulty.maxCombo
                    }
                });
            } finally {
                performanceCalc.destroy();
                difficultyCalc.destroy();
            }
        } finally {
            nativeMods?.destroy();
            for (const mod of nativeModsOwned) {
                mod.destroy();
            }

            ruleset.destroy();
            if (destroyBeatmap) beatmap.destroy();
        }
    });

    server.app.route('/api/generateReport', 'GET', async (req, res) => {
        try {
            const report = await generateReport(req.instanceManager);
            const html = await generateReportHTML(report);

            res.writeHead(200, {
                'Content-Type': 'text/html; charset=utf-8',
                'Content-Disposition': `attachment; filename="${encodeURIComponent(`tosu-report-${report.date.getTime()}.html`)}"`
            });
            res.end(html, 'utf-8');
        } catch (err) {
            res.writeHead(500, {
                'Content-Type': 'text/plain; charset=utf-8'
            });
            res.end(
                `Server Error: ${(err as Error).message || 'Unknown error'}`
            );
        }
    });

    server.app.route(/\/api\/ingame/, 'GET', (req, res) => {
        fs.readFile(
            path.join(pkgAssetsPath, 'ingame.html'),
            'utf8',
            (err, content) => {
                if (err) {
                    wLogger.debug('/ingame', err);
                    res.writeHead(500);
                    return res.end(`Server Error: ${err.code}`);
                }

                const counters = getLocalCounters();
                content += `\n\n\n<script>\rwindow.COUNTERS = ${JSON.stringify(counters)}\r</script>\n`;

                res.writeHead(200, {
                    'Content-Type': 'text/html; charset=utf-8'
                });
                res.end(content, 'utf-8');
            }
        );
    });

    server.app.route('/favicon.ico', 'GET', (req, res) => {
        fs.readFile(path.join(pkgAssetsPath, 'favicon.ico'), (err, content) => {
            if (err) {
                wLogger.debug(`/${'favicon.ico'}`, err);
                res.writeHead(404, { 'Content-Type': 'text/html' });

                res.end('<html>page not found</html>');
                return;
            }

            res.writeHead(200, {
                'Content-Type': 'image/vnd.microsoft.icon; charset=utf-8'
            });

            res.end(content);
        });
    });

    server.app.route(/.*/, 'GET', async (req, res) => {
        const url = req.pathname || '/';
        try {
            if (url.startsWith(`/.well-know`)) {
                res.statusCode = 404;
                res.statusMessage = 'Not Found';
                return res.end();
            }

            if (url === '/') {
                const parseAddress = new URL(
                    req.headers.host
                        ? `http://${req.headers.host}/`
                        : req.headers.referer ||
                              `http://${req.socket.remoteAddress}/`
                );

                return buildLocalCounters(res, parseAddress.hostname);
            }

            if (url === '/settings') {
                if (req.query.overlay) return buildEmptyPage(res);
                return buildSettings(res);
            }
            if (url === '/local-overlays') return buildInstructionLocal(res);
            if (url === '/available') {
                const parseAddress = new URL(
                    req.headers.host
                        ? `http://${req.headers.host}/`
                        : req.headers.referer ||
                              `http://${req.socket.remoteAddress}/`
                );
                return buildExternalCounters(res, parseAddress.hostname);
            }

            const staticPath = getStaticPath();

            const extension = path.extname(url);

            // ignore empty and one letter extension (extension returned with .)
            if (extension.length < 3 && !url.endsWith('/')) {
                res.writeHead(301, { Location: url + '/' });
                return res.end();
            }

            const selectIndexHTML = url.endsWith('/')
                ? url + 'index.html'
                : url;
            directoryWalker({
                _htmlRedirect: true,
                res,
                baseUrl: url,
                pathname: selectIndexHTML,
                folderPath: staticPath
            });
        } catch (error) {
            wLogger.warn(`[server] ${url}`, (error as Error).message);
            wLogger.debug(`[server] ${url}`, error);

            res.writeHead(404);
            return res.end((error as Error).message || '');
        }
    });
}
