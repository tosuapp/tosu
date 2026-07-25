import { getStaticPath, wLogger } from '@tosu/common';
import fs from 'fs';
import http from 'http';
import type { OutgoingHttpHeaders } from 'http2';
import path from 'path';

import { type ExtendedIncomingMessage, getContentType } from '../index';
import { OVERLAYS_STATIC } from './homepage';

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
                            html = injectOverlayRuntime(html, filePath);
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
                content = injectOverlayRuntime(content.toString(), filePath);
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

export function injectOverlayRuntime(html: string, filePath: string): string {
    try {
        const staticPath = getStaticPath();
        const relativeDir = path.relative(staticPath, path.dirname(filePath));
        const counterPath = relativeDir.replace(/\\/g, '/');

        const injection = `
        <script>
            if (window.top !== window.self) {
                const noop = () => {};
                console.log = console.info = console.warn = console.debug = noop;
            }
            window.COUNTER_PATH = "${counterPath}";
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
