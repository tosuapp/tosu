import { HttpServer, sendJson } from '../index';
import { beatmapFileShortcut } from '../scripts/beatmapFile';

export default function buildSCApi(app: HttpServer) {
    app.route('/json/sc', 'GET', (req, res) => {
        const osuInstance: any = req.instanceManager.getInstance(
            req.instanceManager.focusedClient
        );
        if (!osuInstance) {
            res.statusCode = 500;
            return sendJson(res, { error: 'not_ready' });
        }

        const json = osuInstance.getStateSC(req.instanceManager);
        sendJson(res, json);
    });

    app.route('/backgroundImage', 'GET', (req, res) =>
        beatmapFileShortcut(req, res, 'background')
    );
}
