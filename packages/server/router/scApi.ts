import { beatmapFileShortcut } from '../scripts/beatmapFile';
import { json } from '../utils';
import type { HttpServer } from '../utils/http';

export default function buildSCApi(app: HttpServer) {
    app.route('/json/sc', 'GET', (req) => {
        const osuInstance = req.instanceManager.getInstance(
            req.instanceManager.focusedClient
        );
        if (!osuInstance) {
            throw new Error('osu is not ready/running');
        }

        return json(osuInstance.getStateSC(req.instanceManager));
    });

    app.route('/backgroundImage', 'GET', (req) =>
        beatmapFileShortcut(req, 'background')
    );
}
