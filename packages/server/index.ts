import { type GlobalConfig, config, wLogger } from '@tosu/common';
import type { InstanceManager } from 'tosu/instances/manager';

import buildAssetsApi from './router/assets';
import buildBaseApi from './router/index';
import buildSCApi from './router/scApi';
import buildSocket from './router/socket';
import buildV1Api from './router/v1';
import buildV2Api from './router/v2';
import { handleSocketCommands } from './utils/commands';
import { HttpServer } from './utils/http';
import { Websocket, createWebsocketHandler } from './utils/socket';

export class Server {
    instanceManager: InstanceManager;
    app: HttpServer;

    WS_V1: Websocket;
    WS_SC: Websocket;
    WS_V2: Websocket;
    WS_V2_PRECISE: Websocket;
    WS_COMMANDS: Websocket;

    private restarting: Promise<void> | null = null;

    constructor({ instanceManager }: { instanceManager: InstanceManager }) {
        this.instanceManager = instanceManager;

        const getServer = () => this.app.server;
        const common = {
            instanceManager,
            onMessageCallback: handleSocketCommands,
            getServer
        };

        this.WS_V1 = new Websocket({
            ...common,
            endpoint: 'v1',
            pollRateFieldName: 'pollRate',
            stateFunctionName: 'getState'
        });
        this.WS_SC = new Websocket({
            ...common,
            endpoint: 'sc',
            pollRateFieldName: 'pollRate',
            stateFunctionName: 'getStateSC'
        });
        this.WS_V2 = new Websocket({
            ...common,
            endpoint: 'v2',
            pollRateFieldName: 'pollRate',
            stateFunctionName: 'getStateV2'
        });
        this.WS_V2_PRECISE = new Websocket({
            ...common,
            endpoint: 'v2precise',
            pollRateFieldName: 'preciseDataPollRate',
            stateFunctionName: 'getPreciseData'
        });
        this.WS_COMMANDS = new Websocket({
            ...common,
            endpoint: 'commands',
            pollRateFieldName: '',
            stateFunctionName: ''
        });

        this.app = new HttpServer({
            instanceManager,
            websocket: createWebsocketHandler({
                v1: this.WS_V1,
                sc: this.WS_SC,
                v2: this.WS_V2,
                v2precise: this.WS_V2_PRECISE,
                commands: this.WS_COMMANDS
            })
        });
    }

    start() {
        buildAssetsApi(this.app);
        buildV1Api(this.app);
        buildSCApi(this.app);

        buildV2Api(this.app);

        buildSocket(this.app);

        buildBaseApi(this);

        this.app.listen(config.serverPort, config.serverIP);
    }

    /**
     * Chains onto any in-flight restart so two config updates cannot
     * interleave `stop`/`listen` on the same underlying Bun server.
     */
    restart(): Promise<void> {
        const previous = this.restarting ?? Promise.resolve();
        const next = previous.catch(() => {}).then(() => this.doRestart());
        this.restarting = next;
        return next;
    }

    private async doRestart() {
        await this.app.stop();
        this.app.listen(config.serverPort, config.serverIP);
    }

    handleConfigUpdate(oldConfig: GlobalConfig) {
        try {
            const ipChanged = oldConfig.serverIP !== config.serverIP;
            const portChanged = oldConfig.serverPort !== config.serverPort;

            if (ipChanged || portChanged) {
                this.restart().catch((exc) => {
                    wLogger.error(
                        'Failed to restart server:',
                        (exc as any).message
                    );
                    wLogger.debug('Server restart error details:', exc);
                });
            }
        } catch (exc) {
            wLogger.error(
                'Failed to handle server config update:',
                (exc as any).message
            );
            wLogger.debug('Server config update error details:', exc);
        }
    }
}

export * from './utils/http';
export * from './utils/socket';
export * from './utils/index';
