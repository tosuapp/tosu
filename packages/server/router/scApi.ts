import { HttpServer, sendJson } from '../index';
import { beatmapFileShortcut } from '../scripts/beatmapFile';

export default function buildSCApi(app: HttpServer) {
    app.route('/json/sc', 'GET', (req, res) => {
        const osuInstance: any = req.instanceManager.getInstance(
            req.instanceManager.focusedClient
        );
        if (!osuInstance) {
            throw new Error('osu is not ready/running');
        }

        const json = osuInstance.getStateSC(req.instanceManager);
        return sendJson(res, json);
    });

    app.route('/backgroundImage', 'GET', (req, res) =>
        beatmapFileShortcut(req, res, 'background')
    );
}
