import { ServerResponse } from 'http';
import path from 'path';

import { directoryWalker } from '../utils/directories';
import { ExtendedIncomingMessage } from '../utils/http';
import { sendJson } from '../utils/index';

export function beatmapFileShortcut(
    req: ExtendedIncomingMessage,
    res: ServerResponse,
    beatmapFileType: 'audio' | 'background' | 'file'
) {
    const url = req.pathname || '/';

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

    if (beatmapFileType === 'audio') fileName = menu.audioFilename;
    else if (beatmapFileType === 'background')
        fileName = menu.backgroundFilename;
    else if (beatmapFileType === 'file') fileName = menu.filename;
    else {
        return sendJson(res, {
            error: 'Unknown file type'
        });
    }

    directoryWalker({
        res,
        baseUrl: url,
        pathname: fileName || '',
        folderPath: folder
    });
}
