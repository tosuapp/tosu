import type { WebSocket } from '@tosu/server';
import { HttpServer } from '@tosu/server';

import { readSongsFolder } from '../handlers/songs';

export const legacyApi = ({
    app,
    webSocket
}: {
    app: HttpServer;
    webSocket: WebSocket.Server;
}) => {
    app.server.on('upgrade', function (request, socket, head) {
        if (request.url == '/ws') {
            webSocket.handleUpgrade(request, socket, head, function (ws) {
                webSocket.emit('connection', ws, request);
            });
        }
    });

    app.route(/\/Songs\/(?<filePath>.*)/, 'GET', readSongsFolder);
};
