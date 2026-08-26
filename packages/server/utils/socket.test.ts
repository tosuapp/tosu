import { config, sleep } from '@tosu/common';
import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import type { InstanceManager } from 'tosu/instances/manager';

import buildSocket from '../router/socket';
import { handleSocketCommands } from './commands';
import { HttpServer } from './http';
import { Websocket, type WsEndpoint, createWebsocketHandler } from './socket';

const stateV2 = { menu: { name: 'song' }, play: { combo: 5 } };

const instanceManager = {
    focusedClient: 0,
    osuInstances: {},
    // /tokens polls getStateSC, /websocket/v2 polls getStateV2
    getInstance: () => ({
        getStateV2: () => stateV2,
        getStateSC: () => stateV2
    })
} as unknown as InstanceManager;

let app: HttpServer;
let base: string;
let endpoints: Record<WsEndpoint, Websocket>;

interface MessageQueue {
    queue: string[];
    waiters: Array<(value: string) => void>;
}

const queues = new WeakMap<WebSocket, MessageQueue>();

function connect(path: string): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
        const ws = new WebSocket(`${base}${path}`);
        const state: MessageQueue = { queue: [], waiters: [] };
        queues.set(ws, state);

        // Attached immediately (before `open` resolves) so no message sent
        // right after the handshake can be dropped between connect() and
        // the first nextMessage() call.
        ws.onmessage = (event) => {
            const data = String(event.data);
            const waiter = state.waiters.shift();
            if (waiter) waiter(data);
            else state.queue.push(data);
        };

        ws.onopen = () => resolve(ws);
        ws.onerror = (event) => reject(event);
    });
}

/** Shifts the next message off the socket's queue, awaiting one if empty. */
function nextMessage(ws: WebSocket): Promise<string> {
    const state = queues.get(ws)!;

    const queued = state.queue.shift();
    if (queued !== undefined) return Promise.resolve(queued);

    return new Promise((resolve) => state.waiters.push(resolve));
}

/** Messages already received but not yet consumed via nextMessage(). */
function pendingMessages(ws: WebSocket): string[] {
    return [...queues.get(ws)!.queue];
}

async function waitFor<T>(
    ws: WebSocket,
    predicate: (message: any) => T | undefined
): Promise<T> {
    for (let i = 0; i < 20; i++) {
        const result = predicate(JSON.parse(await nextMessage(ws)));
        if (result !== undefined) return result;
    }
    throw new Error('message not received');
}

/** Finds the server-side socket for a connection identified by `?l=`. */
function findClient(ws: Websocket, overlay: string) {
    for (const client of ws.clients.values()) {
        if (client.data.query.l === overlay) return client;
    }
    throw new Error(`no client found for overlay ${overlay}`);
}

beforeAll(() => {
    const getServer = () => app.server;
    const common = {
        instanceManager,
        onMessageCallback: handleSocketCommands,
        getServer
    };

    endpoints = {
        v1: new Websocket({
            ...common,
            endpoint: 'v1',
            pollRateFieldName: 'pollRate',
            stateFunctionName: 'getState'
        }),
        sc: new Websocket({
            ...common,
            endpoint: 'sc',
            pollRateFieldName: 'pollRate',
            stateFunctionName: 'getStateSC'
        }),
        v2: new Websocket({
            ...common,
            endpoint: 'v2',
            pollRateFieldName: 'pollRate',
            stateFunctionName: 'getStateV2'
        }),
        v2precise: new Websocket({
            ...common,
            endpoint: 'v2precise',
            pollRateFieldName: 'preciseDataPollRate',
            stateFunctionName: 'getPreciseData'
        }),
        commands: new Websocket({
            ...common,
            endpoint: 'commands',
            pollRateFieldName: '',
            stateFunctionName: ''
        })
    };

    app = new HttpServer({
        instanceManager,
        websocket: createWebsocketHandler(endpoints)
    });
    buildSocket(app);
    app.listen(0, '127.0.0.1');
    base = `ws://127.0.0.1:${app.server!.port}`;
});

afterAll(async () => {
    await app.stop();
});

describe('websocket endpoints', () => {
    test('/websocket/v2 streams the v2 state', async () => {
        const ws = await connect('/websocket/v2');
        const message = JSON.parse(await nextMessage(ws));
        ws.close();

        expect(message).toEqual(stateV2);
    });

    test('applyFilters narrows the payload for that client only, and never leaks the unfiltered payload', async () => {
        const filtered = await connect('/websocket/v2');
        const plain = await connect('/websocket/v2');

        filtered.send('applyFilters:["menu"]');
        const narrowed = await waitFor(filtered, (m) =>
            m.play === undefined ? m : undefined
        );
        const full = JSON.parse(await nextMessage(plain));

        expect(narrowed).toEqual({ menu: { name: 'song' } });
        expect(full).toEqual(stateV2);

        // Collect every message over a few more poll cycles: the filtered
        // client must never receive the unfiltered broadcast, while the
        // plain client keeps getting the full payload every cycle.
        await sleep(3 * config.pollRate);

        const filteredMessages = pendingMessages(filtered).map((raw) =>
            JSON.parse(raw)
        );
        const plainMessages = pendingMessages(plain).map((raw) =>
            JSON.parse(raw)
        );

        expect(filteredMessages.length).toBeGreaterThan(0);
        for (const message of filteredMessages) {
            expect(message).not.toHaveProperty('play');
            expect(message).toEqual({ menu: { name: 'song' } });
        }

        expect(plainMessages.length).toBeGreaterThan(0);
        for (const message of plainMessages) {
            expect(message).toEqual(stateV2);
        }

        filtered.close();
        plain.close();
    });

    test('/tokens treats a bare JSON array as applyFilters', async () => {
        const ws = await connect('/tokens?l=test');
        ws.send('["play"]');
        const narrowed = await waitFor(ws, (m) =>
            m.menu === undefined ? m : undefined
        );
        ws.close();

        expect(narrowed).toEqual({ play: { combo: 5 } });
    });

    test('/websocket/commands answers commands', async () => {
        const ws = await connect('/websocket/commands?l=__ingame__');
        ws.send('getSettings:other-overlay');
        const reply = JSON.parse(await nextMessage(ws));
        ws.close();

        expect(reply).toEqual({
            command: 'getSettings',
            message: { error: 'Wrong overlay' }
        });
    });

    test('unknown websocket path is rejected', async () => {
        await expect(connect('/websocket/nope')).rejects.toBeDefined();
    });

    // saveSettings' redispatch of `updateSettings` is exercised through
    // ws.redispatch() directly rather than the `saveSettings:...` wire
    // command: saveSettings also schedules a real, debounced disk write
    // (utils/counters.ts' saveSettings), which would leak into a real
    // static/settings folder from this test. redispatch() is the unit
    // actually under test here.
    test('redispatch only reaches the client addressed by getSettings/updateSettings', async () => {
        const a = await connect('/websocket/commands?l=SETTINGS_A');
        const b = await connect('/websocket/commands?l=SETTINGS_B');
        const c = await connect('/websocket/commands?l=SETTINGS_C');

        const sender = findClient(endpoints.commands, 'SETTINGS_C');
        endpoints.commands.redispatch(
            sender.data.id,
            'updateSettings',
            'SETTINGS_A',
            JSON.stringify({ x: 1 })
        );

        const reply = JSON.parse(await nextMessage(a));
        expect(reply).toEqual({ command: 'updateSettings', message: { x: 1 } });

        await sleep(300);
        expect(pendingMessages(b)).toEqual([]);
        expect(pendingMessages(c)).toEqual([]);

        a.close();
        b.close();
        c.close();
    });

    test('redispatch fans a non-restricted command out to every other client but not the sender', async () => {
        const a = await connect('/websocket/commands?l=FANOUT_A');
        const b = await connect('/websocket/commands?l=FANOUT_B');
        const c = await connect('/websocket/commands?l=FANOUT_C');

        const sender = findClient(endpoints.commands, 'FANOUT_C');
        endpoints.commands.redispatch(sender.data.id, 'ping', 'FANOUT_A');

        const [aReply, bReply] = await Promise.all([
            nextMessage(a).then((raw) => JSON.parse(raw)),
            nextMessage(b).then((raw) => JSON.parse(raw))
        ]);

        expect(aReply).toEqual({ command: 'ping' });
        expect(bReply).toEqual({ command: 'ping' });
        expect(pendingMessages(c)).toEqual([]);

        a.close();
        b.close();
        c.close();
    });
});
