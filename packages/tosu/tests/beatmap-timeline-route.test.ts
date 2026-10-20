import assert from 'node:assert/strict';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { test } from 'node:test';

import buildV2Api from '../../server/router/v2';
import { HttpServer } from '../../server/utils/http';
import type { ExtendedIncomingMessage } from '../../server/utils/http';
import type { BeatmapTimeline } from '../src/api/types/v2';

test('serves the focused instance timeline and reports unavailable maps as 503', async () => {
    const app = new HttpServer();
    const timeline: BeatmapTimeline = {
        checksum: 'focused-map',
        mode: 0,
        fileFormat: 14,
        comboColours: [{ red: 12, green: 34, blue: 56 }],
        breaks: [],
        hitObjects: [{ startTime: 1000, type: 5 }]
    };
    let ready = false;
    let running = false;
    const manager = {
        focusedClient: 1,
        getInstance: (client: number) => {
            assert.equal(client, manager.focusedClient);
            return running
                ? {
                      get: (service: string) => {
                          assert.equal(service, 'beatmapPP');
                          return {
                              getTimeline: () => (ready ? timeline : undefined)
                          };
                      }
                  }
                : undefined;
        }
    } as unknown as ExtendedIncomingMessage['instanceManager'];
    app.use((req, _res, next) => {
        req.instanceManager = manager;
        next();
    });
    buildV2Api(app);
    app.server.listen(0, '127.0.0.1');
    await once(app.server, 'listening');
    const port = (app.server.address() as AddressInfo).port;
    const url = `http://127.0.0.1:${port}/api/v2/beatmap/timeline`;
    try {
        for (const gameRunning of [false, true]) {
            running = gameRunning;
            const response = await fetch(url);
            assert.equal(response.status, 503);
            assert.deepEqual(await response.json(), {
                error: 'beatmap_not_ready'
            });
        }
        ready = true;
        const response = await fetch(url);
        assert.equal(response.status, 200);
        assert.match(
            response.headers.get('content-type') ?? '',
            /application\/json/
        );
        assert.deepEqual(await response.json(), timeline);
        ready = false;
        assert.equal((await fetch(url)).status, 503);
    } finally {
        app.server.closeAllConnections();
        await new Promise<void>((resolve) => app.server.close(() => resolve()));
    }
});
