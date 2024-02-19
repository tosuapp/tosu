import { config } from '@tosu/common';

import buildBaseApi from './router/index';
import buildV1Api from './router/v1';
import buildV2Api from './router/v2';
import { HttpServer } from './utils/http';
import { Websocket } from './utils/socket';

export class Server {
    instanceManager: any;
    app = new HttpServer();

    constructor({ instanceManager }: { instanceManager: any }) {
        this.instanceManager = instanceManager;

        this.middlrewares();
    }

    start() {
        const WS_V1 = new Websocket({
            instanceManager: this.instanceManager,
            pollRateFieldName: 'pollRate',
            stateFunctionName: 'getState'
        });
        const WS_V2 = new Websocket({
            instanceManager: this.instanceManager,
            pollRateFieldName: 'pollRate',
            stateFunctionName: 'getStateV2'
        });
        const WS_V2_KEYS = new Websocket({
            instanceManager: this.instanceManager,
            pollRateFieldName: 'keyOverlayPollRate',
            stateFunctionName: 'getKeyOverlay'
        });

        buildBaseApi(this.app);
        buildV1Api({
            app: this.app,
            websocket: WS_V1
        });
        buildV2Api({
            app: this.app,
            websocket: WS_V2,
            keysWebsocket: WS_V2_KEYS
        });

        this.app.listen(config.serverPort, config.serverIP);
    }

    restart() {
        this.app.server.close();
        this.app.listen(config.serverPort, config.serverIP);
    }

    middlrewares() {
        const that = this;

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
            req.instanceManager = that.instanceManager;
            next();
        });
    }
}

export * from './utils/http';
export * from './utils/socket';
export * from './utils/index';
