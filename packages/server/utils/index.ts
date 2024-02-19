import http from 'http';
import path from 'path';

const contentTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.wav': 'audio/wav',
    '.mp4': 'video/mp4',
    '.woff': 'application/font-woff',
    '.ttf': 'application/font-ttf',
    '.eot': 'application/vnd.ms-fontobject',
    '.otf': 'application/font-otf',
    '.wasm': 'application/wasm',
    '.aac': 'audio/aac',
    '.abw': 'application/x-abiword',
    '.apng': 'image/apng',
    '.arc': 'application/x-freearc',
    '.avif': 'image/avif',
    '.avi': 'video/x-msvideo',
    '.bin': 'application/octet-stream',
    '.bmp': 'image/bmp',
    '.bz': 'application/x-bzip',
    '.bz2': 'application/x-bzip2',
    '.cda': 'application/x-cdf',
    '.csv': 'text/csv',
    '.gz': 'application/gzip',
    '.htm': 'text/html',
    '.ico': 'image/vnd.microsoft.icon',
    '.jpeg': 'image/jpeg',
    '.jsonld': 'application/ld+json',
    '.mid': 'audio/x-midi',
    '.mjs': 'text/javascript',
    '.mp3': 'audio/mpeg',
    '.mpeg': 'video/mpeg',
    '.mpkg': 'application/vnd.apple.installer+xml',
    '.ogg': 'audio/ogg',
    '.oga': 'audio/ogg',
    '.ogv': 'video/ogg',
    '.ogx': 'application/ogg',
    '.opus': 'audio/opus',
    '.rar': 'application/vnd.rar',
    '.sh': 'application/x-sh',
    '.tar': 'application/x-tar',
    '.tif': 'image/tiff',
    '.ts': 'video/mp2t',
    '.txt': 'text/plain',
    '.weba': 'audio/webm',
    '.webm': 'video/webm',
    '.webp': 'image/webp',
    '.woff2': 'font/woff2',
    '.xhtml': 'application/xhtml+xml',
    '.xml': 'application/xmlz',
    '.xul': 'application/vnd.mozilla.xul+xml',
    '.zip': 'application/zip',
    '.3gp': 'video/3gpp;',
    '.3g2': 'video/3gpp2;',
    '.7z': 'application/x-7z-compressed',
    '.osu': 'text/plain',

    '.midi': 'audio/x-midi',
    '.swf': 'application/x-shockwave-flash',
    '.tiff': 'image/tiff'
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

export function getUniqueID() {
    const s4 = () =>
        Math.floor((1 + Math.random()) * 0x10000)
            .toString(16)
            .substring(1);
    return s4() + s4() + '-' + s4();
}
