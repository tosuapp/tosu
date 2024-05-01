import { config, wLogger } from '@tosu/common';
import WebSocket from 'ws';

import { getUniqueID } from './hashing';

export interface ModifiedWebsocket extends WebSocket {
    id: string;
    query: { [key: string]: any };
    hostAddress: string;
    localAddress: string;
    originAddress: string;
    remoteAddress: string;
}

export class Websocket {
    private instanceManager: any;
    private pollRateFieldName: string;
    private stateFunctionName: string;
    private onMessageCallback: (
        data: string,
        socket: ModifiedWebsocket
    ) => void;

    loopInterval: NodeJS.Timeout;

    socket: WebSocket.Server;
    clients = new Map<string, ModifiedWebsocket>();

    constructor({
        instanceManager,
        pollRateFieldName,
        stateFunctionName,
        onMessageCallback
    }: {
        instanceManager: any;
        pollRateFieldName: string;
        stateFunctionName:
            | 'getState'
            | 'getStateV2'
            | 'getPreciseData'
            | string;
        onMessageCallback?: (data: string, socket: ModifiedWebsocket) => void;
    }) {
        this.socket = new WebSocket.Server({ noServer: true });

        this.instanceManager = instanceManager;
        this.pollRateFieldName = pollRateFieldName;
        this.stateFunctionName = stateFunctionName;

        if (typeof onMessageCallback === 'function') {
            this.onMessageCallback = onMessageCallback;
        }

        this.handle = this.handle.bind(this);
        this.startLoop = this.startLoop.bind(this);
        this.stopLoop = this.stopLoop.bind(this);

        this.handle();
    }

    handle() {
        this.socket.on('connection', (ws: ModifiedWebsocket, request) => {
            ws.id = getUniqueID();

            ws.query = (request as any).query;

            ws.hostAddress = request.headers.host || '';
            ws.localAddress = `${request.socket.localAddress}:${request.socket.localPort}`;
            ws.originAddress = request.headers.origin || '';
            ws.remoteAddress = `${request.socket.remoteAddress}:${request.socket.remotePort}`;

            wLogger.debug(`WS(CONNECTED) >>> ${ws.id}`);

            ws.on('close', (reason, description) => {
                this.clients.delete(ws.id);

                wLogger.debug(
                    `WS(CLOSED) >>> ${ws.id}: ${reason} [${description}]`
                );
            });

            ws.on('error', (reason, description) => {
                this.clients.delete(ws.id);

                wLogger.debug(
                    `WS(ERROR) >>> ${ws.id}: ${reason} [${description}]`
                );
            });

            if (typeof this.onMessageCallback === 'function') {
                ws.on('message', (data) => {
                    this.onMessageCallback(data.toString(), ws);
                });
            }

            this.clients.set(ws.id, ws);
        });

        if (this.pollRateFieldName !== '') {
            this.startLoop();
        }
    }

    startLoop() {
        this.loopInterval = setInterval(() => {
            try {
                const osuInstance: any = this.instanceManager.getInstance();
                if (!osuInstance || this.clients.size === 0) {
                    return; // Exit the loop if conditions are not met
                }

                const message = JSON.stringify(
                    osuInstance[this.stateFunctionName](this.instanceManager)
                );

                this.clients.forEach((client) => client.send(message));
            } catch (error) {
                wLogger.error((error as any).message);
                wLogger.debug(error);
            }
        }, config[this.pollRateFieldName]);
    }

    stopLoop() {
        clearInterval(this.loopInterval);
    }
}
