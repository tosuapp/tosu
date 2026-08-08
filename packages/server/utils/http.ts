import { config, platformResolver, wLogger } from '@tosu/common';
import { exec } from 'child_process';
import http, { type IncomingMessage, type ServerResponse } from 'node:http';
import type { InstanceManager } from 'tosu/instances/manager';

export interface ExtendedIncomingMessage extends IncomingMessage {
    body?: string;
    pathname?: string;
    query: Record<string, string>;
    params: Record<string, string>;
    instanceManager: InstanceManager;
}

interface HttpContext {
    req: ExtendedIncomingMessage;
    res: ServerResponse;
}

export type RequestHandler = (
    req: HttpContext['req'],
    res: HttpContext['res'],
    next: (err?: unknown) => void
) => void | Promise<void>;

export type RouteHandler = (
    req: HttpContext['req'],
    res: HttpContext['res']
) => unknown | Promise<unknown>;

type HTTPMethod = (typeof http.METHODS)[number];

interface CompiledRoute {
    method: string;
    pattern: RegExp;
    keys: string[];
    handler: RouteHandler;
    originalPath: string | RegExp;
}

function pathToRegex(path: string | RegExp): {
    pattern: RegExp;
    keys: string[];
} {
    const keys: string[] = [];
    if (path instanceof RegExp) {
        return { pattern: path, keys };
    }

    if (path === '*') {
        return { pattern: /^.*$/, keys };
    }

    const sanitized = path.replace(/\/+/g, '/').replace(/\/$/, '');
    if (!sanitized) {
        return { pattern: /^\/?$/, keys };
    }

    const regexPath = sanitized
        .replace(/([.+?^=${}()|[\]\\])/g, '\\$1')
        .replace(/:([a-zA-Z0-9_]+)/g, (_, key) => {
            keys.push(key);
            return '([^/]+)';
        })
        .replace(/\*/g, '(.*)');

    return {
        pattern: new RegExp(`^${regexPath}/?$`, 'i'),
        keys
    };
}

export class HttpServer {
    public readonly server: http.Server;
    private middlewares: RequestHandler[] = [];
    private routes: CompiledRoute[] = [];

    constructor() {
        this.server = http.createServer((req, res) => {
            this.handleRequest(req as ExtendedIncomingMessage, res);
        });

        this.server.on('error', (err) => {
            if (err.message.includes('getaddrinfo')) {
                wLogger.warn(
                    'Server failed to start: Incorrect IP address or URL'
                );
                return;
            }

            wLogger.error('Server experienced an error:', err.message);
            wLogger.debug('Server error details:', err);
        });
    }

    public use(middleware: RequestHandler) {
        this.middlewares.push(middleware);
    }

    public get(path: string | RegExp, handler: RouteHandler) {
        this.route(path, 'GET', handler);
    }

    public post(path: string | RegExp, handler: RouteHandler) {
        this.route(path, 'POST', handler);
    }

    public put(path: string | RegExp, handler: RouteHandler) {
        this.route(path, 'PUT', handler);
    }

    public delete(path: string | RegExp, handler: RouteHandler) {
        this.route(path, 'DELETE', handler);
    }

    public route(
        path: string | RegExp,
        method: HTTPMethod | string,
        handler: RouteHandler
    ) {
        const m = method.toUpperCase();
        let pattern: RegExp;
        let keys: string[] = [];

        if (path instanceof RegExp) {
            pattern = path;
        } else {
            const compiled = pathToRegex(path);
            pattern = compiled.pattern;
            keys = compiled.keys;
        }

        const exists = this.routes.some(
            (r) => r.method === m && r.originalPath === path
        );
        if (!exists) {
            this.routes.push({
                method: m,
                pattern,
                keys,
                handler,
                originalPath: path
            });
        }
    }

    private handleRequest(req: ExtendedIncomingMessage, res: ServerResponse) {
        const startTime = performance.now();

        res.on('finish', () => {
            const elapsedTime = (performance.now() - startTime).toFixed(2);
            wLogger.time(
                `Request processed in %${elapsedTime}ms%`,
                req.method,
                res.statusCode,
                res.getHeader('content-type'),
                decodeURIComponent(req.url || '')
            );
        });

        let index = 0;
        const next = (err?: unknown) => {
            if (err) {
                wLogger.error(
                    'Middleware execution error:',
                    (err as Error).message
                );
                res.statusCode = 500;
                res.end('Internal Server Error');
                return;
            }

            if (index < this.middlewares.length) {
                const middleware = this.middlewares[index++];
                try {
                    middleware(req, res, next);
                } catch (exc) {
                    next(exc);
                }
                return;
            }

            const method = (req.method || 'GET').toUpperCase();
            if (['POST', 'PUT', 'PATCH'].includes(method)) {
                let body = '';
                const maxBodyLength = 10 * 1024 * 1024; // 10MB limit

                req.on('data', (chunk) => {
                    body += chunk;
                    if (body.length > maxBodyLength) {
                        res.statusCode = 413;
                        res.end('Payload Too Large');
                        req.destroy();
                    }
                });

                req.on('error', (err) => {
                    wLogger.error('Request body stream error:', err.message);
                    if (!res.headersSent) {
                        res.statusCode = 400;
                        res.end('Bad Request');
                    }
                });

                req.on('end', () => {
                    if (res.writableEnded) return;
                    req.body = body;
                    this.dispatchRoute(req, res);
                });
            } else {
                req.body = '';
                this.dispatchRoute(req, res);
            }
        };

        next();
    }

    private dispatchRoute(req: ExtendedIncomingMessage, res: ServerResponse) {
        const method = (req.method || 'GET').toUpperCase();
        const hostHeader = req.headers.host || 'localhost';

        let parsedURL: URL;
        try {
            parsedURL = new URL(req.url || '/', `http://${hostHeader}`);
        } catch {
            res.statusCode = 400;
            res.end('Bad Request');
            return;
        }

        req.pathname = parsedURL.pathname;
        req.query = {};
        req.params = {};

        parsedURL.searchParams.forEach((value, key) => {
            req.query![key] = value;
        });

        for (let i = 0; i < this.routes.length; i++) {
            const route = this.routes[i];
            if (route.method !== method) continue;

            const match = route.pattern.exec(parsedURL.pathname);
            if (!match) continue;

            if (route.keys.length > 0) {
                for (let k = 0; k < route.keys.length; k++) {
                    req.params[route.keys[k]] = decodeURIComponent(
                        match[k + 1] || ''
                    );
                }
            } else if (match.groups) {
                Object.assign(req.params, match.groups);
            }

            try {
                return route.handler(req, res);
            } catch (exc) {
                const message =
                    typeof exc === 'string' ? exc : (exc as Error).message;

                res.statusCode = 500;
                wLogger.warn(
                    `Request to %${parsedURL.pathname}% failed:`,
                    message
                );
                wLogger.debug(
                    `Route handling error for %${parsedURL.pathname}%:`,
                    exc
                );

                res.end('Internal Server Error');
                return;
            }
        }

        res.statusCode = 404;
        res.end('Not Found');
    }

    public listen(port: number, hostname: string) {
        this.server.listen(port, hostname, () => {
            const ip = hostname === '0.0.0.0' ? 'localhost' : hostname;
            wLogger.info(`Dashboard server started on %http://${ip}:${port}%`);

            if (config.openDashboardOnStartup === true) {
                const platform = platformResolver(process.platform);
                exec(
                    `${platform.command} http://${ip}:${port}`,
                    (error, _stdout, stderr) => {
                        if (error || stderr) {
                            return;
                        }

                        wLogger.info(`Web dashboard opened successfully`);
                    }
                );
            }
        });
    }
}
