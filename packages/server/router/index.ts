import { Beatmap, Calculator } from '@kotrikd/rosu-pp';
import {
    config,
    downloadFile,
    unzip,
    wLogger,
    writeConfig
} from '@tosu/common';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';

import { HttpServer, getContentType, sendJson } from '../index';
import {
    buildExternalCounters,
    buildInstructionLocal,
    buildLocalCounters,
    buildSettings
} from '../utils/counters';
import { directoryWalker } from '../utils/directories';

const pkgAssetsPath =
    'pkg' in process
        ? path.join(__dirname, 'assets')
        : path.join(__filename, '../../../assets');

const pkgRunningFolder =
    'pkg' in process ? path.dirname(process.execPath) : process.cwd();

export default function buildBaseApi(app: HttpServer) {
    app.route('/json', 'GET', (req, res) => {
        const osuInstances: any = Object.values(
            req.instanceManager.osuInstances || {}
        );
        if (osuInstances.length < 1) {
            res.statusCode = 500;
            return sendJson(res, { error: 'not_ready' });
        }

        const json = osuInstances[0].getState(req.instanceManager);
        sendJson(res, json);
    });

    app.route(/^\/api\/counters\/search\/(?<query>.*)/, 'GET', (req, res) => {
        try {
            const query = decodeURI(req.params.query)
                .replace(/[^a-z0-9A-Z]/, '')
                .toLowerCase();

            if (req.query?.tab == '1') {
                return buildExternalCounters(res, query);
            }

            return buildLocalCounters(res, query);
        } catch (error) {
            wLogger.error((error as any).message);

            return sendJson(res, {
                error: (error as any).message
            });
        }
    });

    app.route(/^\/api\/counters\/download\/(?<url>.*)/, 'GET', (req, res) => {
        const folderName = req.query.name;
        if (!folderName) {
            return sendJson(res, {
                error: 'no folder name'
            });
        }

        const cacheFolder = path.join(pkgRunningFolder, '.cache');
        const staticPath =
            config.staticFolderPath || path.join(pkgRunningFolder, 'static');
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
                        wLogger.info(`PP Counter downloaded: ${folderName}`);
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

            sendJson(res, {
                error: (error as any).message
            });
        }
    });

    app.route(/^\/api\/counters\/open\/(?<name>.*)/, 'GET', (req, res) => {
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
                    error: `Folder doesn't exists`
                });
            }

            // ADDED MULTI PLATFORM SUPPORT
            // mac exec(`open "${path}"`, (err, stdout, stderr) => {
            // linux exec(`xdg-open "${path}"`, (err, stdout, stderr) => {

            wLogger.info(`PP Counter opened: ${folderName}`);

            exec(`start "" "${folderPath}"`, (err, stdout, stderr) => {
                if (err) {
                    wLogger.error('Error opening file explorer:', err);
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
    });

    app.route(/^\/api\/counters\/delete\/(?<name>.*)/, 'GET', (req, res) => {
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
                    error: `Folder doesn't exists`
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
    });

    app.route('/api/settingsSave', 'POST', (req, res) => {
        const body = req.body;
        // try {
        //     body = JSON.parse(req.body);
        // } catch (error) {
        //     return sendJson(res, {
        //         error: (error as any).message,
        //     });
        // };

        if (body == '') {
            return sendJson(res, {
                error: 'No settings'
            });
        }

        writeConfig(body);

        sendJson(res, {
            status: 'updated'
        });
    });

    app.route(/^\/images\/(?<filePath>.*)/, 'GET', (req, res) => {
        fs.readFile(
            path.join(pkgAssetsPath, 'images', req.params.filePath),
            (err, content) => {
                res.writeHead(200, {
                    'Content-Type': getContentType(req.params.filePath)
                });

                res.end(content);
            }
        );
    });

    app.route('/homepage.min.css', 'GET', (req, res) => {
        // FIXME: REMOVE THAT SHIT
        fs.readFile(
            path.join(pkgAssetsPath, 'homepage.min.css'),
            'utf8',
            (err, content) => {
                res.writeHead(200, {
                    'Content-Type': getContentType('homepage.min.css')
                });
                res.end(content);
            }
        );
    });

    app.route('/homepage.js', 'GET', (req, res) => {
        fs.readFile(
            path.join(pkgAssetsPath, 'homepage.js'),
            'utf8',
            (err, content) => {
                res.writeHead(200, {
                    'Content-Type': getContentType('homepage.js')
                });
                res.end(content);
            }
        );
    });

    app.route('/api/calculate/pp', 'GET', (req, res) => {
        try {
            const query: any = req.query;

            const osuInstances: any = Object.values(
                req.instanceManager.osuInstances || {}
            );
            if (osuInstances.length < 1) {
                res.statusCode = 500;
                return sendJson(res, { error: 'not_ready' });
            }

            const { settings, menuData } = osuInstances[0].entities.getServices(
                ['settings', 'menuData']
            );

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

                if (key in calculator && isFinite(+value))
                    calculator[key](+value);
            }

            return sendJson(res, {
                attributes: calculator.mapAttributes(parseBeatmap),
                performance: calculator.performance(parseBeatmap)
            });
        } catch (error) {
            wLogger.error(error);

            return sendJson(res, {
                error: (error as any).message
            });
        }
    });

    app.route(/.*/, 'GET', (req, res) => {
        try {
            const url = req.pathname || '/';
            const folderPath =
                config.staticFolderPath ||
                path.join(pkgRunningFolder, 'static');

            if (url == '/') {
                if (req.query?.tab == '1') {
                    return buildExternalCounters(res);
                }

                if (req.query?.tab == '2') {
                    return buildSettings(res);
                }

                if (req.query?.tab == '3') {
                    return buildInstructionLocal(res);
                }

                return buildLocalCounters(res);
            }

            const extension = path.extname(url);
            if (extension == '' && !url.endsWith('/')) {
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
            return sendJson(res, {
                error: (error as any).message
            });
        }
    });
}
