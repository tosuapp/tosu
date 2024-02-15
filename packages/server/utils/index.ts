import http from 'http';
import path from 'path';

export function getContentType(text: string) {
    const extension = path.extname(text);

    const contentType =
        {
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
            '.wasm': 'application/wasm'
        }[extension] || 'application/octet-stream';

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
