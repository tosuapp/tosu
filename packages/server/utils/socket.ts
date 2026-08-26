import { type ConfigKey, config, sleep, wLogger } from '@tosu/common';
import type {
    Server as BunServer,
    ServerWebSocket,
    WebSocketHandler
} from 'bun';
import type { AbstractInstance } from 'tosu/instances';
import type { InstanceManager } from 'tosu/instances/manager';

import { type Filter, applyFilter } from './filters';
import type { WsData, WsEndpoint } from './ws-types';

export type { WsData, WsEndpoint } from './ws-types';

export type TosuSocket = ServerWebSocket<WsData>;

type StateFunctionKey<T> = {
    [K in keyof T]: T[K] extends (instanceManager: InstanceManager) => unknown
        ? K
        : never;
}[keyof T];

export type MessageCallback = (
    data: string,
    socket: TosuSocket,
    ws: Websocket
) => void;

export class Websocket {
    readonly endpoint: WsEndpoint;
    readonly topic: string;
    clients = new Map<string, TosuSocket>();

    private instanceManager: InstanceManager;
    private getServer: () => BunServer<WsData> | null;
    private onMessageCallback?: MessageCallback;
    private onConnectionCallback?: (id: string, url: string) => void;

    constructor({
        endpoint,
        instanceManager,
        pollRateFieldName,
        stateFunctionName,
        onMessageCallback,
        onConnectionCallback,
        getServer
    }: {
        endpoint: WsEndpoint;
        instanceManager: InstanceManager;
        pollRateFieldName: ConfigKey | '';
        stateFunctionName: StateFunctionKey<AbstractInstance> | '';
        onMessageCallback?: MessageCallback;
        onConnectionCallback?: (id: string, url: string) => void;
        getServer: () => BunServer<WsData> | null;
    }) {
        this.endpoint = endpoint;
        this.topic = `tosu:${endpoint}`;
        this.instanceManager = instanceManager;
        this.getServer = getServer;
        this.onMessageCallback = onMessageCallback;
        this.onConnectionCallback = onConnectionCallback;

        if (pollRateFieldName && stateFunctionName !== '') {
            this.start(pollRateFieldName, stateFunctionName);
        }
    }

    open(ws: TosuSocket) {
        this.clients.set(ws.data.id, ws);
        ws.subscribe(this.topic);

        wLogger.debug(`WebSocket client connected: %${ws.data.id}%`);

        this.onConnectionCallback?.(ws.data.id, ws.data.pathname);
    }

    message(ws: TosuSocket, data: string | Buffer) {
        this.onMessageCallback?.(data.toString(), ws, this);
    }

    close(ws: TosuSocket, code: number, reason: string) {
        this.clients.delete(ws.data.id);

        wLogger.debug(
            `WebSocket client disconnected: %${ws.data.id}%`,
            code,
            reason
        );
    }

    /** Filtered clients leave the broadcast topic and receive individual payloads. */
    setFilters(ws: TosuSocket, filters: Filter[]) {
        ws.data.filters = filters;

        if (filters.length > 0) ws.unsubscribe(this.topic);
        else ws.subscribe(this.topic);
    }

    /**
     * Re-runs a command for every other client as if that client had sent it.
     * `getSettings`/`updateSettings` only reach the overlay they are addressed to.
     */
    redispatch(
        fromId: string,
        command: string,
        overlayName: string,
        payload?: string
    ) {
        if (!this.onMessageCallback) return;

        for (const client of this.clients.values()) {
            if (client.data.id === fromId) continue;

            if (
                (command === 'getSettings' || command === 'updateSettings') &&
                overlayName !== decodeURI(client.data.query.l || '')
            )
                continue;

            this.onMessageCallback(
                [command, overlayName, payload].join(':'),
                client,
                this
            );
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

                const buildedData = osuInstance[stateFunctionName](
                    this.instanceManager
                );

                let broadcast: string | null = null;
                for (const client of this.clients.values()) {
                    if (client.data.filters.length > 0) {
                        const values = {};
                        applyFilter(client.data.filters, buildedData, values);

                        client.send(JSON.stringify(values));
                        continue;
                    }

                    broadcast ??= JSON.stringify(buildedData);
                }

                if (broadcast !== null) {
                    this.getServer()?.publish(this.topic, broadcast);
                }
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
}

/** Single Bun.serve websocket handler that dispatches by endpoint. */
export function createWebsocketHandler(
    endpoints: Record<WsEndpoint, Websocket>
): WebSocketHandler<WsData> {
    return {
        // Bun's current defaults, spelled out on purpose: overlays hold an
        // idle socket open for as long as the dashboard is on screen, and a
        // shorter idle timeout (or pings turned off) would drop them into a
        // reconnect loop.
        idleTimeout: 120,
        sendPings: true,
        open: (ws) => endpoints[ws.data.endpoint].open(ws),
        message: (ws, message) =>
            endpoints[ws.data.endpoint].message(ws, message),
        close: (ws, code, reason) =>
            endpoints[ws.data.endpoint].close(ws, code, reason)
    };
}
