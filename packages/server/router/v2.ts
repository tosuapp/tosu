import { ClientType } from '@tosu/common';
import path from 'node:path';

import { beatmapFileShortcut } from '../scripts/beatmapFile';
import { json } from '../utils';
import { directoryWalker } from '../utils/directories';
import type { HttpServer } from '../utils/http';

export default function buildV2Api(app: HttpServer) {
    app.route('/json/v2', 'GET', (req) => {
        const osuInstance = req.instanceManager.getInstance(
            req.instanceManager.focusedClient
        );
        if (!osuInstance) {
            throw new Error('osu is not ready/running');
        }

        return json(osuInstance.getStateV2(req.instanceManager));
    });

    app.route('/json/v2/precise', 'GET', (req) => {
        const osuInstance = req.instanceManager.getInstance(
            req.instanceManager.focusedClient
        );
        if (!osuInstance) {
            throw new Error('osu is not ready/running');
        }

        return json(osuInstance.getPreciseData(req.instanceManager));
    });

    app.route(
        /\/files\/beatmap\/(?<type>background|audio|file)/,
        'GET',
        (req) => beatmapFileShortcut(req, req.params.type as any)
    );

    app.route(/^\/files\/beatmap\/(?<filePath>.*)/, 'GET', (req) => {
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

    app.route(/^\/files\/skin\/(?<filePath>.*)/, 'GET', (req) => {
        const url = req.pathname || '/';

        const osuInstance = req.instanceManager.getInstance(
            req.instanceManager.focusedClient
        );
        if (!osuInstance) {
            throw new Error('osu is not ready/running');
        }

        const global = osuInstance.get('global');
        if (
            !global ||
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
        return directoryWalker({
            req,
            baseUrl: url,
            pathname: req.params.filePath,
            folderPath: folder
        });
    });
}
