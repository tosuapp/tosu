import { wLogger } from '@tosu/common';

import { HttpServer, Websocket, sendJson } from '../index';
import { directoryWalker } from '../utils/directories';

export default function buildV1Api({
    app,
    websocket
}: {
    app: HttpServer;
    websocket: Websocket;
}) {
    app.server.on('upgrade', function (request, socket, head) {
        if (request.url === '/ws') {
            websocket.socket.handleUpgrade(
                request,
                socket,
                head,
                function (ws) {
                    websocket.socket.emit('connection', ws, request);
                }
            );
        }
    });

    app.route(/^\/Songs\/(?<filePath>.*)/, 'GET', (req, res) => {
        try {
            const url = req.pathname || '/';

            const osuInstance: any = req.instanceManager.getInstance();
            if (!osuInstance) {
                res.statusCode = 500;
                return sendJson(res, { error: 'not_ready' });
            }

            const { allTimesData } = osuInstance.entities.getServices([
                'allTimesData'
            ]);
            if (allTimesData.SongsFolder === '') {
                res.statusCode = 500;
                return sendJson(res, { error: 'not_ready' });
            }

            directoryWalker({
                res,
                baseUrl: url,
                pathname: req.params.filePath,
                folderPath: allTimesData.SongsFolder
            });
        } catch (error) {
            wLogger.error((error as any).message);
            wLogger.debug(error);

            return sendJson(res, {
                error: (error as any).message
            });
        }
    });
}
