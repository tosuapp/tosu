import { HttpServer } from '@tosu/server';

import { InstanceManager } from '@/objects/instanceManager/instanceManager';

export const httpMiddleware = ({
    app,
    instanceManager
}: {
    app: HttpServer;
    instanceManager: InstanceManager;
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
};
