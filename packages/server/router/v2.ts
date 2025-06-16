import { ClientType } from '@tosu/common';
import path from 'path';

import { HttpServer, sendJson } from '../index';
import { beatmapFileShortcut } from '../scripts/beatmapFile';
import { directoryWalker } from '../utils/directories';

export default function buildV2Api(app: HttpServer) {
    app.route('/json/v2', 'GET', (req, res) => {
        const osuInstance: any = req.instanceManager.getInstance(
            req.instanceManager.focusedClient
        );
        if (!osuInstance) {
            throw new Error('osu is not ready/running');
        }

        const json = osuInstance.getStateV2(req.instanceManager);
        return sendJson(res, json);
    });

    app.route('/json/v2/precise', 'GET', (req, res) => {
        const osuInstance: any = req.instanceManager.getInstance(
            req.instanceManager.focusedClient
        );
        if (!osuInstance) {
            throw new Error('osu is not ready/running');
        }

        const json = osuInstance.getPreciseData(req.instanceManager);
        return sendJson(res, json);
    });

    app.route(
        /\/files\/beatmap\/(?<type>background|audio|file)/,
        'GET',
        (req, res) => beatmapFileShortcut(req, res, req.params.type as any)
    );

    app.route(/^\/files\/beatmap\/(?<filePath>.*)/, 'GET', (req, res) => {
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

    app.route(/^\/files\/skin\/(?<filePath>.*)/, 'GET', (req, res) => {
        const url = req.pathname || '/';

        const osuInstance: any = req.instanceManager.getInstance(
            req.instanceManager.focusedClient
        );
        if (!osuInstance) {
            throw new Error('osu is not ready/running');
        }

        const global = osuInstance.get('global');
        if (
            (global.gameFolder === '' && global.skinFolder === '') ||
            (global.gameFolder == null && global.skinFolder == null)
        ) {
            throw new Error('osu is not ready/running');
        }

        // The lazer internal folder structure does not contain a "skins" folder, so we can't parse them.
        // https://osu.ppy.sh/wiki/en/Client/Release_stream/Lazer/File_storage
        if (global.game.client === ClientType.lazer) {
            throw new Error(
                'This endpoint is unavailable for the lazer client.'
            );
        }

        const folder = path.join(global.gameFolder, 'Skins', global.skinFolder);
        directoryWalker({
            res,
            baseUrl: url,
            pathname: req.params.filePath,
            folderPath: folder
        });
    });
}
