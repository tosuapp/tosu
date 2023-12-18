import Fastify from 'fastify';
import { readdir } from 'node:fs/promises';
import path from 'path';

import { buildV1Router } from '@/api/router/gosu/v1';
import { config } from '@/config';
import { OVERLAYS_STATIC } from '@/constants/overlaysStatic';
import { InstanceManager } from '@/objects/instanceManager/instanceManager';

export const buildFastifyApp = async (instanceManager: InstanceManager) => {
    const app = Fastify({
        logger: false
    });

    // register websocket plugin
    await app.register(require('@fastify/websocket'));

    // apply instanceManager to request
    app.addHook('onRequest', async (req) => {
        req.instanceManager = instanceManager;
    });
    // apply cors rules to request
    app.addHook('onRequest', async (req, reply) => {
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
    app.register(require('@fastify/static'), {
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
