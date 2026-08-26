import { config } from '@tosu/common';
import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import type { InstanceManager } from 'tosu/instances/manager';

import { HttpServer, errorStatusText } from './http';
import { json } from './index';

// Belt-and-braces: the bunfig.toml preload (test-setup.ts) is not discovered
// when tests run from a subdirectory (e.g. `cd packages/server && bun test`).
config.openDashboardOnStartup = false;

const instanceManager = {
    focusedClient: 0,
    osuInstances: {},
    getInstance: () => undefined
} as unknown as InstanceManager;

let app: HttpServer;
let base: string;

beforeAll(() => {
    app = new HttpServer({ instanceManager, websocket: { message() {} } });

    app.route('/plain', 'GET', () => json({ ok: true }));
    app.route(/^\/files\/(?<filePath>.*)/, 'GET', (req) =>
        json({ filePath: req.params.filePath, query: req.query })
    );
    app.route('/echo', 'POST', (req) => json({ body: req.body }));
    app.route('/boom', 'GET', () => {
        throw new Error('osu is not ready/running');
    });
    app.route('/redirect', 'GET', () => Response.redirect('/plain', 301));
    app.route(/.*/, 'GET', (req) => json({ catchAll: req.pathname }));

    app.listen(0, '127.0.0.1');
    base = `http://127.0.0.1:${app.server!.port}`;
});

afterAll(async () => {
    await app.stop();
});

describe('HttpServer', () => {
    test('serves string routes with CORS headers', async () => {
        const res = await fetch(`${base}/plain`);

        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ ok: true });
        expect(res.headers.get('access-control-allow-origin')).toBe('*');
        expect(res.headers.get('access-control-allow-private-network')).toBe(
            'true'
        );
    });

    test('regex routes expose named groups as params and parse the query', async () => {
        const res = await fetch(`${base}/files/a/b.png?x=1&y=two`);

        expect(await res.json()).toEqual({
            filePath: 'a/b.png',
            query: { x: '1', y: 'two' }
        });
    });

    test('string routes win over the catch-all, catch-all handles the rest', async () => {
        expect(await (await fetch(`${base}/plain`)).json()).toEqual({
            ok: true
        });
        expect(await (await fetch(`${base}/anything/else`)).json()).toEqual({
            catchAll: '/anything/else'
        });
    });

    test('POST body is available as text', async () => {
        const res = await fetch(`${base}/echo`, {
            method: 'POST',
            body: '{"a":1}'
        });

        expect(await res.json()).toEqual({ body: '{"a":1}' });
    });

    test('thrown errors become 500 JSON with the error message', async () => {
        const res = await fetch(`${base}/boom`);

        expect(res.status).toBe(500);
        expect(await res.json()).toEqual({ error: 'osu is not ready/running' });
    });

    test('errorStatusText encodes the message, and maps ENOENT to a friendlier one', () => {
        expect(
            errorStatusText(new Error('osu is not ready/running'), '/boom')
        ).toBe(encodeURI('osu is not ready/running'));

        expect(
            errorStatusText(
                Object.assign(new Error('x'), { code: 'ENOENT' }),
                '/files/x.png'
            )
        ).toBe(encodeURI('/files/x.png ENOENT: no such file or directory'));
    });

    test('unknown method on a known path is 404', async () => {
        const res = await fetch(`${base}/plain`, { method: 'DELETE' });

        expect(res.status).toBe(404);
        expect(await res.text()).toBe('Not Found');
    });

    test('requests from a disallowed origin are rejected with 403', async () => {
        const res = await fetch(`${base}/plain`, {
            headers: { origin: 'http://evil.example' }
        });

        expect(res.status).toBe(403);
    });

    test('requests from an allowed origin pass', async () => {
        const res = await fetch(`${base}/plain`, {
            headers: { origin: 'http://localhost:24050' }
        });

        expect(res.status).toBe(200);
    });

    test('a redirect response still gets CORS headers without throwing', async () => {
        const res = await fetch(`${base}/redirect`, { redirect: 'manual' });

        expect(res.status).toBe(301);
        expect(res.headers.get('location')).toContain('/plain');
        expect(res.headers.get('access-control-allow-origin')).toBe('*');
    });

    test('a request with Upgrade: websocket and no handler registered is 404', async () => {
        const res = await fetch(`${base}/ws`, {
            headers: { Upgrade: 'websocket', Connection: 'Upgrade' }
        });

        expect(res.status).toBe(404);
        expect(await res.text()).toBe('Not Found');
    });
});

describe('HttpServer upgrade handling', () => {
    let wsApp: HttpServer;
    let wsBase: string;

    beforeAll(() => {
        wsApp = new HttpServer({
            instanceManager,
            websocket: {
                open() {},
                message() {}
            }
        });

        wsApp.onUpgrade((request, url, server) =>
            server.upgrade(request, {
                data: {
                    endpoint: 'v2',
                    id: 'test',
                    pathname: url.pathname,
                    query: {},
                    filters: [],
                    hostAddress: '',
                    localAddress: '',
                    originAddress: '',
                    remoteAddress: ''
                }
            })
        );

        wsApp.listen(0, '127.0.0.1');
        wsBase = `http://127.0.0.1:${wsApp.server!.port}`;
    });

    afterAll(async () => {
        await wsApp.stop();
    });

    test('a registered upgrade handler completes a real WebSocket handshake', async () => {
        const ws = new WebSocket(`${wsBase.replace('http', 'ws')}/ws`);

        try {
            await new Promise<void>((resolve, reject) => {
                ws.addEventListener('open', () => resolve());
                ws.addEventListener('error', () =>
                    reject(new Error('WebSocket failed to open'))
                );
            });
        } finally {
            ws.close();
        }
    });
});
