import { config, wLogger } from '@tosu/common';

import buildAssetsApi from './router/assets';
import buildBaseApi from './router/index';
import buildSCApi from './router/scApi';
import buildSocket from './router/socket';
import buildV1Api from './router/v1';
import buildV2Api from './router/v2';
import { handleSocketCommands } from './utils/commands';
import { HttpServer } from './utils/http';
import { isRequestAllowed } from './utils/index';
import { Websocket } from './utils/socket';

export class Server {
    instanceManager: any;
    app = new HttpServer();

    WS_V1: Websocket;
    WS_SC: Websocket;
    WS_V2: Websocket;
    WS_V2_PRECISE: Websocket;
    WS_COMMANDS: Websocket;

    constructor({ instanceManager }: { instanceManager: any }) {
        this.instanceManager = instanceManager;

        this.middlewares();
    }

    start() {
        this.WS_V1 = new Websocket({
            instanceManager: this.instanceManager,
            pollRateFieldName: 'pollRate',
            stateFunctionName: 'getState',
            onMessageCallback: handleSocketCommands
        });
        this.WS_SC = new Websocket({
            instanceManager: this.instanceManager,
            pollRateFieldName: 'pollRate',
            stateFunctionName: 'getStateSC',
            onMessageCallback: handleSocketCommands
        });

        this.WS_V2 = new Websocket({
            instanceManager: this.instanceManager,
            pollRateFieldName: 'pollRate',
            stateFunctionName: 'getStateV2',
            onMessageCallback: handleSocketCommands
        });
        this.WS_V2_PRECISE = new Websocket({
            instanceManager: this.instanceManager,
            pollRateFieldName: 'preciseDataPollRate',
            stateFunctionName: 'getPreciseData',
            onMessageCallback: handleSocketCommands
        });
        this.WS_COMMANDS = new Websocket({
            instanceManager: '',
            pollRateFieldName: '',
            stateFunctionName: '',
            onMessageCallback: handleSocketCommands
        });

        buildAssetsApi(this);
        buildV1Api(this.app);
        buildSCApi(this.app);

        buildV2Api(this.app);

        buildSocket({
            app: this.app,

            WS_V1: this.WS_V1,
            WS_SC: this.WS_SC,
            WS_V2: this.WS_V2,
            WS_V2_PRECISE: this.WS_V2_PRECISE,
            WS_COMMANDS: this.WS_COMMANDS
        });

        buildBaseApi(this);

        this.app.listen(config.serverPort, config.serverIP);
    }

    restart() {
        this.app.server.close();
        this.app.listen(config.serverPort, config.serverIP);
    }

    middlewares() {
        const instanceManager = this.instanceManager;

        this.app.use((_, res, next) => {
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

        this.app.use((req, res, next) => {
            const allowed = isRequestAllowed(req);
            if (allowed) {
                return next();
            }

            wLogger.warn('[request]', 'Unallowed request', req.url, {
                origin: req.headers.origin,
                referer: req.headers.referer
            });

            res.statusCode = 403;
            res.end('Not Found');
        });

        this.app.use((req, _, next) => {
            req.instanceManager = instanceManager;
            next();
        });
    }
}

export * from './utils/http';
export * from './utils/socket';
export * from './utils/index';
