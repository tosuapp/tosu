/**
 * @deprecated Legacy /api/counters endpoints.
 * These endpoints are preserved for backward compatibility and will be removed in a future major release.
 * Please migrate to /api/overlays endpoints instead.
 */
import {
    JsonSafeParse,
    downloadFile,
    getCachePath,
    getProgramPath,
    getStaticPath,
    platformResolver,
    unzip,
    wLogger
} from '@tosu/common';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';

import { Server, sendJson } from '../index';
import {
    buildExternalCounters,
    buildLocalCounters,
    saveSettings
} from '../utils/counters';
import { type ISettings } from '../utils/counters.types';
import type { ExtendedIncomingMessage } from '../utils/http';
import { parseCounterSettings } from '../utils/parseSettings';

function logDeprecation(req: ExtendedIncomingMessage, endpoint: string) {
    const caller =
        req.headers.referer ||
        req.headers.origin ||
        req.headers['user-agent'] ||
        req.socket.remoteAddress ||
        'unknown';

    wLogger.warn(
        `Deprecated endpoint %${endpoint}% called by %${caller}%. Please migrate to /api/overlays.`
    );
}

export default function buildLegacyCountersApi(server: Server) {
    server.app.route(
        /^\/api\/counters\/search\/(?<query>.*)/,
        'GET',
        (req, res) => {
            logDeprecation(req, 'GET /api/counters/search');

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
            logDeprecation(req, 'GET /api/counters/download');

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
                            `PP Counter %${folderName}% downloaded successfully (%${req.headers.referer}%)`
                        );
                        fs.unlinkSync(tempPath);

                        server.sockets.commands?.dispatchCommand(
                            '',
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
                            `Failed to unzip counter %${folderName}%:`,
                            (reason as Error).message
                        );
                        wLogger.debug('Counter unzip error details:', reason);

                        sendJson(res, {
                            error: (reason as Error).message
                        });
                    });
            };

            downloadFile(req.params.url, tempPath)
                .then(startUnzip)
                .catch((reason) => {
                    wLogger.error(
                        `Failed to download counter %${folderName}%:`,
                        (reason as Error).message
                    );
                    wLogger.debug(`Counter download error details:`, reason);

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
            logDeprecation(req, 'GET /api/counters/open');

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
                `Opening PP Counter folder: %${folderName}% (%${req.headers.referer}%)`
            );

            const platform = platformResolver(process.platform);
            exec(`${platform.command} "${folderPath}"`, (err) => {
                if (err) {
                    wLogger.error(
                        `Failed to open folder %${folderName}%:`,
                        err.message
                    );
                    wLogger.debug('Folder open error details:', err);

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
            logDeprecation(req, 'GET /api/counters/delete');

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
                `PP Counter removed: %${folderName}% (%${req.headers.referer}%)`
            );

            fs.rmSync(folderPath, { recursive: true, force: true });

            server.sockets.commands?.dispatchCommand(
                '',
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
            logDeprecation(req, 'GET /api/counters/settings');

            const folderName = req.params.name;
            if (!folderName) {
                return sendJson(res, {
                    error: 'No folder name'
                });
            }

            const settings = parseCounterSettings(folderName, 'parse');
            if (settings instanceof Error) {
                wLogger.debug(
                    `Failed to parse settings for %${folderName}%:`,
                    settings
                );

                return sendJson(res, {
                    error: settings.message
                });
            }

            wLogger.info(
                `Settings accessed for %${folderName}% (%${req.headers.referer}%)`
            );

            return sendJson(res, settings);
        }
    );

    server.app.route(
        /^\/api\/counters\/settings\/(?<name>.*)/,
        'POST',
        (req, res) => {
            logDeprecation(req, 'POST /api/counters/settings');

            const body: ISettings[] | Error = JsonSafeParse({
                isFile: false,
                payload: req.body || '',
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
                        `Failed to update settings for %${folderName}%:`,
                        result
                    );

                    return sendJson(res, {
                        error: result.message
                    });
                }

                wLogger.info(
                    `Settings re-created for %${folderName}% (%${req.headers.referer}%)`
                );

                fs.writeFileSync(
                    result.settingsPath!,
                    JSON.stringify(result.settings),
                    'utf8'
                );

                return sendJson(res, { result: 'success' });
            }

            wLogger.info(
                `Settings saved for %${folderName}% (%${req.headers.referer}%)`
            );

            const html = saveSettings(folderName, body as any);
            if (html instanceof Error) {
                wLogger.debug(
                    `Failed to save settings for %${folderName}%:`,
                    html
                );

                return sendJson(res, {
                    error: html.message
                });
            }

            server.sockets.commands?.dispatchCommand(
                '',
                'save settings',
                'getSettings',
                folderName
            );

            return sendJson(res, { result: 'success' });
        }
    );
}
