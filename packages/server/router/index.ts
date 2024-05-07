import { Beatmap, Calculator } from '@kotrikd/rosu-pp';
import {
    downloadFile,
    getCachePath,
    getStaticPath,
    unzip,
    wLogger,
    writeConfig
} from '@tosu/common';
import { autoUpdater } from '@tosu/updater';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';

import { Server, sendJson } from '../index';
import {
    buildExternalCounters,
    buildInstructionLocal,
    buildLocalCounters,
    buildSettings,
    parseSettings,
    saveSettings
} from '../utils/counters';
import { ISettings } from '../utils/counters.types';
import { directoryWalker } from '../utils/directories';
import { parseCounterSettings } from '../utils/parseSettings';

export default function buildBaseApi(server: Server) {
    server.app.route('/json', 'GET', (req, res) => {
        const osuInstance: any = req.instanceManager.getInstance();
        if (!osuInstance) {
            res.statusCode = 500;
            wLogger.debug('/json', 'not_ready');
            return sendJson(res, { error: 'not_ready' });
        }

        const json = osuInstance.getState(req.instanceManager);
        sendJson(res, json);
    });

    server.app.route(
        /^\/api\/counters\/search\/(?<query>.*)/,
        'GET',
        (req, res) => {
            try {
                const query = decodeURI(req.params.query)
                    .replace(/[^a-z0-9A-Z]/, '')
                    .toLowerCase();

                if (req.query?.tab === '1') {
                    return buildExternalCounters(res, query);
                }

                return buildLocalCounters(res, query);
            } catch (error) {
                wLogger.error((error as any).message);
                wLogger.debug(error);

                return sendJson(res, {
                    error: (error as any).message
                });
            }
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

            if (fs.existsSync(folderPath)) {
                return sendJson(res, {
                    error: 'Folder already exist'
                });
            }

            if (!fs.existsSync(cacheFolder)) fs.mkdirSync(cacheFolder);

            try {
                const startUnzip = (result) => {
                    unzip(result, folderPath)
                        .then(() => {
                            wLogger.info(
                                `PP Counter downloaded: ${folderName} (${req.headers.referer})`
                            );
                            fs.unlinkSync(tempPath);

                            sendJson(res, {
                                status: 'Finished',
                                path: result
                            });
                        })
                        .catch((reason) => {
                            fs.unlinkSync(tempPath);
                            wLogger.debug(
                                `counter-${folderName}-unzip`,
                                reason
                            );

                            sendJson(res, {
                                error: reason
                            });
                        });
                };

                downloadFile(req.params.url, tempPath)
                    .then(startUnzip)
                    .catch((reason) => {
                        wLogger.debug(`counter-${folderName}-download`, reason);

                        sendJson(res, {
                            error: reason
                        });
                    });
            } catch (error) {
                wLogger.error((error as any).message);
                wLogger.debug(error);

                sendJson(res, {
                    error: (error as any).message
                });
            }
        }
    );

    server.app.route(
        /^\/api\/counters\/open\/(?<name>.*)/,
        'GET',
        (req, res) => {
            try {
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

                // ADDED MULTI PLATFORM SUPPORT
                // mac exec(`open "${path}"`, (err, stdout, stderr) => {
                // linux exec(`xdg-open "${path}"`, (err, stdout, stderr) => {

                wLogger.info(
                    `PP Counter opened: ${folderName} (${req.headers.referer})`
                );

                exec(`start "" "${folderPath}"`, (err) => {
                    if (err) {
                        wLogger.error('Error opening file explorer:');
                        wLogger.debug(err);

                        return sendJson(res, {
                            error: `Error opening file explorer: ${err.message}`
                        });
                    }

                    return sendJson(res, {
                        status: 'opened'
                    });
                });
            } catch (error) {
                return sendJson(res, {
                    error: (error as any).message
                });
            }
        }
    );

    server.app.route(
        /^\/api\/counters\/delete\/(?<name>.*)/,
        'GET',
        (req, res) => {
            try {
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
                return sendJson(res, {
                    status: 'deleted'
                });
            } catch (error) {
                return sendJson(res, {
                    error: (error as any).message
                });
            }
        }
    );

    server.app.route(
        /^\/api\/counters\/settings\/(?<name>.*)/,
        'GET',
        (req, res) => {
            try {
                const folderName = req.params.name;
                if (!folderName) {
                    return sendJson(res, {
                        error: 'No folder name'
                    });
                }

                const settings = parseCounterSettings(folderName, 'parse');
                if (settings instanceof Error) {
                    wLogger.debug(
                        `counter-${folderName}-settings-get`,
                        settings
                    );

                    return sendJson(res, {
                        error: settings.name
                    });
                }

                wLogger.info(
                    `Settings accessed: ${folderName} (${req.headers.referer})`
                );

                const html = parseSettings(settings.settings, folderName);
                if (html instanceof Error) {
                    wLogger.debug(`counter-${folderName}-settings-html`, html);

                    return sendJson(res, {
                        error: html
                    });
                }

                return sendJson(res, { result: html });
            } catch (error) {
                return sendJson(res, {
                    error: (error as any).message
                });
            }
        }
    );

    server.app.route(
        /^\/api\/counters\/settings\/(?<name>.*)/,
        'POST',
        (req, res) => {
            let body: ISettings[];
            try {
                body = JSON.parse(req.body);
            } catch (error) {
                return sendJson(res, {
                    error: (error as any).message
                });
            }

            try {
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

                    if (!(result instanceof Error)) {
                        wLogger.info(
                            `Settings re:created: ${folderName} (${req.headers.referer})`
                        );

                        fs.writeFileSync(
                            result.settingsPath,
                            JSON.stringify(result.settings),
                            'utf8'
                        );
                    }
                }

                wLogger.info(
                    `Settings saved: ${folderName} (${req.headers.referer})`
                );

                const html = saveSettings(folderName, body as any);
                if (html instanceof Error) {
                    wLogger.debug(`counter-${folderName}-settings-save`, html);

                    return sendJson(res, {
                        error: html.name
                    });
                }

                server.WS_COMMANDS.socket.emit(
                    'message',
                    `getSettings:${folderName}`
                );

                return sendJson(res, { result: 'success' });
            } catch (error) {
                return sendJson(res, {
                    error: (error as any).message
                });
            }
        }
    );

    server.app.route('/api/runUpdates', 'GET', async (req, res) => {
        try {
            await autoUpdater();

            sendJson(res, { result: 'updated' });
        } catch (exc) {
            wLogger.error('runUpdates', (exc as any).message);
            wLogger.debug('runUpdates', exc);

            return sendJson(res, {
                error: (exc as any).message
            });
        }
    });

    server.app.route('/api/settingsSave', 'POST', (req, res) => {
        let body: object;
        try {
            body = JSON.parse(req.body);
        } catch (error) {
            return sendJson(res, {
                error: (error as any).message
            });
        }

        writeConfig(server, body);

        sendJson(res, {
            status: 'updated'
        });
    });

    server.app.route('/api/calculate/pp', 'GET', (req, res) => {
        try {
            const query: any = req.query;

            const osuInstance: any = req.instanceManager.getInstance();
            if (!osuInstance) {
                res.statusCode = 500;
                return sendJson(res, { error: 'not_ready' });
            }

            const { allTimesData, menuData } = osuInstance.getServices([
                'allTimesData',
                'menuData'
            ]);

            const beatmapFilePath =
                query.path ||
                path.join(
                    allTimesData.GameFolder,
                    'Songs',
                    menuData.Folder,
                    menuData.Path
                );

            const parseBeatmap = new Beatmap({ path: beatmapFilePath });
            const calculator = new Calculator();

            const array = Object.keys(query || {});
            for (let i = 0; i < array.length; i++) {
                const key = array[i];
                const value = query[key];

                if (key in calculator && isFinite(+value)) {
                    calculator[key](+value);
                }
            }

            return sendJson(res, {
                attributes: calculator.mapAttributes(parseBeatmap),
                performance: calculator.performance(parseBeatmap)
            });
        } catch (exc) {
            wLogger.error('calculate/pp', (exc as any).message);
            wLogger.debug('calculate/pp', exc);

            return sendJson(res, {
                error: (exc as any).message
            });
        }
    });

    server.app.route(/.*/, 'GET', (req, res) => {
        try {
            const url = req.pathname || '/';
            const staticPath = getStaticPath();

            if (url === '/') {
                if (req.query?.tab === '1') {
                    return buildExternalCounters(res);
                }

                if (req.query?.tab === '2') {
                    return buildSettings(res);
                }

                if (req.query?.tab === '3') {
                    return buildInstructionLocal(res);
                }

                return buildLocalCounters(res);
            }

            const extension = path.extname(url);
            if (extension === '' && !url.endsWith('/')) {
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
            wLogger.debug(error);

            return sendJson(res, {
                error: (error as any).message
            });
        }
    });
}
