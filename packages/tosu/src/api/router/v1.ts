import { config } from '@tosu/common/dist/config';
import type { WebSocket } from '@tosu/server';
import { HttpServer, getContentType, sendJson } from '@tosu/server';
import fs from 'fs';
import path from 'path';

import { InstanceManager } from '@/objects/instanceManager/instanceManager';

import { readDirectory } from '../utils/reader';

export const legacyApi = ({
    app,
    instanceManager,
    oldWebsocket
}: {
    app: HttpServer;
    instanceManager: InstanceManager;
    oldWebsocket: WebSocket.Server;
}) => {
    app.use((_, res, next) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader(
            'Access-Control-Allow-Headers',
            'Origin, X-Requested-With, Content-Type, Accept'
        );
        res.setHeader(
            'Access-Control-Allow-Methods',
            'POST, GET, PUT, DELETE, OPTIONS'
        );
        next();
    });

    app.use((req, _, next) => {
        req.instanceManager = instanceManager;
        next();
    });

    app.server.on('upgrade', function (request, socket, head) {
        if (request.url == '/ws') {
            oldWebsocket.handleUpgrade(request, socket, head, function (ws) {
                oldWebsocket.emit('connection', ws, request);
            });
        }
    });

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

    app.route(/\/Songs\/(?<filePath>.*)/, 'GET', (req, res) => {
        const osuInstances: any = Object.values(
            req.instanceManager.osuInstances || {}
        );
        if (osuInstances.length < 1) {
            res.statusCode = 500;
            return res.end('nothing');
        }

        const { settings } = osuInstances[0].entities.getServices(['settings']);
        if (settings.songsFolder === '') {
            res.statusCode = 500;
            return sendJson(res, { error: 'not_ready' });
        }

        const cleanedUrl = decodeURI(req.params.filePath);
        const contentType = getContentType(cleanedUrl);

        const filePath = path.join(settings.songsFolder, cleanedUrl);
        return fs.readFile(filePath, (err, content) => {
            if (err) {
                if (err.code === 'ENOENT') {
                    res.writeHead(404, { 'Content-Type': 'text/html' });
                    res.end('404 Not Found');
                    return;
                }

                res.writeHead(500);
                res.end(`Server Error: ${err.code}`);
                return;
            }

            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
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
