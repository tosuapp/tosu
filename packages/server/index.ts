import { type GlobalConfig, config, wLogger } from '@tosu/common';
import type { InstanceManager } from 'tosu/instances/manager';

import buildAssetsApi from './router/assets';
import buildBaseApi from './router/index';
import buildOverlaysApi from './router/overlays';
import buildSCApi from './router/scApi';
import buildSocket from './router/socket';
import buildV1Api from './router/v1';
import buildV2Api from './router/v2';
import { handleSocketCommands } from './utils/commands';
import { HttpServer } from './utils/http';
import { isRequestAllowed } from './utils/index';
import { Websocket } from './utils/socket';

export class Server {
    instanceManager: InstanceManager;
    app = new HttpServer();

    sockets: Record<string, Websocket> = {};

    constructor({ instanceManager }: { instanceManager: InstanceManager }) {
        this.instanceManager = instanceManager;

        this.middlewares();
    }

    start() {
        this.sockets = {
            v1: new Websocket({
                instanceManager: this.instanceManager,
                pollRateFieldName: 'pollRate',
                stateFunctionName: 'getState',
                onMessageCallback: handleSocketCommands
            }),
            sc: new Websocket({
                instanceManager: this.instanceManager,
                pollRateFieldName: 'pollRate',
                stateFunctionName: 'getStateSC',
                onMessageCallback: handleSocketCommands
            }),
            v2: new Websocket({
                instanceManager: this.instanceManager,
                pollRateFieldName: 'pollRate',
                stateFunctionName: 'getStateV2',
                onMessageCallback: handleSocketCommands
            }),
            v2Precise: new Websocket({
                instanceManager: this.instanceManager,
                pollRateFieldName: 'preciseDataPollRate',
                stateFunctionName: 'getPreciseData',
                onMessageCallback: handleSocketCommands
            }),
            commands: new Websocket({
                instanceManager: this.instanceManager,
                pollRateFieldName: '',
                stateFunctionName: '',
                onMessageCallback: handleSocketCommands
            })
        };

        buildAssetsApi(this);
        buildV1Api(this.app);
        buildSCApi(this.app);

        buildV2Api(this.app);
        buildOverlaysApi(this.app);

        buildSocket(this);

        buildBaseApi(this);

        this.app.listen(config.serverPort, config.serverIP);
    }

    restart() {
        this.app.server.close();
        this.app.listen(config.serverPort, config.serverIP);
    }

    handleConfigUpdate(oldConfig: GlobalConfig) {
        try {
            const ipChanged = oldConfig.serverIP !== config.serverIP;
            const portChanged = oldConfig.serverPort !== config.serverPort;

            if (ipChanged || portChanged) {
                this.restart();
            }
        } catch (exc) {
            wLogger.error(
                'Failed to handle server config update:',
                (exc as any).message
            );
            wLogger.debug('Server config update error details:', exc);
        }
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
            res.setHeader('Access-Control-Allow-Private-Network', 'true');
            next();
        });

        this.app.use((req, res, next) => {
            const allowed = isRequestAllowed(req);
            if (allowed) {
                return next();
            }

            wLogger.warn(`Blocked unauthorized request to %${req.url}%`, {
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
