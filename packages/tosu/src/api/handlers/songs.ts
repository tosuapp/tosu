import {
    ExtendedIncomingMessage,
    getContentType,
    sendJson
} from '@tosu/server';
import fs from 'fs';
import http from 'http';
import path from 'path';

export const readSongsFolder = (
    req: ExtendedIncomingMessage,
    res: http.ServerResponse
) => {
    const osuInstances: any = Object.values(
        req.instanceManager.osuInstances || {}
    );
    if (osuInstances.length < 1) {
        res.statusCode = 500;
        return res.end('nothing');
    }

    const { settings } = osuInstances[0].entities.getServices(['settings']);
    if (settings.songsFolder === '') {
        res.statusCode = 500;
        return sendJson(res, { error: 'not_ready' });
    }

    const cleanedUrl = decodeURI(req.params.filePath);
    const contentType = getContentType(cleanedUrl);

    const filePath = path.join(settings.songsFolder, cleanedUrl);
    return fs.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end('404 Not Found');
                return;
            }

            res.writeHead(500);
            res.end(`Server Error: ${err.code}`);
            return;
        }

        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content, 'utf-8');
    });
};
