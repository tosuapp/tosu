import { HttpServer } from '../index';
import { directoryWalker } from '../utils/directories';

export default function buildV1Api(app: HttpServer) {
    app.route(/^\/Songs\/(?<filePath>.*)/, 'GET', (req, res) => {
        const url = req.pathname || '/';
        const osuInstance: any = req.instanceManager.getInstance(
            req.instanceManager.focusedClient
        );
        if (!osuInstance) {
            throw new Error('osu is not ready/running');
        }

        const global = osuInstance.get('global');
        if (global.songsFolder === '') {
            throw new Error('osu is not ready/running');
        }

        directoryWalker({
            res,
            baseUrl: url,
            pathname: req.params.filePath,
            folderPath: global.songsFolder
        });
    });
}
