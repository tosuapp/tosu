import { wLogger } from '@tosu/common';

import { Server, WebSocketChannel, isRequestAllowed } from '../index';

export default function buildSocket(server: Server) {
    const routeMap: Record<string, WebSocketChannel | undefined> = {
        '/ws': server.sockets.v1,
        '/tokens': server.sockets.sc,
        '/websocket/v2': server.sockets.v2,
        '/websocket/v2/precise': server.sockets.v2Precise,
        '/websocket/commands': server.sockets.commands
    };

    server.app.server.on('upgrade', (request, socket, head) => {
        const allowed = isRequestAllowed(request);
        if (!allowed) {
            wLogger.warn(
                'Blocked external WebSocket request to %' + request.url + '%',
                {
                    address: request.socket.remoteAddress,
                    origin: request.headers.origin,
                    referer: request.headers.referer
                }
            );

            socket.write('HTTP/1.1 403 Not Found\r\n\r\n');
            socket.destroy();
            return;
        }

        try {
            const hostname = request.headers.host;
            const parsedURL = new URL(`http://${hostname}${request.url}`);
            (request as any).query = {};

            parsedURL.searchParams.forEach(
                (value, key) => ((request as any).query[key] = value)
            );

            const targetSocket = routeMap[parsedURL.pathname];
            if (targetSocket) {
                targetSocket.server.handleUpgrade(
                    request,
                    socket,
                    head,
                    (ws) => {
                        targetSocket.server.emit('connection', ws, request);
                    }
                );
            }
        } catch (exc) {
            wLogger.error(
                `WebSocket upgrade failed for %${request.url}%:`,
                (exc as any).message
            );
            wLogger.debug(`WebSocket upgrade error details:`, exc);
        }
    });
}
