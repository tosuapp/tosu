import { type GlobalConfig, config, wLogger } from '@tosu/common';
import type { InstanceManager } from 'tosu/instances/manager';

import buildAssetsApi from './router/assets';
import buildBaseApi from './router/index';
import buildOverlaysApi from './router/overlays';
import buildSCApi from './router/scApi';
import buildSocket from './router/socket';
import buildV1Api from './router/v1';
import buildV2Api from './router/v2';
import { isRequestAllowed } from './utils';
import { handleSocketCommands } from './utils/commands';
import { HttpServer } from './utils/http';
import { WebSocketChannel } from './utils/socket';
import { Task, type TaskHandle } from './utils/task';

type WebSocketChannelName = 'v1' | 'v2' | 'v2Precise' | 'sc' | 'commands';

export function registerMiddlewares(
    app: HttpServer,
    instanceManager: InstanceManager
) {
    app.use((req, _, next) => {
        req.instanceManager = instanceManager;
        next();
    });

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
        res.setHeader('Access-Control-Allow-Private-Network', 'true');
        next();
    });

    app.use((req, res, next) => {
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
}

export class Server {
    instanceManager: InstanceManager;
    app = new HttpServer();

    sockets: Record<WebSocketChannelName, WebSocketChannel>;
    private tasks: TaskHandle[] = [];

    constructor({ instanceManager }: { instanceManager: InstanceManager }) {
        this.instanceManager = instanceManager;

        registerMiddlewares(this.app, this.instanceManager);
    }

    start() {
        this.sockets = {
            v1: new WebSocketChannel({ onMessage: handleSocketCommands }),
            sc: new WebSocketChannel({ onMessage: handleSocketCommands }),
            v2: new WebSocketChannel({ onMessage: handleSocketCommands }),
            v2Precise: new WebSocketChannel({
                onMessage: handleSocketCommands
            }),
            commands: new WebSocketChannel({ onMessage: handleSocketCommands })
        };

        buildAssetsApi(this);
        buildV1Api(this.app);
        buildSCApi(this.app);
        buildV2Api(this.app);
        buildOverlaysApi(this.app);

        buildSocket(this);
        buildBaseApi(this);

        this.app.listen(config.serverPort, config.serverIP);
        this.startTasks();
    }

    private startTasks() {
        this.stopTasks();

        const v1 = Task.recur(
            () => config.pollRate,
            () => {
                const socket = this.sockets.v1;

                if (socket.connections.size > 0) {
                    const state = this.instanceManager.getState();
                    socket.broadcast(state);
                }
            }
        );

        const sc = Task.recur(
            () => config.pollRate,
            () => {
                const socket = this.sockets.sc;

                if (socket.connections.size > 0) {
                    const state = this.instanceManager.getStateSC();
                    socket.broadcast(state);
                }
            }
        );

        const v2 = Task.recur(
            () => config.pollRate,
            () => {
                const socket = this.sockets.v2;

                if (socket.connections.size > 0) {
                    const state = this.instanceManager.getStateV2();
                    socket.broadcast(state);
                }
            }
        );

        const v2p = Task.recur(
            () => config.preciseDataPollRate,
            () => {
                const socket = this.sockets.v2Precise;

                if (socket.connections.size > 0) {
                    const state = this.instanceManager.getPreciseData();
                    socket.broadcast(state);
                }
            }
        );

        this.tasks = [v1, sc, v2, v2p];
    }

    private stopTasks() {
        for (const task of this.tasks) {
            task.stop();
        }
        this.tasks = [];
    }

    async restart() {
        this.stopTasks();
        await new Promise<void>((resolve, reject) => {
            this.app.server.close((err) => (err ? reject(err) : resolve()));
        });

        this.app.listen(config.serverPort, config.serverIP);
        this.startTasks();
    }

    handleConfigUpdate(oldConfig: GlobalConfig) {
        try {
            const ipChanged = oldConfig.serverIP !== config.serverIP;
            const portChanged = oldConfig.serverPort !== config.serverPort;

            if (ipChanged || portChanged) {
                this.restart().catch((exc) => {
                    wLogger.error(
                        'Failed to restart server after config update:',
                        (exc as Error).message
                    );
                });
            }
        } catch (exc) {
            wLogger.error(
                'Failed to handle server config update:',
                (exc as Error).message
            );
            wLogger.debug('Server config update error details:', exc);
        }
    }
}

export * from './utils/http';
export * from './utils/socket';
export * from './utils/task';
export * from './utils/index';
