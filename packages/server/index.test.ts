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

beforeAll(() => {
    staticFolder = fs.mkdtempSync(path.join(os.tmpdir(), 'tosu-static-'));
    config.staticFolderPath = staticFolder;
    config.serverIP = '127.0.0.1';
    config.serverPort = 0;
    config.openDashboardOnStartup = false;
    context.currentVersion = '4.26.0';
    context.updateVersion = '4.26.0';

    server = new Server({ instanceManager });
    server.start();
    base = `http://127.0.0.1:${server.app.server!.port}`;
});

afterAll(async () => {
    await server.app.stop();
    fs.rmSync(staticFolder, { recursive: true, force: true });
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
});
