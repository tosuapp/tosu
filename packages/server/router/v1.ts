import { directoryWalker } from '../utils/directories';
import type { HttpServer } from '../utils/http';

export default function buildV1Api(app: HttpServer) {
    app.route(/^\/Songs\/(?<filePath>.*)/, 'GET', (req) => {
        const url = req.pathname || '/';
        const osuInstance = req.instanceManager.getInstance(
            req.instanceManager.focusedClient
        );
        if (!osuInstance) {
            throw new Error('osu is not ready/running');
        }

        const global = osuInstance.get('global');
        if (!global || global.songsFolder === '') {
            throw new Error('osu is not ready/running');
        }

        return directoryWalker({
            req,
            baseUrl: url,
            pathname: req.params.filePath,
            folderPath: global.songsFolder
        });
    });
}
