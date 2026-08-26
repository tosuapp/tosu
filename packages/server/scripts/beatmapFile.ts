import fs from 'node:fs';
import path from 'node:path';

import type { TosuRequest } from '../utils/http';
import { json } from '../utils/index';
import { serveFile } from '../utils/serveFile';

export function beatmapFileShortcut(
    req: TosuRequest,
    beatmapFileType: 'audio' | 'background' | 'file'
): Response | Promise<Response> {
    const osuInstance = req.instanceManager.getInstance(
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
        fileMimetype = 'text/plain; charset=utf-8';
    } else {
        return json({ error: 'Unknown file type' });
    }

    if (!folder || !fileName) {
        return new Response(null, { status: 404 });
    }

    const filePath = path.join(folder, fileName);
    if (!fs.existsSync(filePath)) {
        return new Response(null, {
            status: 404,
            headers: { 'Content-Type': fileMimetype }
        });
    }

    const fileStat = fs.statSync(filePath);
    if (!fileStat.isFile()) {
        return new Response(null, {
            status: 404,
            headers: { 'Content-Type': fileMimetype }
        });
    }

    return serveFile(filePath, {
        range: req.headers.get('range'),
        contentType: fileMimetype,
        extraHeaders: {
            'Accept-Ranges': 'bytes',
            'Content-Length': String(fileStat.size)
        }
    });
}
