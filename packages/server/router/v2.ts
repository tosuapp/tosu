import { wLogger } from '@tosu/common';
import path from 'path';

import { HttpServer, sendJson } from '../index';
import { directoryWalker } from '../utils/directories';

export default function buildV2Api(app: HttpServer) {
    app.route('/json/v2', 'GET', (req, res) => {
        const osuInstance: any = req.instanceManager.getInstance();
        if (!osuInstance) {
            res.statusCode = 500;
            return sendJson(res, { error: 'not_ready' });
        }

        const json = osuInstance.getStateV2(req.instanceManager);
        sendJson(res, json);
    });

    app.route('/json/v2/precise', 'GET', (req, res) => {
        const osuInstance: any = req.instanceManager.getInstance();
        if (!osuInstance) {
            res.statusCode = 500;
            return sendJson(res, { error: 'not_ready' });
        }

        const json = osuInstance.getPreciseData(req.instanceManager);
        sendJson(res, json);
    });

    app.route(/^\/files\/beatmap\/(?<filePath>.*)/, 'GET', (req, res) => {
        try {
            const url = req.pathname || '/';

            const osuInstance: any = req.instanceManager.getInstance();
            if (!osuInstance) {
                res.statusCode = 500;
                return sendJson(res, { error: 'not_ready' });
            }
            const global = osuInstance.get('global');
            if (global.songsFolder === '') {
                res.statusCode = 500;
                return sendJson(res, { error: 'not_ready' });
            }

            directoryWalker({
                res,
                baseUrl: url,
                pathname: req.params.filePath,
                folderPath: global.songsFolder
            });
        } catch (error) {
            wLogger.error((error as any).message);
            wLogger.debug(error);

            return sendJson(res, {
                error: (error as any).message
            });
        }
    });

    app.route(/^\/files\/skin\/(?<filePath>.*)/, 'GET', (req, res) => {
        try {
            const url = req.pathname || '/';

            const osuInstance: any = req.instanceManager.getInstance();
            if (!osuInstance) {
                res.statusCode = 500;
                return sendJson(res, { error: 'not_ready' });
            }

            const global = osuInstance.get('global');
            if (
                (global.gameFolder === '' && global.skinFolder === '') ||
                (global.gameFolder == null && global.skinFolder == null)
            ) {
                res.statusCode = 500;
                return sendJson(res, { error: 'not_ready' });
            }

            const folder = path.join(
                global.gameFolder,
                'Skins',
                global.skinFolder
            );
            directoryWalker({
                res,
                baseUrl: url,
                pathname: req.params.filePath,
                folderPath: folder
            });
        } catch (error) {
            wLogger.error((error as any).message);
            wLogger.debug(error);

            return sendJson(res, {
                error: (error as any).message
            });
        }
    });
}
