import { wLogger } from '@tosu/common';

import { HttpServer, sendJson } from '../index';
import { directoryWalker } from '../utils/directories';

export default function buildV1Api(app: HttpServer) {
    app.route(/^\/Songs\/(?<filePath>.*)/, 'GET', (req, res) => {
        try {
            const url = req.pathname || '/';

            const osuInstance: any = req.instanceManager.getInstance();
            if (!osuInstance) {
                res.statusCode = 500;
                return sendJson(res, { error: 'not_ready' });
            }

            const { allTimesData } = osuInstance.getServices(['allTimesData']);
            if (allTimesData.SongsFolder === '') {
                res.statusCode = 500;
                return sendJson(res, { error: 'not_ready' });
            }

            directoryWalker({
                res,
                baseUrl: url,
                pathname: req.params.filePath,
                folderPath: allTimesData.SongsFolder
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
