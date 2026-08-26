import { wLogger } from '@tosu/common';

import { getUniqueID } from '../utils/hashing';
import type { HttpServer } from '../utils/http';
import type { WsData, WsEndpoint } from '../utils/socket';

const WS_PATHS: Record<string, WsEndpoint> = {
    '/ws': 'v1',
    '/tokens': 'sc',
    '/websocket/v2': 'v2',
    '/websocket/v2/precise': 'v2precise',
    '/websocket/commands': 'commands'
};

export default function buildSocket(app: HttpServer) {
    app.onUpgrade((request, url, server) => {
        const endpoint = WS_PATHS[url.pathname];
        if (!endpoint) return false;

        try {
            const query: Record<string, string> = {};
            url.searchParams.forEach((value, key) => (query[key] = value));

            const remote = server.requestIP(request);
            const data: WsData = {
                endpoint,
                id: getUniqueID(),
                pathname: url.pathname + url.search,
                query,
                filters: [],
                hostAddress: request.headers.get('host') || '',
                localAddress: `${server.hostname}:${server.port}`,
                originAddress: request.headers.get('origin') || '',
                remoteAddress: remote ? `${remote.address}:${remote.port}` : ''
            };

            return server.upgrade(request, { data });
        } catch (exc) {
            wLogger.error(
                `WebSocket upgrade failed for %${url.pathname}%:`,
                (exc as any).message
            );
            wLogger.debug(`WebSocket upgrade error details:`, exc);

            return false;
        }
    });
}
