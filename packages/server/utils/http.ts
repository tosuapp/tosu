import { config, wLogger } from '@tosu/common';
import { exec } from 'child_process';
import http, { IncomingMessage, ServerResponse } from 'http';

import { sendJson } from './index';

export interface ExtendedIncomingMessage extends IncomingMessage {
    instanceManager: any;
    body: string;
    query: { [key: string]: string };
    params: { [key: string]: string };
    pathname: string;
    getContentType: (text: string) => string;
    sendJson: (
        response: http.ServerResponse,
        json: object | any[]
    ) => http.ServerResponse<http.IncomingMessage>;
}

type RequestHandler = (
    req: ExtendedIncomingMessage,
    res: http.ServerResponse,
    next: () => void
) => void;

type RouteHandler = {
    (req: ExtendedIncomingMessage, res: ServerResponse): void;
};

export class HttpServer {
    private middlewares: RequestHandler[] = [];
    server: http.Server;
    private routes: {
        [method: string]: {
            path: string | RegExp;
            handler: RouteHandler;
        }[];
    } = {};

    constructor() {
        // @ts-ignore
        this.server = http.createServer(this.handleRequest.bind(this));

        this.server.on('error', (err) => {
            if (err.message.includes('getaddrinfo')) {
                wLogger.warn('server', 'Incorrect server ip or url');
                return;
            }

            wLogger.error('[server]', err.message);
            wLogger.debug('[server]', err);
        });
    }

    use(middleware: RequestHandler) {
        this.middlewares.push(middleware);
    }

    route(
        path: string | RegExp,
        method:
            | 'GET'
            | 'POST'
            | 'HEAD'
            | 'PUT'
            | 'DELETE'
            | 'CONNECT'
            | 'OPTIONS'
            | 'TRACE'
            | 'PATCH',
        handler: RouteHandler
    ) {
        if (this.routes[method] == null) this.routes[method] = [];

        const find = this.routes[method].find((r) => r.path === path);
        if (!find) this.routes[method].push({ path, handler });
    }

    private handleRequest(
        req: ExtendedIncomingMessage,
        res: http.ServerResponse
    ) {
        const startTime = performance.now();
        let body = '';

        res.on('finish', () => {
            const elapsedTime = (performance.now() - startTime).toFixed(2);
            wLogger.debug(
                `[request]`,
                `${elapsedTime}ms`,
                req.method,
                res.statusCode,
                res.getHeader('content-type'),
                req.url
            );
        });

        const next = (index: number) => {
            if (index < this.middlewares.length) {
                const savedIndex = index;
                const middleware = this.middlewares[index++];

                try {
                    middleware(req, res, () => {
                        next(savedIndex + 1);
                    });
                } catch (exc) {
                    wLogger.error(
                        '[server]',
                        'middleware',
                        (exc as Error).message
                    );
                    wLogger.debug('[server]', 'middleware', exc);
                }
                return;
            }

            // get data aka body
            if (['POST', 'PUT', 'PATCH'].includes(req.method || '')) {
                req.on('data', (chunk) => {
                    body += chunk;
                });

                req.on('end', () => {
                    req.body = body;

                    this.handleNext(req, res);
                });
                return;
            }
            this.handleNext(req, res);
        };

        next(0);
    }

    private handleNext(req: ExtendedIncomingMessage, res: http.ServerResponse) {
        const method = req.method || 'GET';
        const hostname = req.headers.host; // Hostname

        const parsedURL = new URL(`http://${hostname}${req.url}`);

        // parse query parameters
        req.query = {};
        req.params = {};
        req.pathname = parsedURL.pathname;

        parsedURL.searchParams.forEach(
            (value, key) => (req.query[key] = value)
        );

        const routes = this.routes[method] || [];
        for (let i = 0; i < routes.length; i++) {
            const route = routes[i];
            let routeExists = false;

            if (
                route.path instanceof RegExp &&
                route.path.test(parsedURL.pathname)
            ) {
                routeExists = true;

                // turn groups to route params
                const array = Object.keys(
                    route.path.exec(parsedURL.pathname)?.groups || {}
                );
                for (let g = 0; g < array.length; g++) {
                    const key = array[g];
                    const value = route.path.exec(parsedURL.pathname)?.groups?.[
                        key
                    ];

                    if (key == null || value == null) continue;
                    req.params[key] = value;
                }
            } else if (typeof route.path === 'string') {
                routeExists = route.path === parsedURL.pathname;
            }

            if (!routeExists) continue;
            try {
                return route.handler(req, res);
            } catch (exc) {
                const message =
                    typeof exc === 'string' ? exc : (exc as Error).message;

                if ((exc as NodeJS.ErrnoException).code === 'ENOENT')
                    res.statusMessage = encodeURI(
                        `${parsedURL.pathname} ENOENT: no such file or directory`
                    );
                else res.statusMessage = encodeURI(message);

                res.statusCode = 500;

                wLogger.warn(`[server] ${parsedURL.pathname}`, message);
                wLogger.debug(`[server] ${parsedURL.pathname}`, exc);

                return sendJson(res, { error: message });
            }
        }

        res.statusCode = 404;
        res.end('Not Found');
    }

    listen(port: number, hostname: string) {
        this.server.listen(port, hostname, () => {
            const ip = hostname === '0.0.0.0' ? 'localhost' : hostname;
            wLogger.info(
                '[server]',
                `Dashboard started on http://${ip}:${port}`
            );

            if (config.openDashboardOnStartup === true) {
                const command =
                    process.platform === 'win32'
                        ? 'start'
                        : process.platform === 'darwin'
                          ? 'open'
                          : 'xdg-open';

                exec(
                    `${command} http://${ip}:${port}`,
                    (error, stdout, stderr) => {
                        if (error || stderr) {
                            return;
                        }

                        wLogger.info(`Web dashboard opened`);
                    }
                );
            }
        });
    }
}
