import fs from 'fs';
import http from 'http';
import path from 'path';

import { getContentType } from '../index';
import { OVERLAYS_STATIC } from './homepage';

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
        cleanedUrl = decodeURI(pathname);
    } catch (error) {
        res.writeHead(404, {
            'Content-Type': getContentType('file.txt')
        });
        res.end('');
        return;
    }
    const contentType = getContentType(cleanedUrl);

    const filePath = path.join(folderPath, cleanedUrl);
    const isDirectory = path.extname(filePath) === '';
    if (isDirectory) {
        return readDirectory(filePath, baseUrl, (html: string) => {
            res.writeHead(200, {
                'Content-Type': getContentType('file.html')
            });
            res.end(html);
        });
    }

    return fs.readFile(filePath, (err, content) => {
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

        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content, 'utf-8');
    });
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
            return `<li><a href="${
                url === '/' ? '' : url
            }${r}${slashAtTheEnd}">${r}</a></li>`;
        });

        return callback(
            OVERLAYS_STATIC.replace('{OVERLAYS_LIST}', html.join('\n')).replace(
                '{PAGE_URL}',
                `tosu - ${url}`
            )
        );
    });
}
