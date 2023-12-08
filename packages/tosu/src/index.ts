import Router from '@koa/router';
import fs from 'fs';
import Koa from 'koa';
import send from 'koa-send';
import serve from 'koa-static';
import Websockify from 'koa-websocket';

import { config, updateConfig } from './config';
import { OVERLAYS_STATIC } from './constants/overlaysStatic';
import { configureLogger, wLogger } from './logger';
import { InstanceManager } from './objects/instanceManager/instanceManager';
import { OsuInstance } from './objects/instanceManager/osuInstance';
import { sleep } from './utils/sleep';

interface CustomContext extends Koa.Context {
    instancesManager: InstanceManager;
}

(async () => {
    updateConfig();
    configureLogger();

    wLogger.info('Starting tosu');

    wLogger.info('Searching for osu!');

    const instancesManager = new InstanceManager();
    instancesManager.runWatcher();

    const app = Websockify<{}, CustomContext>(new Koa());
    app.use(async (ctx, next) => {
        ctx.instancesManager = instancesManager;
        await next();
    });

    app.use(async (ctx, next) => {
        ctx.set('Access-Control-Allow-Origin', '*');
        ctx.set(
            'Access-Control-Allow-Headers',
            'Origin, X-Requested-With, Content-Type, Accept'
        );
        ctx.set(
            'Access-Control-Allow-Methods',
            'POST, GET, PUT, DELETE, OPTIONS'
        );
        await next();
    });

    const router = new Router();

    const sendFunc = serve(config.staticFolderPath, {
        index: '/index.html'
    });

    router.get('/(.*)', async (ctx, next) => {
        const staticPath = ctx.request.path.replace(/^\/static/g, '');

        if (staticPath === '/') {
            ctx.type = 'html';
            ctx.body = OVERLAYS_STATIC;
            return;
        }

        ctx.path = staticPath;
        await sendFunc(ctx, next);
    });

    router.get('/Songs/(.*)', async (ctx: CustomContext) => {
        if (Object.keys(ctx.instancesManager.osuInstances).length < 1) {
            ctx.response.status = 500;
            ctx.body = null;
            return;
        }

        const { settings } = (
            Object.values(ctx.instancesManager.osuInstances)[0] as OsuInstance
        ).entities.getServices(['settings']);
        if (settings.songsFolder === '') {
            ctx.response.status = 404;
            ctx.body = {
                error: 'not_ready'
            };
            return;
        }
        const mapPath = ctx.request.path.replace('/Songs', '');
        await send(ctx, mapPath, { root: settings.songsFolder });
    });

    router.get('/json', (ctx) => {
        if (Object.keys(ctx.instancesManager.osuInstances).length < 1) {
            ctx.response.status = 500;
            ctx.body = null;
            return;
        }

        ctx.body = (
            Object.values(ctx.instancesManager.osuInstances)[0] as OsuInstance
        ).getState(ctx.instancesManager);
    });

    router.get('/api/getOverlays', async (ctx) => {
        ctx.body = await fs.promises.readdir(config.staticFolderPath);
        return;
    });

    const wsRouter = new Router();
    wsRouter.use(async (ctx, next) => {
        ctx.instancesManager = instancesManager;
        await next();
    });

    wsRouter.get('/ws', async (ctx) => {
        wLogger.debug('>>> ws: CONNECTED');
        let isSocketConnected = true;

        ctx.websocket.on('close', () => {
            isSocketConnected = false;
            wLogger.debug('>>> ws: CLOSED');
        });

        while (isSocketConnected) {
            if (Object.keys(ctx.instancesManager.osuInstances).length < 1) {
                await sleep(500);
                continue;
            }

            ctx.websocket.send(
                JSON.stringify(
                    (
                        Object.values(
                            ctx.instancesManager.osuInstances
                        )[0] as OsuInstance
                    ).getState(ctx.instancesManager)
                )
            );
            await sleep(config.wsSendInterval);
        }
    });

    app.ws.use(wsRouter.routes()).use(wsRouter.allowedMethods());
    app.use(router.routes()).use(router.allowedMethods());

    app.listen(config.serverPort, config.serverIP);
})();
