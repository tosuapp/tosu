import { getStaticPath, wLogger } from '@tosu/common';
import fs from 'node:fs';
import path from 'node:path';

import { getContentType, html } from '../utils';
import { OVERLAYS_STATIC } from './homepage';
import type { TosuRequest } from './http';
import { serveFile } from './serveFile';

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

export async function directoryWalker({
    req,
    baseUrl,
    folderPath,
    pathname
}: {
    req: TosuRequest;
    baseUrl: string;
    pathname: string;
    folderPath: string;
}): Promise<Response> {
    let cleanedUrl: string;
    try {
        cleanedUrl = decodeURIComponent(pathname);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
        return new Response('', {
            status: 404,
            headers: { 'Content-Type': getContentType('file.txt') }
        });
    }

    const contentType = getContentType(cleanedUrl);
    const filePath = path.join(folderPath, cleanedUrl);
    const isHTML = filePath.endsWith('.html');

    // Throws ENOENT for missing files; the router maps it to 500 (files API) or 404 (catch-all).
    const stat = await fs.promises.stat(filePath);

    if (stat.isDirectory()) {
        if (!baseUrl.endsWith('/')) {
            return new Response(null, {
                status: 301,
                headers: { Location: baseUrl + '/' }
            });
        }

        const listing = await readDirectory(filePath, baseUrl);
        if (listing instanceof Error) return html('404 Not Found', 404);

        return html(listing);
    }

    if (isHTML) {
        const content = await Bun.file(filePath).text();
        return html(addCounterMetadata(content, filePath));
    }

    const extraHeaders: Record<string, string> = {};
    if (allowedRangeExtensions.includes(path.extname(pathname))) {
        extraHeaders['Accept-Ranges'] = 'bytes';
        extraHeaders['Content-Length'] = String(stat.size);
    }

    return serveFile(filePath, {
        range: req.headers.get('range'),
        contentType,
        extraHeaders
    });
}

export async function readDirectory(
    folderPath: string,
    url: string
): Promise<string | Error> {
    let folders: string[];
    try {
        folders = await fs.promises.readdir(folderPath);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
        return new Error(`Files not found: ${folderPath}`);
    }

    const list = folders.map((r) => {
        const slashAtTheEnd = getContentType(r) === '' ? '/' : '';

        return `<li><a href="${url === '/' ? '' : url}${encodeURIComponent(r)}${slashAtTheEnd}">${r}</a></li>`;
    });

    return OVERLAYS_STATIC.replace('{OVERLAYS_LIST}', list.join('\n')).replace(
        '{PAGE_URL}',
        `tosu - ${url}`
    );
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
        wLogger.error(
            'Failed to add counter metadata:',
            (error as any).message
        );
        wLogger.debug('Counter metadata error details:', error);

        return '';
    }
}
