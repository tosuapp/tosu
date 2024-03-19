import path from 'path';

import { HttpServer, Websocket, sendJson } from '../index';
import { directoryWalker } from '../utils/directories';

export default function buildV2Api({
    app,
    websocket,
    preciseWebsocket
}: {
    app: HttpServer;
    websocket: Websocket;
    preciseWebsocket: Websocket;
}) {
    app.server.on('upgrade', function (request, socket, head) {
        if (request.url === '/websocket/v2') {
            websocket.socket.handleUpgrade(
                request,
                socket,
                head,
                function (ws) {
                    websocket.socket.emit('connection', ws, request);
                }
            );
        }

        if (request.url === '/websocket/v2/precise') {
            preciseWebsocket.socket.handleUpgrade(
                request,
                socket,
                head,
                function (ws) {
                    preciseWebsocket.socket.emit('connection', ws, request);
                }
            );
        }
    });

    app.route('/json/v2', 'GET', (req, res) => {
        const osuInstance: any = req.instanceManager.getInstance();
        if (!osuInstance) {
            res.statusCode = 500;
            return sendJson(res, { error: 'not_ready' });
        }

        const json = osuInstance.getStateV2(req.instanceManager);
        sendJson(res, json);
    });

    app.route('/json/v2/precise', 'GET', (req, res) => {
        const osuInstance: any = req.instanceManager.getInstance();
        if (!osuInstance) {
            res.statusCode = 500;
            return sendJson(res, { error: 'not_ready' });
        }

        const json = osuInstance.getPreciseData();
        sendJson(res, json);
    });

    app.route(/^\/files\/beatmap\/(?<filePath>.*)/, 'GET', (req, res) => {
        const url = req.pathname || '/';

        const osuInstance: any = req.instanceManager.getInstance();
        if (!osuInstance) {
            res.statusCode = 500;
            return sendJson(res, { error: 'not_ready' });
        }

        const { settings } = osuInstance.entities.getServices(['settings']);
        if (settings.songsFolder === '') {
            res.statusCode = 500;
            return sendJson(res, { error: 'not_ready' });
        }

        directoryWalker({
            res,
            baseUrl: url,
            pathname: req.params.filePath,
            folderPath: settings.songsFolder
        });
    });

    app.route(/^\/files\/skin\/(?<filePath>.*)/, 'GET', (req, res) => {
        const url = req.pathname || '/';

        const osuInstance: any = req.instanceManager.getInstance();
        if (!osuInstance) {
            res.statusCode = 500;
            return sendJson(res, { error: 'not_ready' });
        }

        const { settings } = osuInstance.entities.getServices(['settings']);
        if (
            (settings.gameFolder === '' && settings.skinFolder === '') ||
            (settings.gameFolder == null && settings.skinFolder == null)
        ) {
            res.statusCode = 500;
            return sendJson(res, { error: 'not_ready' });
        }

        const folder = path.join(
            settings.gameFolder,
            'Skins',
            settings.skinFolder
        );
        directoryWalker({
            res,
            baseUrl: url,
            pathname: req.params.filePath,
            folderPath: folder
        });
    });
}
