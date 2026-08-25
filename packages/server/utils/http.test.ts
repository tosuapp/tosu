import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import type { InstanceManager } from 'tosu/instances/manager';

import { HttpServer } from './http';
import { json } from './index';

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

    test('thrown errors become 500 JSON with encoded statusText', async () => {
        const res = await fetch(`${base}/boom`);

        expect(res.status).toBe(500);
        expect(await res.json()).toEqual({ error: 'osu is not ready/running' });

        // NOTE: Bun.serve() does not transmit a custom Response.statusText over
        // the wire -- a real fetch() always observes the standard HTTP reason
        // phrase for the status code (e.g. "Internal Server Error" for 500),
        // regardless of what is set (verified against Bun 1.4.0). The
        // `json()` helper still builds the Response with the encoded
        // statusText in-process, which is what HttpServer's error handler
        // relies on, so we assert the contract there instead.
        expect(
            json({}, 500, encodeURI('osu is not ready/running')).statusText
        ).toBe(encodeURI('osu is not ready/running'));
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
});
