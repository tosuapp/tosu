import type { WebSocket } from '@tosu/server';
import { HttpServer, getContentType, sendJson } from '@tosu/server';
import fs from 'fs';
import path from 'path';

import { readSongsFolder } from '../handlers/songs';

export const ApiV2 = ({
    app,
    webSocket,
    keysWebsocket
}: {
    app: HttpServer;
    webSocket: WebSocket.Server;
    keysWebsocket: WebSocket.Server;
}) => {
    app.server.on('upgrade', function (request, socket, head) {
        if (request.url == '/websocket/v2') {
            webSocket.handleUpgrade(request, socket, head, function (ws) {
                webSocket.emit('connection', ws, request);
            });
        }

        if (request.url == '/websocket/v2/keys') {
            keysWebsocket.handleUpgrade(request, socket, head, function (ws) {
                keysWebsocket.emit('connection', ws, request);
            });
        }
    });

    // todo
    app.route('/json/v2', 'GET', (req, res) => {
        const osuInstances: any = Object.values(
            req.instanceManager.osuInstances || {}
        );
        if (osuInstances.length < 1) {
            res.statusCode = 500;
            return res.end('nothing');
        }

        const json = osuInstances[0].getStateV2(req.instanceManager);
        sendJson(res, json);
    });

    app.route(/\/files\/beatmap\/(?<filePath>.*)/, 'GET', readSongsFolder);

    app.route(/\/files\/skin\/(?<filePath>.*)/, 'GET', (req, res) => {
        const osuInstances: any = Object.values(
            req.instanceManager.osuInstances || {}
        );
        if (osuInstances.length < 1) {
            res.statusCode = 500;
            return res.end('nothing');
        }

        const { settings } = osuInstances[0].entities.getServices(['settings']);
        if (
            (settings.gameFolder === '' && settings.skinFolder === '') ||
            (settings.gameFolder == null && settings.skinFolder == null)
        ) {
            res.statusCode = 500;
            return sendJson(res, { error: 'not_ready' });
        }

        const cleanedUrl = decodeURI(req.params.filePath);
        const contentType = getContentType(cleanedUrl);

        const filePath = path.join(
            settings.gameFolder,
            'Skins',
            settings.skinFolder,
            cleanedUrl
        );
        return fs.readFile(filePath, (err, content) => {
            if (err) {
                if (err.code === 'ENOENT') {
                    res.writeHead(404, { 'Content-Type': 'text/html' });
                    res.end('404 Not Found');
                    return;
                }

                res.writeHead(500);
                res.end(`Server Error: ${err.code}`);
                return;
            }

            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        });
    });
};
