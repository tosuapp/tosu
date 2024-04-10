import { Beatmap, Calculator } from '@kotrikd/rosu-pp';
import {
    config,
    downloadFile,
    unzip,
    wLogger,
    writeConfig
} from '@tosu/common';
import { autoUpdater } from '@tosu/updater';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';

import { Server, getContentType, sendJson } from '../index';
import {
    buildExternalCounters,
    buildInstructionLocal,
    buildLocalCounters,
    buildSettings,
    parseSettings,
    saveSettings
} from '../utils/counters';
import { directoryWalker } from '../utils/directories';

const pkgAssetsPath =
    'pkg' in process
        ? path.join(__dirname, 'assets')
        : path.join(__filename, '../../../assets');

const pkgRunningFolder =
    'pkg' in process ? path.dirname(process.execPath) : process.cwd();

export default function buildBaseApi(server: Server) {
    server.app.route('/json', 'GET', (req, res) => {
        const osuInstance: any = req.instanceManager.getInstance();
        if (!osuInstance) {
            res.statusCode = 500;
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

            const cacheFolder = path.join(pkgRunningFolder, '.cache');
            const staticPath =
                config.staticFolderPath ||
                path.join(pkgRunningFolder, 'static');
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
                                `PP Counter downloaded: ${folderName}`
                            );
                            fs.unlinkSync(tempPath);

                            sendJson(res, {
                                status: 'Finished',
                                path: result
                            });
                        })
                        .catch((reason) => {
                            fs.unlinkSync(tempPath);

                            sendJson(res, {
                                error: reason
                            });
                        });
                };

                downloadFile(req.params.url, tempPath)
                    .then(startUnzip)
                    .catch((reason) => {
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

                const staticPath =
                    config.staticFolderPath ||
                    path.join(pkgRunningFolder, 'static');
                const folderPath = path.join(staticPath, decodeURI(folderName));

                if (!fs.existsSync(folderPath)) {
                    return sendJson(res, {
                        error: "Folder doesn't exists"
                    });
                }

                // ADDED MULTI PLATFORM SUPPORT
                // mac exec(`open "${path}"`, (err, stdout, stderr) => {
                // linux exec(`xdg-open "${path}"`, (err, stdout, stderr) => {

                wLogger.info(`PP Counter opened: ${folderName}`);

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

                const staticPath =
                    config.staticFolderPath ||
                    path.join(pkgRunningFolder, 'static');
                const folderPath = path.join(staticPath, decodeURI(folderName));

                if (!fs.existsSync(folderPath)) {
                    return sendJson(res, {
                        error: "Folder doesn't exists"
                    });
                }

                wLogger.info(`PP Counter removed: ${folderName}`);

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

                const staticPath =
                    config.staticFolderPath ||
                    path.join(pkgRunningFolder, 'static');
                const settingsPath = path.join(
                    staticPath,
                    decodeURI(folderName),
                    'settings.json'
                );
                const settingsValuesPath = path.join(
                    staticPath,
                    decodeURI(folderName),
                    'settings.values.json'
                );

                if (!fs.existsSync(settingsPath)) {
                    return sendJson(res, {
                        error: 'No settings.json'
                    });
                }

                wLogger.info(`Settings accessed: ${folderName}`);

                const html = parseSettings(
                    settingsPath,
                    settingsValuesPath,
                    folderName
                );
                if (html instanceof Error) {
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
            let body: object;
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

                const staticPath =
                    config.staticFolderPath ||
                    path.join(pkgRunningFolder, 'static');
                const settingsPath = path.join(
                    staticPath,
                    decodeURI(folderName),
                    'settings.json'
                );
                const settingsValuesPath = path.join(
                    staticPath,
                    decodeURI(folderName),
                    'settings.values.json'
                );

                if (!fs.existsSync(settingsPath)) {
                    return sendJson(res, {
                        error: "Folder doesn't exists"
                    });
                }

                wLogger.info(`Settings saved: ${folderName}`);

                const html = saveSettings(
                    settingsPath,
                    settingsValuesPath,
                    body as any
                );
                if (html instanceof Error) {
                    return sendJson(res, {
                        error: html
                    });
                }

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
        } catch (error) {
            return sendJson(res, {
                error: (error as any).message
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

    server.app.route(/^\/images\/(?<filePath>.*)/, 'GET', (req, res) => {
        fs.readFile(
            path.join(pkgAssetsPath, 'images', req.params.filePath),
            (err, content) => {
                if (err) {
                    wLogger.debug(err);
                    res.writeHead(404, {
                        'Content-Type': 'text/html'
                    });

                    res.end('<html>page not found</html>');
                    return;
                }

                res.writeHead(200, {
                    'Content-Type': getContentType(req.params.filePath)
                });

                res.end(content);
            }
        );
    });

    server.app.route('/homepage.min.css', 'GET', (req, res) => {
        fs.readFile(
            path.join(pkgAssetsPath, 'homepage.min.css'),
            'utf8',
            (err, content) => {
                if (err) {
                    wLogger.debug(err);
                    res.writeHead(404, {
                        'Content-Type': 'text/html'
                    });

                    res.end('<html>page not found</html>');
                    return;
                }

                res.writeHead(200, {
                    'Content-Type': getContentType('homepage.min.css')
                });
                res.end(content);
            }
        );
    });

    server.app.route('/homepage.js', 'GET', (req, res) => {
        fs.readFile(
            path.join(pkgAssetsPath, 'homepage.js'),
            'utf8',
            (err, content) => {
                if (err) {
                    wLogger.debug(err);
                    res.writeHead(404, {
                        'Content-Type': 'text/html'
                    });

                    res.end('<html>page not found</html>');
                    return;
                }

                res.writeHead(200, {
                    'Content-Type': getContentType('homepage.js')
                });
                res.end(content);
            }
        );
    });

    server.app.route('/api/calculate/pp', 'GET', (req, res) => {
        try {
            const query: any = req.query;

            const osuInstance: any = req.instanceManager.getInstance();
            if (!osuInstance) {
                res.statusCode = 500;
                return sendJson(res, { error: 'not_ready' });
            }

            const { settings, menuData } = osuInstance.entities.getServices([
                'settings',
                'menuData'
            ]);

            const beatmapFilePath =
                query.path ||
                path.join(
                    settings.gameFolder,
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
        } catch (error) {
            return sendJson(res, {
                error: (error as any).message
            });
        }
    });

    server.app.route(/.*/, 'GET', (req, res) => {
        try {
            const url = req.pathname || '/';
            const folderPath =
                config.staticFolderPath ||
                path.join(pkgRunningFolder, 'static');

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
                folderPath
            });
        } catch (error) {
            wLogger.debug(error);

            return sendJson(res, {
                error: (error as any).message
            });
        }
    });
}
