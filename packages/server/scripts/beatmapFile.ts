import fs from 'fs';
import type { ServerResponse } from 'http';
import path from 'path';

import type { ExtendedIncomingMessage } from '../utils/http';
import { sendJson } from '../utils/index';

export function beatmapFileShortcut(
    req: ExtendedIncomingMessage,
    res: ServerResponse,
    beatmapFileType: 'audio' | 'background' | 'file'
) {
    const osuInstance: any = req.instanceManager.getInstance(
        req.instanceManager.focusedClient
    );
    if (!osuInstance) {
        throw new Error('osu is not ready/running');
    }

    const { global, menu } = osuInstance.getServices(['global', 'menu']);
    if (
        (global.gameFolder === '' && global.skinFolder === '') ||
        (global.gameFolder == null && global.skinFolder == null)
    ) {
        throw new Error('osu is not ready/running');
    }

    const folder = path.join(global.songsFolder, menu.folder || '');
    let fileName = '';
    let fileMimetype = '';

    if (beatmapFileType === 'audio') {
        fileName = menu.audioFilename;
        fileMimetype = menu.audioFileMimetype;
    } else if (beatmapFileType === 'background') {
        fileName = menu.backgroundFilename;
        fileMimetype = menu.backgroundFileMimetype;
    } else if (beatmapFileType === 'file') {
        fileName = menu.filename;
        fileMimetype = 'text/plain';
    } else {
        return sendJson(res, {
            error: 'Unknown file type'
        });
    }

    if (!folder || !fileName) {
        res.writeHead(404);
        return res.end();
    }

    const filePath = path.join(folder, fileName);
    if (!fs.existsSync(filePath)) {
        res.writeHead(404, { 'Content-Type': fileMimetype });
        return res.end();
    }

    const fileStat = fs.statSync(filePath);
    if (!fileStat.isFile()) {
        res.writeHead(404, { 'Content-Type': fileMimetype });
        return res.end();
    }

    if (req.headers.range) {
        const range = req.headers.range.replace('bytes=', '').split('-');
        const start = parseInt(range[0]);
        const end = range[1] ? parseInt(range[1]) : fileStat.size - 1;

        if (start >= fileStat.size || end >= fileStat.size) {
            res.writeHead(416, {
                'Content-Range': `bytes */${fileStat.size}`
            });
            return res.end();
        }

        res.writeHead(206, {
            'Accept-Ranges': 'bytes',
            'Content-Type': fileMimetype,
            'Content-Range': `bytes ${start}-${end}/${fileStat.size}`,
            'Content-Length': end - start + 1
        });

        fs.createReadStream(filePath, { start, end }).pipe(res);
        return;
    }

    res.writeHead(200, {
        'Content-Type': fileMimetype,
        'Content-Length': fileStat.size
    });

    fs.createReadStream(filePath).pipe(res);
}
