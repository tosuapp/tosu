import { config, wLogger } from '@tosu/common';
import WebSocket from 'ws';

import { getUniqueID } from './hashing';

type Filter = string | { field: string; keys: Filter[] };

export interface ModifiedWebsocket extends WebSocket {
    id: string;
    pathname: string;
    query: { [key: string]: any };

    filters: Filter[];

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

            ws.pathname = request.url as any;

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

        // resend commands internally "this.socket.emit"
        this.socket.on('message', (data) => {
            this.clients.forEach((client) => client.emit('message', data));
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

                const buildedData = osuInstance[this.stateFunctionName](
                    this.instanceManager
                );
                const message = JSON.stringify(buildedData);

                this.clients.forEach((client) => {
                    if (
                        Array.isArray(client.filters) &&
                        client.filters.length > 0
                    ) {
                        const values = {};
                        this.applyFilter(client.filters, buildedData, values);

                        client.send(JSON.stringify(values));
                        return;
                    }

                    client.send(message);
                });
            } catch (error) {
                wLogger.error((error as any).message);
                wLogger.debug(error);
            }
        }, config[this.pollRateFieldName]);
    }

    stopLoop() {
        clearInterval(this.loopInterval);
    }

    applyFilter(filters: Filter[], data: any, value: any) {
        if (data === null || data === undefined) return;

        for (let i = 0; i < filters.length; i++) {
            const filter = filters[i];
            switch (typeof filter) {
                case 'string':
                    value[filter] = data[filter];
                    break;

                case 'object': {
                    if (!(filter.field && Array.isArray(filter.keys))) break;
                    if (
                        data[filter.field] === null ||
                        data[filter.field] === undefined
                    )
                        break;

                    value[filter.field] = {};
                    this.applyFilter(
                        filter.keys,
                        data[filter.field],
                        value[filter.field]
                    );
                }
            }
        }
    }
}
