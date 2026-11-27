import { type ConfigKey, config, sleep, wLogger } from '@tosu/common';
import type { AbstractInstance } from 'tosu/instances';
import type { InstanceManager } from 'tosu/instances/manager';
import { WebSocket, WebSocketServer } from 'ws';

import { getUniqueID } from './hashing';

const MAX_BUFFERED_AMOUNT = 512 * 1024; // 512 KB per client

type Filter = string | { field: string; keys: Filter[] };

export interface ModifiedWebsocket extends WebSocket {
    id: string;
    pathname: string;
    query: Record<string, string>;

    filters: Filter[];

    hostAddress: string;
    localAddress: string;
    originAddress: string;
    remoteAddress: string;
}

type StateFunctionKey<T> = {
    [K in keyof T]: T[K] extends (instanceManager: InstanceManager) => unknown
        ? K
        : never;
}[keyof T];

export class Websocket {
    private instanceManager: InstanceManager;
    private onMessageCallback: (
        data: string,
        socket: ModifiedWebsocket,
        ws: Websocket
    ) => void;

    private onConnectionCallback: (id: string, url: string | undefined) => void;

    socket: WebSocketServer;
    clients = new Map<string, ModifiedWebsocket>();

    constructor({
        instanceManager,
        pollRateFieldName,
        stateFunctionName,
        onMessageCallback,
        onConnectionCallback
    }: {
        instanceManager: InstanceManager;
        pollRateFieldName: ConfigKey | '';
        stateFunctionName: StateFunctionKey<AbstractInstance> | '';
        onMessageCallback?: (
            data: string,
            socket: ModifiedWebsocket,
            ws: Websocket
        ) => void;
        onConnectionCallback?: (id: string, url: string | undefined) => void;
    }) {
        this.socket = new WebSocketServer({ noServer: true });
        this.socket.on('error', (err) => {
            wLogger.error('WebSocket server error:', err.message);
            wLogger.debug('WebSocket server error details:', err);
        });

        this.instanceManager = instanceManager;

        if (typeof onMessageCallback === 'function') {
            this.onMessageCallback = onMessageCallback;
        }
        if (typeof onConnectionCallback === 'function') {
            this.onConnectionCallback = onConnectionCallback;
        }

        this.handle = this.handle.bind(this);
        this.start = this.start.bind(this);

        this.handle(pollRateFieldName, stateFunctionName);
    }

    handle(
        pollRateFieldName: ConfigKey | '',
        stateFunctionName: StateFunctionKey<AbstractInstance> | ''
    ) {
        this.socket.on('connection', (ws: ModifiedWebsocket, request) => {
            ws.id = getUniqueID();

            ws.pathname = request.url as any;

            ws.query = (request as any).query;

            ws.hostAddress = request.headers.host || '';
            ws.localAddress = `${request.socket.localAddress}:${request.socket.localPort}`;
            ws.originAddress = request.headers.origin || '';
            ws.remoteAddress = `${request.socket.remoteAddress}:${request.socket.remotePort}`;

            wLogger.debug(`WebSocket client connected: %${ws.id}%`);

            ws.on('close', (reason, description) => {
                this.clients.delete(ws.id);

                wLogger.debug(
                    `WebSocket client disconnected: %${ws.id}%`,
                    reason,
                    description
                );
            });

            ws.on('error', (reason: unknown, description: unknown) => {
                this.clients.delete(ws.id);

                wLogger.debug(
                    `WebSocket client error: %${ws.id}%`,
                    reason,
                    description
                );
            });

            if (typeof this.onMessageCallback === 'function') {
                ws.on('message', (data) => {
                    this.onMessageCallback(data.toString(), ws, this);
                });
            }

            this.clients.set(ws.id, ws);
            if (typeof this.onConnectionCallback === 'function') {
                this.onConnectionCallback(ws.id, request.url);
            }
        });

        // resend commands internally "this.socket.emit"
        this.socket.on(
            'message',
            (
                id: string,
                command: string,
                overlayName: string,
                payload?: string
            ) => {
                this.clients.forEach((client) => {
                    if (client.id === id) return;

                    // skip sending settings to wrong overlay
                    if (
                        (command === 'getSettings' ||
                            command === 'updateSettings') &&
                        overlayName !== decodeURI(client.query.l || '')
                    )
                        return;

                    client.emit(
                        'message',
                        [command, overlayName, payload].join(':')
                    );
                });
            }
        );

        if (pollRateFieldName && stateFunctionName !== '') {
            this.start(pollRateFieldName, stateFunctionName);
        }
    }

    async start(
        pollRateFieldName: ConfigKey,
        stateFunctionName: StateFunctionKey<AbstractInstance>
    ) {
        while (true) {
            try {
                const osuInstance = this.instanceManager.getInstance(
                    this.instanceManager.focusedClient
                );
                if (!osuInstance || this.clients.size === 0) {
                    await sleep(500);
                    continue;
                }

                let hasReadyClient = false;
                for (const client of this.clients.values()) {
                    if (
                        client.readyState === WebSocket.OPEN &&
                        client.bufferedAmount <= MAX_BUFFERED_AMOUNT
                    ) {
                        hasReadyClient = true;
                        break;
                    }
                }

                if (!hasReadyClient) {
                    await sleep(config[pollRateFieldName] as number);
                    continue;
                }

                const buildedData = osuInstance[stateFunctionName](
                    this.instanceManager
                );

                let message: string | null = null;

                this.clients.forEach((client) => {
                    if (
                        client.readyState !== WebSocket.OPEN ||
                        client.bufferedAmount > MAX_BUFFERED_AMOUNT
                    ) {
                        return;
                    }

                    if (
                        Array.isArray(client.filters) &&
                        client.filters.length > 0
                    ) {
                        const values = {};
                        this.applyFilter(client.filters, buildedData, values);

                        client.send(JSON.stringify(values));
                        return;
                    }

                    if (message === null) {
                        message = JSON.stringify(buildedData);
                    }

                    client.send(message);
                });
            } catch (error) {
                wLogger.error(
                    'WebSocket data loop failed:',
                    (error as any).message
                );
                wLogger.debug('WebSocket loop error details:', error);
            }

            await sleep(config[pollRateFieldName] as number);
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
