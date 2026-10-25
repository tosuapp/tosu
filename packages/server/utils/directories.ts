import { getStaticPath, wLogger } from '@tosu/common';
import fs from 'fs';
import http from 'http';
import type { OutgoingHttpHeaders } from 'http2';
import path from 'path';

import { type ExtendedIncomingMessage, getContentType } from '../index';
import { OVERLAYS_STATIC } from './homepage';
import { createOverlayToken } from './socket';

const allowedRangeExtensions = [
    '.mp3',
    '.wav',
    '.ogg',
    '.gif',
    '.webm',
    '.mp4',
    '.avi',
    '.webp'
];

function isPathDirectory(path: string) {
    const stat = fs.statSync(path);
    return Boolean(stat && stat.isDirectory());
}

export function directoryWalker({
    _htmlRedirect,
    req,
    res,
    baseUrl,
    folderPath,
    pathname
}: {
    _htmlRedirect?: boolean;

    req: ExtendedIncomingMessage;
    res: http.ServerResponse;
    baseUrl: string;

    pathname: string;
    folderPath: string;
}) {
    let cleanedUrl;
    try {
        cleanedUrl = decodeURIComponent(pathname);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
        res.writeHead(404, {
            'Content-Type': getContentType('file.txt')
        });
        res.end('');
        return;
    }

    const contentType = getContentType(cleanedUrl);
    const filePath = path.join(folderPath, cleanedUrl);

    const isDirectory = isPathDirectory(filePath);
    const isHTML = filePath.endsWith('.html');

    if (isDirectory) {
        if (!baseUrl.endsWith('/')) {
            res.writeHead(301, {
                Location: baseUrl + '/'
            });
            res.end();
            return;
        }

        return readDirectory(filePath, baseUrl, (html: Error | string) => {
            if (html instanceof Error) {
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end('404 Not Found');
                return;
            }

            res.writeHead(200, {
                'Content-Type': getContentType('file.html')
            });
            res.end(html);
        });
    }

    const fileSize = fs.statSync(filePath).size;

    return fs.readFile(
        filePath,
        isHTML === true ? 'utf8' : null,
        (err, content) => {
            if (err?.code === 'ENOENT' && _htmlRedirect === true) {
                return readDirectory(
                    filePath.replace('index.html', ''),
                    baseUrl,
                    (html: Error | string) => {
                        if (html instanceof Error) {
                            res.writeHead(404, { 'Content-Type': 'text/html' });
                            res.end('404 Not Found');
                            return;
                        }

                        if (isHTML === true) {
                            html = injectOverlayRuntime(html);
                        }

                        res.writeHead(200, {
                            'Content-Type': getContentType('file.html')
                        });
                        res.end(html);
                    }
                );
            }

            if (err?.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end('404 Not Found');
                return;
            }

            if (err) {
                res.writeHead(500);
                res.end(`Server Error: ${err.code}`);
                return;
            }

            if (isHTML === true) {
                content = injectOverlayRuntime(content.toString());
            }

            if (req.headers.range) {
                const range = req.headers.range
                    .replace('bytes=', '')
                    .split('-');
                const start = parseInt(range[0]);
                const end = range[1] ? parseInt(range[1]) : fileSize - 1;

                if (start >= fileSize || end >= fileSize) {
                    res.writeHead(416, {
                        'Content-Range': `bytes */${fileSize}`
                    });
                    return res.end();
                }

                res.writeHead(206, {
                    'Accept-Ranges': 'bytes',
                    'Content-Type': contentType,
                    'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                    'Content-Length': end - start + 1
                });

                fs.createReadStream(filePath, { start, end }).pipe(res);
                return;
            }

            const headOptions: OutgoingHttpHeaders = {
                'Content-Type': contentType
            };
            if (allowedRangeExtensions.includes(path.extname(pathname))) {
                headOptions['Accept-Ranges'] = 'bytes';
                headOptions['Content-Length'] = fs.statSync(filePath).size;
            }
            res.writeHead(200, headOptions);
            res.end(content, 'utf-8');
        }
    );
}

export function readDirectory(
    folderPath: string,
    url: string,
    callback: Function
) {
    fs.readdir(folderPath, (err, folders) => {
        if (err) {
            return callback(new Error(`Files not found: ${folderPath}`));
        }

        const html = folders.map((r) => {
            const slashAtTheEnd = getContentType(r) === '' ? '/' : '';

            return `<li><a href="${url === '/' ? '' : url}${encodeURIComponent(r)}${slashAtTheEnd}">${r}</a></li>`;
        });

        return callback(
            OVERLAYS_STATIC.replace('{OVERLAYS_LIST}', html.join('\n')).replace(
                '{PAGE_URL}',
                `tosu - ${url}`
            )
        );
    });
}

export interface HttpContext {
    req: ExtendedIncomingMessage;
    res: http.ServerResponse;
}

export interface ServeStaticOptions {
    ctx: HttpContext;
    root: string;
    pathname: string;
    isOverlay?: boolean;
}

async function resolveStaticPath({
    root,
    pathname
}: Pick<ServeStaticOptions, 'root' | 'pathname'>): Promise<{
    targetPath: string;
    stats: fs.Stats;
    needsRedirect?: boolean;
} | null> {
    let cleanedUrl: string;
    try {
        cleanedUrl = decodeURIComponent(pathname);
    } catch (error) {
        wLogger.debug(
            `Failed to decode URL pathname %${pathname}%:`,
            (error as Error).message
        );
        return null;
    }

    const resolvedFolder = path.resolve(root);
    let targetPath = path.resolve(
        resolvedFolder,
        cleanedUrl.replace(/^[/\\]+/, '')
    );

    if (!targetPath.startsWith(resolvedFolder)) {
        wLogger.warn(`Blocked potential path traversal request: %${pathname}%`);
        return null;
    }

    try {
        let stats = await fs.promises.stat(targetPath);

        if (stats.isDirectory()) {
            if (!pathname.endsWith('/')) {
                return { targetPath, stats, needsRedirect: true };
            }
            targetPath = path.join(targetPath, 'index.html');
            stats = await fs.promises.stat(targetPath);
        }

        return { targetPath, stats };
    } catch (err: any) {
        if (err?.code !== 'ENOENT') {
            wLogger.debug(
                `Failed to stat path %${targetPath}%:`,
                (err as Error).message
            );
        }
        return null;
    }
}

interface StreamByteRangeOptions {
    ctx: HttpContext;
    targetPath: string;
    fileSize: number;
    contentType: string;
}

function streamByteRange({
    ctx,
    targetPath,
    fileSize,
    contentType
}: StreamByteRangeOptions) {
    const { req, res } = ctx;
    const range = (req.headers.range || '').replace('bytes=', '').split('-');
    const start = parseInt(range[0], 10);
    const end = range[1] ? parseInt(range[1], 10) : fileSize - 1;

    if (start >= fileSize || end >= fileSize) {
        res.writeHead(416, { 'Content-Range': `bytes */${fileSize}` });
        return res.end();
    }

    res.writeHead(206, {
        'Accept-Ranges': 'bytes',
        'Content-Type': contentType,
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Content-Length': end - start + 1
    });

    return fs.createReadStream(targetPath, { start, end }).pipe(res);
}

export async function serveStaticFile(options: ServeStaticOptions) {
    const { ctx, root, pathname, isOverlay = true } = options;
    const { req, res } = ctx;

    const resolved = await resolveStaticPath({ root, pathname });
    if (!resolved) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        return res.end('404 Not Found');
    }

    const { targetPath, stats, needsRedirect } = resolved;

    if (needsRedirect) {
        res.writeHead(301, { Location: req.pathname + '/' });
        return res.end();
    }

    const contentType = getContentType(targetPath);

    if (isOverlay && targetPath.endsWith('.html')) {
        try {
            const rawContent = await fs.promises.readFile(targetPath, 'utf8');
            const relativeDir = path
                .relative(getStaticPath(), path.dirname(targetPath))
                .replace(/\\/g, '/');

            const token = createOverlayToken(relativeDir);

            res.writeHead(200, {
                'Content-Type': contentType
            });
            return res.end(injectOverlayRuntime(rawContent, token));
        } catch {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            return res.end('Server Error');
        }
    }

    if (req.headers.range) {
        return streamByteRange({
            ctx,
            targetPath,
            fileSize: stats.size,
            contentType
        });
    }

    const headOptions: OutgoingHttpHeaders = { 'Content-Type': contentType };
    if (allowedRangeExtensions.includes(path.extname(targetPath))) {
        headOptions['Accept-Ranges'] = 'bytes';
        headOptions['Content-Length'] = stats.size;
    }

    res.writeHead(200, headOptions);
    return fs.createReadStream(targetPath).pipe(res);
}

export function injectOverlayRuntime(html: string, token?: string): string {
    try {
        const tokenScript = token ? `window.TOSU_TOKEN = "${token}";` : '';
        const injection = `
        <!-- Force transparent background for a nicer view in the dashboard. -->
        <style>
            html, body {
                background: transparent !important;
            }
        </style>
        <!-- Inject token for WebSocket authentication; Silence iframe logging. -->
        <script>
            ${tokenScript}
            if (window.top !== window.self) {
                const noop = () => {};
                console.log = console.info = console.warn = console.debug = noop;
            }
        </script>`.trim();

        if (/<head[^>]*>/i.test(html)) {
            return html.replace(
                /<head[^>]*>/i,
                (match) => `${match}\n${injection}`
            );
        }

        return `${injection}\n${html}`;
    } catch (error) {
        wLogger.error(
            'Failed to inject overlay runtime:',
            (error as Error).message
        );
        wLogger.debug('Overlay runtime injection error details:', error);

        return html;
    }
}
