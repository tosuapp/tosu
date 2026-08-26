import { wLogger } from '@tosu/common';
import path from 'node:path';

import { getContentType } from '../utils';
import type { HttpServer } from '../utils/http';
import { SERVER_ASSETS_PATH } from '../utils/paths';
import { serveFile } from '../utils/serveFile';

export default function buildAssetsApi(app: HttpServer) {
    app.route(/^\/assets\/(?<filePath>.*)/, 'GET', async (req) => {
        const filePath = path.join(SERVER_ASSETS_PATH, req.params.filePath);
        const file = Bun.file(filePath);

        if (!(await file.exists())) {
            wLogger.debug(
                `Asset retrieval error for %${req.params.filePath}%: not found`
            );

            return new Response('<html>page not found</html>', {
                status: 404,
                headers: { 'Content-Type': 'text/html' }
            });
        }

        return serveFile(filePath, {
            contentType: getContentType(req.params.filePath)
        });
    });
}
