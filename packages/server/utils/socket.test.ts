import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import type { InstanceManager } from 'tosu/instances/manager';

import buildSocket from '../router/socket';
import { handleSocketCommands } from './commands';
import { HttpServer } from './http';
import { Websocket, createWebsocketHandler } from './socket';

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

function connect(path: string): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
        const ws = new WebSocket(`${base}${path}`);
        ws.onopen = () => resolve(ws);
        ws.onerror = (event) => reject(event);
    });
}

function nextMessage(ws: WebSocket): Promise<string> {
    return new Promise((resolve) => {
        ws.onmessage = (event) => resolve(String(event.data));
    });
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

beforeAll(() => {
    const getServer = () => app.server;
    const common = {
        instanceManager,
        onMessageCallback: handleSocketCommands,
        getServer
    };

    const endpoints = {
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
    } as const;

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

    test('applyFilters narrows the payload for that client only', async () => {
        const filtered = await connect('/websocket/v2');
        const plain = await connect('/websocket/v2');

        filtered.send('applyFilters:["menu"]');
        const narrowed = await waitFor(filtered, (m) =>
            m.play === undefined ? m : undefined
        );
        const full = JSON.parse(await nextMessage(plain));

        filtered.close();
        plain.close();

        expect(narrowed).toEqual({ menu: { name: 'song' } });
        expect(full).toEqual(stateV2);
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
});
