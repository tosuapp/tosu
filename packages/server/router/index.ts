import { Beatmap, Calculator } from '@kotrikd/rosu-pp';
import { config, wLogger } from '@tosu/common';
import path from 'path';

import { HttpServer, getContentType, sendJson } from '../index';
import { directoryWalker, readDirectory } from '../utils/directories';

export default function buildBaseApi(app: HttpServer) {
    app.route('/json', 'GET', (req, res) => {
        const osuInstances: any = Object.values(
            req.instanceManager.osuInstances || {}
        );
        if (osuInstances.length < 1) {
            res.statusCode = 500;
            return sendJson(res, { error: 'not_ready' });
        }

        const json = osuInstances[0].getState(req.instanceManager);
        sendJson(res, json);
    });

    app.route('/api/overlays', 'GET', (req, res) => {
        const staticPath =
            config.staticFolderPath ||
            path.join(path.dirname(process.execPath), 'static');

        readDirectory(staticPath, '/', (html: string) => {
            res.writeHead(200, { 'Content-Type': getContentType('file.html') });
            res.end(html);
        });
    });

    app.route('/api/calculate/pp', 'GET', (req, res) => {
        try {
            const query: any = req.query;

            const osuInstances: any = Object.values(
                req.instanceManager.osuInstances || {}
            );
            if (osuInstances.length < 1) {
                res.statusCode = 500;
                return sendJson(res, { error: 'not_ready' });
            }

            const { settings, menuData } = osuInstances[0].entities.getServices(
                ['settings', 'menuData']
            );

            const beatmapFilePath =
                query.path ||
                path.join(
                    settings.gameFolder,
                    'Songs',
                    menuData.Folder,
                    menuData.Path
                );

            const parseBeatmap = new Beatmap({ path: beatmapFilePath });
            const calculator = new Calculator();

            const array = Object.keys(query || {});
            for (let i = 0; i < array.length; i++) {
                const key = array[i];
                const value = query[key];

                if (key in calculator && isFinite(+value))
                    calculator[key](+value);
            }

            return sendJson(res, {
                attributes: calculator.mapAttributes(parseBeatmap),
                performance: calculator.performance(parseBeatmap)
            });
        } catch (error) {
            wLogger.error(error);

            return sendJson(res, {
                error: (error as any).message
            });
        }
    });

    app.route(/.*/, 'GET', (req, res) => {
        const url = req.pathname || '/';
        const folderPath =
            config.staticFolderPath ||
            path.join(path.dirname(process.execPath), 'static');

        if (url == '/') {
            return readDirectory(folderPath, url, (html: string) => {
                res.writeHead(200, {
                    'Content-Type': getContentType('file.html')
                });
                res.end(html);
            });
        }

        const extension = path.extname(url);
        if (extension == '' && !url.endsWith('/')) {
            res.writeHead(301, { Location: url + '/' });
            return res.end();
        }

        const selectIndexHTML = url.endsWith('/') ? url + 'index.html' : url;
        directoryWalker({
            _htmlRedirect: true,
            res,
            baseUrl: url,
            pathname: selectIndexHTML,
            folderPath
        });
    });
}
