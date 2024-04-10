import { config } from '@tosu/common';

import buildBaseApi from './router/index';
import buildV1Api from './router/v1';
import buildV2Api from './router/v2';
import { HttpServer } from './utils/http';
import { Websocket } from './utils/socket';

export class Server {
    instanceManager: any;
    app = new HttpServer();

    WS_V1: Websocket;
    WS_V2: Websocket;
    WS_V2_PRECISE: Websocket;

    constructor({ instanceManager }: { instanceManager: any }) {
        this.instanceManager = instanceManager;

        this.middlrewares();
    }

    start() {
        this.WS_V1 = new Websocket({
            instanceManager: this.instanceManager,
            pollRateFieldName: 'pollRate',
            stateFunctionName: 'getState'
        });
        this.WS_V2 = new Websocket({
            instanceManager: this.instanceManager,
            pollRateFieldName: 'pollRate',
            stateFunctionName: 'getStateV2'
        });
        this.WS_V2_PRECISE = new Websocket({
            instanceManager: this.instanceManager,
            pollRateFieldName: 'preciseDataPollRate',
            stateFunctionName: 'getPreciseData'
        });

        buildBaseApi(this);
        buildV1Api({
            app: this.app,
            websocket: this.WS_V1
        });
        buildV2Api({
            app: this.app,
            websocket: this.WS_V2,
            preciseWebsocket: this.WS_V2_PRECISE
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

    middlrewares() {
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
