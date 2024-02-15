import { config } from '@tosu/common/dist/config';
import { HttpServer, getContentType, sendJson } from '@tosu/server';
import fs from 'fs';
import path from 'path';

import { readDirectory } from '../utils/reader';

export const baseApi = (app: HttpServer) => {
    app.route('/json', 'GET', (req, res) => {
        const osuInstances: any = Object.values(
            req.instanceManager.osuInstances || {}
        );
        if (osuInstances.length < 1) {
            res.statusCode = 500;
            return res.end('nothing');
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

    app.route(/.*/, 'GET', (req, res) => {
        const url = req.url || '/';
        const staticPath =
            config.staticFolderPath ||
            path.join(path.dirname(process.execPath), 'static');

        const extension = path.extname(url);
        const selectedFolder = decodeURI(path.join(staticPath, url));
        if (url == '/') {
            return readDirectory(selectedFolder, url, (html: string) => {
                res.writeHead(200, {
                    'Content-Type': getContentType('file.html')
                });
                res.end(html);
            });
        }

        if (extension == '' && !url.endsWith('/')) {
            res.writeHead(301, { Location: url + '/' });
            return res.end();
        }

        const selecteIndexHTML = url.endsWith('/')
            ? path.join(selectedFolder, 'index.html')
            : selectedFolder;
        return fs.readFile(selecteIndexHTML, (err, content) => {
            if (err == null) {
                res.writeHead(200, {
                    'Content-Type': getContentType(selecteIndexHTML)
                });
                return res.end(content, 'utf-8');
            }

            if (err.code === 'ENOENT') {
                return readDirectory(selectedFolder, url, (html: string) => {
                    res.writeHead(200, {
                        'Content-Type': getContentType('file.html')
                    });
                    res.end(html);
                });
            }

            res.writeHead(500);
            res.end(`Server Error: ${err.code}`);
        });
    });
};
