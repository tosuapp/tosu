import { wLogger } from '@tosu/common';
import { randomUUID } from 'node:crypto';
import type { IncomingMessage } from 'node:http';
import { WebSocket, WebSocketServer } from 'ws';

export type Filter = string | { field: string; keys: Filter[] };

export interface WsConnection {
    id: string;
    socket: WebSocket;
    overlayName: string | null;
    filters: Filter[];
}

export interface ChannelOptions {
    onMessage?: (
        data: string,
        conn: WsConnection,
        channel: WebSocketChannel
    ) => void;
}

const pendingTokens = new Map<
    string,
    { overlayName: string; expiresAt: number }
>();

export function createOverlayToken(overlayName: string): string {
    const token = randomUUID();

    pendingTokens.set(token, {
        overlayName,
        expiresAt: Date.now() + 60000
    });

    return token;
}

export function redeemOverlayToken(token: string): string | null {
    if (!token) return null;

    const entry = pendingTokens.get(token);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
        pendingTokens.delete(token);
        return null;
    }

    return entry.overlayName;
}

export function extractOverlayName(request: IncomingMessage): string | null {
    try {
        const hostHeader = request.headers.host || 'localhost';
        const parsedURL = new URL(request.url || '/', `http://${hostHeader}`);

        const tokenParam =
            parsedURL.searchParams.get('token') ||
            parsedURL.searchParams.get('tosu_token');
        if (tokenParam) {
            const redeemed = redeemOverlayToken(tokenParam);
            if (redeemed) return redeemed;
        }

        const queryOverlay =
            parsedURL.searchParams.get('l') ||
            parsedURL.searchParams.get('overlay');
        if (queryOverlay) {
            return decodeURIComponent(queryOverlay);
        }
    } catch {}

    return null;
}

export function getConnName(conn: WsConnection): string {
    return conn.overlayName
        ? `${conn.overlayName} (#${conn.id})`
        : `client (#${conn.id})`;
}

export class WebSocketChannel {
    public readonly server = new WebSocketServer({ noServer: true });
    public readonly connections = new Map<string, WsConnection>();

    private readonly onMessage?: (
        data: string,
        conn: WsConnection,
        channel: WebSocketChannel
    ) => void;

    constructor(options: ChannelOptions = {}) {
        this.onMessage = options.onMessage;

        this.server.on(
            'connection',
            (socket: WebSocket, request: IncomingMessage) => {
                const overlayName = extractOverlayName(request);

                const conn: WsConnection = {
                    id: randomUUID(),
                    socket,
                    overlayName,
                    filters: []
                };

                this.connections.set(conn.id, conn);
                wLogger.debug(
                    `WebSocket client connected: %${getConnName(conn)}%`
                );

                const cleanup = () => {
                    this.connections.delete(conn.id);
                    wLogger.debug(
                        `WebSocket client disconnected: %${getConnName(conn)}%`
                    );
                };

                socket.on('close', cleanup);
                socket.on('error', cleanup);

                if (this.onMessage) {
                    socket.on('message', (data) => {
                        this.onMessage!(data.toString(), conn, this);
                    });
                }
            }
        );
    }

    public dispatchCommand(
        senderId: string,
        command: string,
        overlayName: string,
        payload?: string
    ) {
        this.connections.forEach((conn) => {
            if (conn.id === senderId) return;

            if (
                (command === 'getSettings' || command === 'updateSettings') &&
                conn.overlayName &&
                overlayName !== conn.overlayName
            ) {
                return;
            }

            if (conn.socket.readyState === WebSocket.OPEN) {
                const message =
                    payload !== undefined
                        ? `${command}:${overlayName}:${payload}`
                        : `${command}:${overlayName}`;
                conn.socket.send(message);
            }
        });
    }

    public broadcast(data: unknown) {
        if (this.connections.size === 0) return;

        let cachedJson: string | null = null;

        this.connections.forEach((conn) => {
            if (conn.socket.readyState !== WebSocket.OPEN) return;

            if (Array.isArray(conn.filters) && conn.filters.length > 0) {
                const values: Record<string, unknown> = {};
                this.applyFilter(conn.filters, data, values);
                conn.socket.send(JSON.stringify(values));
            } else {
                if (cachedJson === null) {
                    cachedJson =
                        typeof data === 'string' ? data : JSON.stringify(data);
                }
                conn.socket.send(cachedJson);
            }
        });
    }

    private applyFilter(filters: Filter[], data: any, value: any) {
        if (!data) return;

        for (const filter of filters) {
            if (typeof filter === 'string') {
                value[filter] = data[filter];
            } else if (
                typeof filter === 'object' &&
                filter.field &&
                Array.isArray(filter.keys)
            ) {
                const fieldValue = data[filter.field];
                if (fieldValue !== null && fieldValue !== undefined) {
                    value[filter.field] = {};
                    this.applyFilter(
                        filter.keys,
                        fieldValue,
                        value[filter.field]
                    );
                }
            }
        }
    }
}
