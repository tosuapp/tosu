import { wLogger } from '@tosu/common';
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
    try {
        const url = req.pathname || '/';

        const osuInstance: any = req.instanceManager.getInstance();
        if (!osuInstance) {
            res.statusCode = 500;
            return sendJson(res, { error: 'not_ready' });
        }

        const { global, menu } = osuInstance.getServices(['global', 'menu']);
        if (
            (global.gameFolder === '' && global.skinFolder === '') ||
            (global.gameFolder == null && global.skinFolder == null)
        ) {
            res.statusCode = 500;
            return sendJson(res, { error: 'not_ready' });
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
    } catch (error) {
        wLogger.error((error as any).message);
        wLogger.debug(error);

        return sendJson(res, {
            error: (error as any).message
        });
    }
}
