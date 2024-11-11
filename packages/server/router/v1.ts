import { wLogger } from '@tosu/common';

import { HttpServer, sendJson } from '../index';
import { directoryWalker } from '../utils/directories';

export default function buildV1Api(app: HttpServer) {
    app.route(/^\/Songs\/(?<filePath>.*)/, 'GET', (req, res) => {
        try {
            const url = req.pathname || '/';

            const osuInstance: any = req.instanceManager.getInstance(
                req.instanceManager.focusedClient
            );
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
}
