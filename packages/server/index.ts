import { config } from '@tosu/common';

import buildAssetsApi from './router/assets';
import buildBaseApi from './router/index';
import buildSocket from './router/socket';
import buildV1Api from './router/v1';
import buildV2Api from './router/v2';
import { handleSocketCommands } from './utils/commands';
import { HttpServer } from './utils/http';
import { Websocket } from './utils/socket';

export class Server {
    instanceManager: any;
    app = new HttpServer();

    WS_V1: Websocket;
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

        buildBaseApi(this);
        buildAssetsApi(this);
        buildV1Api(this.app);
        buildV2Api(this.app);

        buildSocket({
            app: this.app,

            WS_V1: this.WS_V1,
            WS_V2: this.WS_V2,
            WS_V2_PRECISE: this.WS_V2_PRECISE,
            WS_COMMANDS: this.WS_COMMANDS
        });

        this.app.listen(config.serverPort, config.serverIP);
    }

    restart() {
        this.app.server.close();
        this.app.listen(config.serverPort, config.serverIP);
    }

    restartWS() {
        if (this.WS_V1) this.WS_V1.stopLoop();
        if (this.WS_V2) this.WS_V2.stopLoop();
        if (this.WS_V2_PRECISE) this.WS_V2_PRECISE.stopLoop();

        if (this.WS_V1) this.WS_V1.startLoop();
        if (this.WS_V2) this.WS_V2.startLoop();
        if (this.WS_V2_PRECISE) this.WS_V2_PRECISE.startLoop();
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

        this.app.use((req, _, next) => {
            req.instanceManager = instanceManager;
            next();
        });
    }
}

export * from './utils/http';
export * from './utils/socket';
export * from './utils/index';
