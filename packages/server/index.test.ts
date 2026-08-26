import { config, context } from '@tosu/common';
import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { InstanceManager } from 'tosu/instances/manager';

import { Server } from './index';

const instanceManager = {
    focusedClient: 0,
    osuInstances: {},
    getInstance: () => undefined
} as unknown as InstanceManager;

let server: Server;
let base: string;
let staticFolder: string;

let previousStaticFolderPath: string;
let previousServerPort: number;
let previousServerIP: string;
let previousCurrentVersion: string;
let previousUpdateVersion: string;

beforeAll(() => {
    previousStaticFolderPath = config.staticFolderPath;
    previousServerPort = config.serverPort;
    previousServerIP = config.serverIP;
    previousCurrentVersion = context.currentVersion;
    previousUpdateVersion = context.updateVersion;

    staticFolder = fs.mkdtempSync(path.join(os.tmpdir(), 'tosu-static-'));
    config.staticFolderPath = staticFolder;
    config.serverIP = '127.0.0.1';
    config.serverPort = 0;
    config.openDashboardOnStartup = false;
    context.currentVersion = '4.26.0';
    context.updateVersion = '4.26.0';

    server = new Server({ instanceManager });
    server.start();

    expect(server.app.server).not.toBeNull();
    base = `http://127.0.0.1:${server.app.server!.port}`;
});

afterAll(async () => {
    await server.app.stop();
    fs.rmSync(staticFolder, { recursive: true, force: true });

    config.staticFolderPath = previousStaticFolderPath;
    config.serverPort = previousServerPort;
    config.serverIP = previousServerIP;
    context.currentVersion = previousCurrentVersion;
    context.updateVersion = previousUpdateVersion;
});

describe('Server', () => {
    test('/json without a running osu! is a 500 JSON error', async () => {
        const res = await fetch(`${base}/json`);

        expect(res.status).toBe(500);
        expect(await res.json()).toEqual({ error: 'osu is not ready/running' });
    });

    test('/favicon.ico is served from the embedded assets', async () => {
        const res = await fetch(`${base}/favicon.ico`);

        expect(res.status).toBe(200);
        expect(res.headers.get('content-type')).toBe(
            'image/vnd.microsoft.icon; charset=utf-8'
        );
        expect(res.headers.get('access-control-allow-origin')).toBe('*');
    });

    test('/assets/* serves dashboard files', async () => {
        const res = await fetch(`${base}/assets/homepage.js`);

        expect(res.status).toBe(200);
        expect(res.headers.get('content-type')).toBe(
            'text/javascript; charset=utf-8'
        );
    });

    test('/ renders the homepage with the counters list', async () => {
        const res = await fetch(`${base}/`);
        const body = await res.text();

        expect(res.status).toBe(200);
        expect(body).not.toContain('{{LIST}}');
        expect(body).toContain('<html');
    });

    test('/api/ingame injects window.COUNTERS', async () => {
        const res = await fetch(`${base}/api/ingame`);

        expect(res.status).toBe(200);
        expect(await res.text()).toContain('window.COUNTERS = [');
    });

    test('/.well-known/* is 404', async () => {
        const res = await fetch(`${base}/.well-known/anything`);

        expect(res.status).toBe(404);
    });

    test('websocket upgrade works through the full server', async () => {
        const ws = await new Promise<WebSocket>((resolve, reject) => {
            const socket = new WebSocket(
                `${base.replace('http', 'ws')}/websocket/commands?l=__ingame__`
            );
            socket.onopen = () => resolve(socket);
            socket.onerror = reject;
        });

        ws.send('getSettings:other');
        const reply = await new Promise<string>((resolve) => {
            ws.onmessage = (event) => resolve(String(event.data));
        });
        ws.close();

        expect(JSON.parse(reply)).toEqual({
            command: 'getSettings',
            message: { error: 'Wrong overlay' }
        });
    });

    test('each websocket endpoint registers only on its matching Websocket instance', async () => {
        const endpoints = [
            { path: '/ws', ws: server.WS_V1 },
            { path: '/tokens', ws: server.WS_SC },
            { path: '/websocket/v2', ws: server.WS_V2 },
            { path: '/websocket/v2/precise', ws: server.WS_V2_PRECISE }
        ];
        const all = [
            server.WS_V1,
            server.WS_SC,
            server.WS_V2,
            server.WS_V2_PRECISE,
            server.WS_COMMANDS
        ];

        for (const { path: endpointPath, ws: target } of endpoints) {
            const socket = await new Promise<WebSocket>((resolve, reject) => {
                const s = new WebSocket(
                    `${base.replace('http', 'ws')}${endpointPath}`
                );
                s.onopen = () => resolve(s);
                s.onerror = reject;
            });

            expect(target.clients.size).toBe(1);
            for (const other of all) {
                if (other === target) continue;
                expect(other.clients.size).toBe(0);
            }

            await new Promise<void>((resolve) => {
                socket.onclose = () => resolve();
                socket.close();
            });

            // The client's `close` event can fire slightly before the
            // server-side `Websocket.close()` handler removes the entry
            // from `clients` -- poll briefly rather than asserting on the
            // client-observed close alone.
            const deadline = Date.now() + 2000;
            while (target.clients.size > 0 && Date.now() < deadline) {
                await new Promise((resolve) => setTimeout(resolve, 10));
            }

            expect(target.clients.size).toBe(0);
        }
    });

    // Keep last: restart() rebinds the underlying Bun server to a new port,
    // so every test above (and `base`) must run against the pre-restart port.
    test('restart() rebinds routes and websocket upgrades on a new port', async () => {
        await server.restart();

        expect(server.app.server).not.toBeNull();
        expect(server.app.server!.port).toBeGreaterThan(0);

        const newBase = `http://127.0.0.1:${server.app.server!.port}`;

        const res = await fetch(`${newBase}/`);
        const body = await res.text();
        expect(res.status).toBe(200);
        expect(body).toContain('<html');

        const ws = await new Promise<WebSocket>((resolve, reject) => {
            const socket = new WebSocket(
                `${newBase.replace('http', 'ws')}/websocket/commands?l=__ingame__`
            );
            socket.onopen = () => resolve(socket);
            socket.onerror = reject;
        });

        ws.send('getSettings:nope');
        const reply = await new Promise<string>((resolve) => {
            ws.onmessage = (event) => resolve(String(event.data));
        });
        ws.close();

        expect(JSON.parse(reply)).toEqual({
            command: 'getSettings',
            message: { error: 'Wrong overlay' }
        });
    });
});
