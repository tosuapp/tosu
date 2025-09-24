import { ConfigKeys, config, sleep, wLogger } from '@tosu/common';
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
    private pollRateFieldName: ConfigKeys | '';
    private stateFunctionName: string;
    private onMessageCallback: (
        data: string,
        socket: ModifiedWebsocket
    ) => void;

    private onConnectionCallback: (id: string, url: string | undefined) => void;

    socket: WebSocket.Server;
    clients = new Map<string, ModifiedWebsocket>();

    constructor({
        instanceManager,
        pollRateFieldName,
        stateFunctionName,
        onMessageCallback,
        onConnectionCallback
    }: {
        instanceManager: any;
        pollRateFieldName: ConfigKeys | '';
        stateFunctionName:
            | 'getState'
            | 'getStateV2'
            | 'getPreciseData'
            | string;
        onMessageCallback?: (data: string, socket: ModifiedWebsocket) => void;
        onConnectionCallback?: (id: string, url: string | undefined) => void;
    }) {
        this.socket = new WebSocket.Server({ noServer: true });

        this.instanceManager = instanceManager;
        this.pollRateFieldName = pollRateFieldName;
        this.stateFunctionName = stateFunctionName;

        if (typeof onMessageCallback === 'function') {
            this.onMessageCallback = onMessageCallback;
        }
        if (typeof onConnectionCallback === 'function') {
            this.onConnectionCallback = onConnectionCallback;
        }

        this.handle = this.handle.bind(this);
        this.start = this.start.bind(this);

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

            wLogger.debug('[ws]', 'connected', ws.id);

            ws.on('close', (reason, description) => {
                this.clients.delete(ws.id);

                wLogger.debug('[ws]', 'closed', ws.id, reason, description);
            });

            ws.on('error', (reason: any, description: any) => {
                this.clients.delete(ws.id);

                wLogger.debug('[ws]', 'error', ws.id, reason, description);
            });

            if (typeof this.onMessageCallback === 'function') {
                ws.on('message', (data) => {
                    this.onMessageCallback(data.toString(), ws);
                });
            }

            this.clients.set(ws.id, ws);
            if (typeof this.onConnectionCallback === 'function') {
                this.onConnectionCallback(ws.id, request.url);
            }
        });

        // resend commands internally "this.socket.emit"
        this.socket.on('message', (data) => {
            this.clients.forEach((client) => {
                // skip sending settings to wrong overlay
                if (
                    data.startsWith('getSettings:') &&
                    !data.endsWith(encodeURI(client.query.l || ''))
                )
                    return;

                client.emit('message', data);
            });
        });

        if (this.pollRateFieldName) {
            this.start();
        }
    }

    async start() {
        while (true) {
            try {
                const osuInstance: any = this.instanceManager.getInstance(
                    this.instanceManager.focusedClient
                );
                if (!osuInstance || this.clients.size === 0) {
                    await sleep(500);
                    continue; // Exit the loop if conditions are not met
                }

                const buildedData = osuInstance[this.stateFunctionName](
                    this.instanceManager
                );
                let message = '';

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

                    if (!message) message = JSON.stringify(buildedData);
                    client.send(message);
                });
            } catch (error) {
                wLogger.error('[ws]', 'loop', (error as any).message);
                wLogger.debug('[ws]', 'loop', error);
            }

            if (this.pollRateFieldName)
                await sleep(config[this.pollRateFieldName] as number);
        }
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
