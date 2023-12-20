import fastifyStatic from '@fastify/static';
import fastifyWebsocket from '@fastify/websocket';
import { fastify } from 'fastify';
import { readdir } from 'node:fs/promises';
import path from 'path';

import { buildV1Router } from '@/api/router/gosu/v1';
import { config } from '@/config';
import { OVERLAYS_STATIC } from '@/constants/overlaysStatic';
import { InstanceManager } from '@/objects/instanceManager/instanceManager';

export const buildFastifyApp = async (instanceManager: InstanceManager) => {
    const app = fastify({
        logger: false
    });

    // register websocket plugin
    await app.register(fastifyWebsocket);

    // apply instanceManager to request
    app.addHook('onRequest', async (req) => {
        req.instanceManager = instanceManager;
    });
    // apply cors rules to request
    app.addHook('onRequest', async (_, reply) => {
        reply.header('Access-Control-Allow-Origin', '*');
        reply.header(
            'Access-Control-Allow-Headers',
            'Origin, X-Requested-With, Content-Type, Accept'
        );
        reply.header(
            'Access-Control-Allow-Methods',
            'POST, GET, PUT, DELETE, OPTIONS'
        );
    });

    // ---- REGISTERING STATIC ----
    app.register(fastifyStatic, {
        root: path.join(process.cwd(), 'static'),
        prefix: '/' // optional: default '/'
    });
    const staticReply = (_, reply) => {
        reply.header('content-type', 'html');
        reply.send(OVERLAYS_STATIC);
    };
    app.get('/', staticReply);
    app.get('/api/getOverlays', async (_, reply) => {
        reply.send(await readdir(config.staticFolderPath));
    });

    buildV1Router(app);

    return app;
};
