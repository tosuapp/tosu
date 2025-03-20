import { getStaticPath, wLogger } from '@tosu/common';
import fs from 'fs';
import http from 'http';
import path from 'path';

import { getContentType } from '../index';
import { OVERLAYS_STATIC } from './homepage';

function isPathDirectory(path) {
    const stat = fs.statSync(path);
    return Boolean(stat && stat.isDirectory());
}

export function directoryWalker({
    _htmlRedirect,
    res,
    baseUrl,
    folderPath,
    pathname
}: {
    _htmlRedirect?: boolean;

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
                            html = addCounterMetadata(html, filePath);
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
                content = addCounterMetadata(content.toString(), filePath);
            }

            res.writeHead(200, { 'Content-Type': contentType });
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

export function addCounterMetadata(html: string, filePath: string) {
    try {
        const staticPath = getStaticPath();

        const counterPath = path
            .dirname(filePath.replace(staticPath, ''))
            .replace(/^(\\\\\\|\\\\|\\|\/|\/\/)/, '')
            .replace(/\\/gm, '/');

        html += `\n\n\n<script>\rwindow.COUNTER_PATH=\`${counterPath}\`\r</script>\n`;

        return html;
    } catch (error) {
        wLogger.error('addCounterMetadata', (error as any).message);
        wLogger.debug('addCounterMetadata', error);

        return '';
    }
}
