import { config, platformResolver, wLogger } from '@tosu/common';
import type { Server as BunServer, WebSocketHandler } from 'bun';
import { exec } from 'node:child_process';
import type { InstanceManager } from 'tosu/instances/manager';

import { isRequestAllowed, json } from './index';
import type { WsData } from './ws-types';

export type HttpMethod =
    | 'GET'
    | 'POST'
    | 'HEAD'
    | 'PUT'
    | 'DELETE'
    | 'CONNECT'
    | 'OPTIONS'
    | 'TRACE'
    | 'PATCH';

export interface TosuRequest {
    raw: Request;
    method: HttpMethod;
    url: URL;
    pathname: string;
    query: Record<string, string>;
    params: Record<string, string>;
    headers: Headers;
    body: string;
    remoteAddress: string;
    instanceManager: InstanceManager;
}

export type RouteHandler = (req: TosuRequest) => Response | Promise<Response>;

/** Returns true when the request was upgraded to a WebSocket. */
export type UpgradeHandler = (
    request: Request,
    url: URL,
    server: BunServer<WsData>
) => boolean;

interface RegexRoute {
    path: RegExp;
    method: HttpMethod;
    handler: RouteHandler;
}

const CORS_HEADERS: Record<string, string> = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers':
        'Origin, X-Requested-With, Content-Type, Accept',
    'Access-Control-Allow-Methods': 'POST, GET, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Private-Network': 'true'
};

const BODY_METHODS: HttpMethod[] = ['POST', 'PUT', 'PATCH'];

/**
 * Note: Bun.serve() does not transmit a custom Response.statusText over the
 * wire -- a real fetch() client always observes the standard HTTP reason
 * phrase for the status code (e.g. "Internal Server Error" for 500),
 * regardless of what is set here (verified against Bun 1.4.0). The value is
 * still produced correctly in-process, so it's what error-handling code
 * should rely on rather than a client-observed statusText.
 */
export function errorStatusText(exc: unknown, pathname: string): string {
    const message = typeof exc === 'string' ? exc : (exc as Error).message;

    return (exc as NodeJS.ErrnoException)?.code === 'ENOENT'
        ? encodeURI(`${pathname} ENOENT: no such file or directory`)
        : encodeURI(message);
}

export class HttpServer {
    server: BunServer<WsData> | null = null;

    private instanceManager: InstanceManager;
    private websocket: WebSocketHandler<WsData>;
    private staticRoutes = new Map<
        string,
        Partial<Record<HttpMethod, RouteHandler>>
    >();

    private regexRoutes: RegexRoute[] = [];
    private upgradeHandler: UpgradeHandler | null = null;

    constructor({
        instanceManager,
        websocket
    }: {
        instanceManager: InstanceManager;
        websocket: WebSocketHandler<WsData>;
    }) {
        this.instanceManager = instanceManager;
        this.websocket = websocket;
    }

    route(path: string | RegExp, method: HttpMethod, handler: RouteHandler) {
        if (typeof path === 'string') {
            const methods = this.staticRoutes.get(path) ?? {};
            if (!methods[method]) methods[method] = handler;
            this.staticRoutes.set(path, methods);
            return;
        }

        const exists = this.regexRoutes.some(
            (route) =>
                route.method === method && route.path.source === path.source
        );
        if (!exists) this.regexRoutes.push({ path, method, handler });
    }

    onUpgrade(handler: UpgradeHandler) {
        this.upgradeHandler = handler;
    }

    listen(port: number, hostname: string) {
        try {
            this.server = Bun.serve({
                port,
                hostname,
                idleTimeout: 30,
                websocket: this.websocket,
                fetch: (request, server) => this.handleRequest(request, server),
                error: (error) => {
                    wLogger.error(
                        'Server experienced an error:',
                        error.message
                    );
                    wLogger.debug('Server error details:', error);

                    return json({ error: error.message }, 500);
                }
            });
        } catch (exc) {
            const message = (exc as Error).message;
            if (
                message.includes('getaddrinfo') ||
                message.includes('EADDRNOTAVAIL')
            ) {
                wLogger.warn(
                    'Server failed to start: Incorrect IP address or URL'
                );
                return;
            }

            wLogger.error('Server experienced an error:', message);
            wLogger.debug('Server error details:', exc);
            return;
        }

        const ip = hostname === '0.0.0.0' ? 'localhost' : hostname;
        const boundPort = this.server.port;
        wLogger.info(`Dashboard server started on %http://${ip}:${boundPort}%`);

        if (config.openDashboardOnStartup === true) {
            const platform = platformResolver(process.platform);
            exec(
                `${platform.command} http://${ip}:${boundPort}`,
                { windowsHide: true },
                (error, stdout, stderr) => {
                    if (error || stderr) {
                        return;
                    }

                    wLogger.info(`Web dashboard opened successfully`);
                }
            );
        }
    }

    async stop() {
        if (!this.server) return;

        await this.server.stop(true);
        this.server = null;
    }

    private async handleRequest(
        request: Request,
        server: BunServer<WsData>
    ): Promise<Response | undefined> {
        const startTime = performance.now();
        const url = new URL(request.url);
        const method = request.method as HttpMethod;

        const respond = (response: Response) => {
            // Fast path: mutate the response's own headers in place so Bun's
            // Bun.file() sendfile optimization on the response body stays
            // intact. The catch below is defence-in-depth for a Response
            // variant (e.g. Response.redirect(), or a response passed
            // through from fetch) whose headers are guarded immutable and
            // throw a TypeError from `Headers.set` -- verified against Bun
            // 1.4.0, this guard is not currently enforced there, so the
            // in-place path above is always the one taken. Keep the fallback
            // for a future/different Bun version that does enforce it.
            let headers: Headers;
            try {
                for (const [key, value] of Object.entries(CORS_HEADERS)) {
                    response.headers.set(key, value);
                }
                headers = response.headers;
            } catch (exc) {
                if (!(exc instanceof TypeError)) throw exc;

                headers = new Headers(response.headers);
                for (const [key, value] of Object.entries(CORS_HEADERS)) {
                    headers.set(key, value);
                }

                response = new Response(response.body, {
                    status: response.status,
                    statusText: response.statusText,
                    headers
                });
            }

            const elapsedTime = (performance.now() - startTime).toFixed(2);
            wLogger.time(
                `Request processed in %${elapsedTime}ms%`,
                method,
                response.status,
                headers.get('content-type'),
                decodeURIComponent(url.pathname + url.search)
            );

            return response;
        };

        if (!isRequestAllowed(request.headers)) {
            wLogger.warn(
                `Blocked unauthorized request to %${url.pathname}${url.search}%`,
                {
                    origin: request.headers.get('origin'),
                    referer: request.headers.get('referer')
                }
            );

            return respond(new Response('Not Found', { status: 403 }));
        }

        if (request.headers.get('upgrade')?.toLowerCase() === 'websocket') {
            // Bun requires `undefined` after a successful upgrade.
            if (this.upgradeHandler?.(request, url, server)) return undefined;
            return respond(new Response('Not Found', { status: 404 }));
        }

        const query: Record<string, string> = {};
        url.searchParams.forEach((value, key) => (query[key] = value));

        const req: TosuRequest = {
            raw: request,
            method,
            url,
            pathname: url.pathname,
            query,
            params: {},
            headers: request.headers,
            body: BODY_METHODS.includes(method) ? await request.text() : '',
            remoteAddress: server.requestIP(request)?.address ?? '',
            instanceManager: this.instanceManager
        };

        const handler = this.match(url.pathname, method, req.params);
        if (!handler)
            return respond(new Response('Not Found', { status: 404 }));

        try {
            return respond(await handler(req));
        } catch (exc) {
            const message =
                typeof exc === 'string' ? exc : (exc as Error).message;
            const statusText = errorStatusText(exc, url.pathname);

            wLogger.warn(`Request to %${url.pathname}% failed:`, message);
            wLogger.debug(`Route handling error for %${url.pathname}%:`, exc);

            return respond(json({ error: message }, 500, statusText));
        }
    }

    private match(
        pathname: string,
        method: HttpMethod,
        params: Record<string, string>
    ): RouteHandler | undefined {
        const exact = this.staticRoutes.get(pathname)?.[method];
        if (exact) return exact;

        for (const route of this.regexRoutes) {
            if (route.method !== method) continue;

            const result = route.path.exec(pathname);
            if (!result) continue;

            for (const [key, value] of Object.entries(result.groups ?? {})) {
                if (value != null) params[key] = value;
            }

            return route.handler;
        }

        return undefined;
    }
}
