import { getContentType, wLogger } from '@tosu/common';
import fs from 'fs';
import path from 'path';

import { Server } from '../index';

const pkgAssetsPath =
    'pkg' in process
        ? path.join(__dirname, 'assets')
        : path.join(__dirname, '../assets');

export default function buildAssetsApi(server: Server) {
    server.app.route(/^\/assets\/(?<filePath>.*)/, 'GET', (req, res) => {
        fs.readFile(
            path.join(pkgAssetsPath, req.params.filePath),
            (err, content) => {
                if (err) {
                    wLogger.debug(`/assets/${req.params.filePath}`, err);
                    res.writeHead(404, { 'Content-Type': 'text/html' });

                    res.end('<html>page not found</html>');
                    return;
                }

                res.writeHead(200, {
                    'Content-Type': getContentType(req.params.filePath)
                });

                res.end(content);
            }
        );
    });
}
