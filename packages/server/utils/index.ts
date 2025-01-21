import { config } from '@tosu/common';
import http from 'http';
import path from 'path';

const contentTypes = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png; charset=utf-8',
    '.jpg': 'image/jpg; charset=utf-8',
    '.gif': 'image/gif; charset=utf-8',
    '.svg': 'image/svg+xml; charset=utf-8',
    '.wav': 'audio/wav; charset=utf-8',
    '.mp4': 'video/mp4; charset=utf-8',
    '.woff': 'application/font-woff; charset=utf-8',
    '.ttf': 'application/font-ttf; charset=utf-8',
    '.eot': 'application/vnd.ms-fontobject; charset=utf-8',
    '.otf': 'application/font-otf; charset=utf-8',
    '.wasm': 'application/wasm; charset=utf-8',
    '.aac': 'audio/aac; charset=utf-8',
    '.abw': 'application/x-abiword; charset=utf-8',
    '.apng': 'image/apng; charset=utf-8',
    '.arc': 'application/x-freearc; charset=utf-8',
    '.avif': 'image/avif; charset=utf-8',
    '.avi': 'video/x-msvideo; charset=utf-8',
    '.bin': 'application/octet-stream; charset=utf-8',
    '.bmp': 'image/bmp; charset=utf-8',
    '.bz': 'application/x-bzip; charset=utf-8',
    '.bz2': 'application/x-bzip2; charset=utf-8',
    '.cda': 'application/x-cdf; charset=utf-8',
    '.csv': 'text/csv; charset=utf-8',
    '.gz': 'application/gzip; charset=utf-8',
    '.htm': 'text/html; charset=utf-8',
    '.ico': 'image/vnd.microsoft.icon; charset=utf-8',
    '.jpeg': 'image/jpeg; charset=utf-8',
    '.jsonld': 'application/ld+json; charset=utf-8',
    '.mid': 'audio/x-midi; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.mp3': 'audio/mpeg; charset=utf-8',
    '.mpeg': 'video/mpeg; charset=utf-8',
    '.mpkg': 'application/vnd.apple.installer+xml; charset=utf-8',
    '.ogg': 'audio/ogg; charset=utf-8',
    '.oga': 'audio/ogg; charset=utf-8',
    '.ogv': 'video/ogg; charset=utf-8',
    '.ogx': 'application/ogg; charset=utf-8',
    '.opus': 'audio/opus; charset=utf-8',
    '.rar': 'application/vnd.rar; charset=utf-8',
    '.sh': 'application/x-sh; charset=utf-8',
    '.tar': 'application/x-tar; charset=utf-8',
    '.tif': 'image/tiff; charset=utf-8',
    '.ts': 'video/mp2t; charset=utf-8',
    '.txt': 'text/plain; charset=utf-8',
    '.weba': 'audio/webm; charset=utf-8',
    '.webm': 'video/webm; charset=utf-8',
    '.webp': 'image/webp; charset=utf-8',
    '.woff2': 'font/woff2; charset=utf-8',
    '.xhtml': 'application/xhtml+xml; charset=utf-8',
    '.xml': 'application/xmlz; charset=utf-8',
    '.xul': 'application/vnd.mozilla.xul+xml; charset=utf-8',
    '.zip': 'application/zip; charset=utf-8',
    '.3gp': 'video/3gpp;; charset=utf-8',
    '.3g2': 'video/3gpp2;; charset=utf-8',
    '.7z': 'application/x-7z-compressed; charset=utf-8',
    '.osu': 'text/plain; charset=utf-8',

    '.midi': 'audio/x-midi; charset=utf-8',
    '.swf': 'application/x-shockwave-flash; charset=utf-8',
    '.tiff': 'image/tiff; charset=utf-8'
};

export function getContentType(text: string) {
    const extension = path.extname(text);

    const contentType = contentTypes[extension] || '';
    return contentType;
}

export function sendJson(response: http.ServerResponse, json: object | any[]) {
    response.setHeader('Content-Type', 'application/json');

    try {
        return response.end(JSON.stringify(json));
    } catch (error) {
        return response.end(JSON.stringify({ error: 'Json parsing error' }));
    }
}

export function isRequestAllowed(req: http.IncomingMessage) {
    const remoteAddress = req.socket.remoteAddress;

    const origin = req.headers.origin;
    const referer = req.headers.referer;

    const isOriginOrRefererAllowed =
        isAllowedIP(origin) || isAllowedIP(referer);

    // NOT SURE
    if (origin === undefined && referer === undefined) {
        return true;
    }

    if (isOriginOrRefererAllowed) {
        return true;
    }

    if (isOriginOrRefererAllowed && isAllowedIP(remoteAddress)) {
        return false;
    }

    return false;
}

function isAllowedIP(url: string | undefined) {
    if (!url) return false;

    const allowedIPs = config.allowedIPs.split(',');
    try {
        const hostname = new URL(url).hostname.toLowerCase().trim();
        return allowedIPs.some((pattern) => {
            // compare IP's length and match wildcard like comparision
            if (pattern.includes('*') && pattern.includes('.')) {
                const patternLength = pattern.match(/\./g)?.length || 0;
                const hostnameLength = hostname.match(/\./g)?.length || 0;

                if (patternLength !== 3 || hostnameLength !== 3) return false;

                const patternParts = pattern.split('.');
                const hostnameParts = hostname.split('.');

                const matches = hostnameParts.filter((r, index) => {
                    if (patternParts[index] === '*') return true;

                    return patternParts[index] === r;
                });

                return matches.length === 4;
            }

            return pattern.toLowerCase().trim() === hostname;
        });
    } catch (error) {
        return allowedIPs.some(
            (r) => r.toLowerCase().trim() === url.toLowerCase().trim()
        );
    }
}
