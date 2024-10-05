import { wLogger } from '@tosu/common';

import { HttpServer, Websocket, isRequestAllowed } from '../index';

export default function buildSocket({
    app,

    WS_V1,
    WS_V2,
    WS_V2_PRECISE,
    WS_COMMANDS
}: {
    app: HttpServer;
    WS_V1: Websocket;
    WS_V2: Websocket;
    WS_V2_PRECISE: Websocket;
    WS_COMMANDS: Websocket;
}) {
    app.server.on('upgrade', function (request, socket, head) {
        const allowed = isRequestAllowed(request);
        if (!allowed) {
            wLogger.warn('External WebSocket request detected', request.url, {
                address: request.socket.remoteAddress,
                origin: request.headers.origin,
                referer: request.headers.referer
            });

            socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
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

            if (parsedURL.pathname === '/ws') {
                WS_V1.socket.handleUpgrade(
                    request,
                    socket,
                    head,
                    function (ws) {
                        WS_V1.socket.emit('connection', ws, request);
                    }
                );
            }

            if (parsedURL.pathname === '/websocket/v2') {
                WS_V2.socket.handleUpgrade(
                    request,
                    socket,
                    head,
                    function (ws) {
                        WS_V2.socket.emit('connection', ws, request);
                    }
                );
            }

            if (parsedURL.pathname === '/websocket/v2/precise') {
                WS_V2_PRECISE.socket.handleUpgrade(
                    request,
                    socket,
                    head,
                    function (ws) {
                        WS_V2_PRECISE.socket.emit('connection', ws, request);
                    }
                );
            }

            if (parsedURL.pathname === '/websocket/commands') {
                WS_COMMANDS.socket.handleUpgrade(
                    request,
                    socket,
                    head,
                    function (ws) {
                        WS_COMMANDS.socket.emit('connection', ws, request);
                    }
                );
            }
        } catch (exc) {
            wLogger.error(
                `websocket connection (${request.url}) >>>`,
                (exc as any).message
            );
            wLogger.debug(exc);
        }
    });
}
