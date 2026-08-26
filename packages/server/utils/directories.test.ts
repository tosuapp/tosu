import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { directoryWalker } from './directories';
import type { TosuRequest } from './http';

let folder: string;

function request(pathname: string, headers: Record<string, string> = {}) {
    return {
        headers: new Headers(headers),
        pathname
    } as unknown as TosuRequest;
}

beforeAll(() => {
    folder = fs.mkdtempSync(path.join(os.tmpdir(), 'tosu-walker-'));
    fs.mkdirSync(path.join(folder, 'overlay'));
    fs.writeFileSync(path.join(folder, 'overlay', 'index.html'), '<h1>hi</h1>');
    fs.writeFileSync(
        path.join(folder, 'overlay', 'song.mp3'),
        Buffer.alloc(1000, 7)
    );
});

afterAll(() => {
    fs.rmSync(folder, { recursive: true, force: true });
});

describe('directoryWalker', () => {
    test('serves html with the counter metadata script', async () => {
        const res = await directoryWalker({
            req: request('/overlay/index.html'),
            baseUrl: '/overlay/index.html',
            pathname: 'overlay/index.html',
            folderPath: folder
        });

        expect(res.status).toBe(200);
        expect(res.headers.get('content-type')).toBe(
            'text/html; charset=utf-8'
        );
        expect(await res.text()).toContain('window.COUNTER_PATH=');
    });

    test('redirects a directory without trailing slash', async () => {
        const res = await directoryWalker({
            req: request('/overlay'),
            baseUrl: '/overlay',
            pathname: 'overlay',
            folderPath: folder
        });

        expect(res.status).toBe(301);
        expect(res.headers.get('location')).toBe('/overlay/');
    });

    test('lists a directory with trailing slash', async () => {
        const res = await directoryWalker({
            req: request('/overlay/'),
            baseUrl: '/overlay/',
            pathname: 'overlay',
            folderPath: folder
        });

        expect(res.status).toBe(200);
        expect(await res.text()).toContain('song.mp3');
    });

    test('serves byte ranges for media files', async () => {
        const res = await directoryWalker({
            req: request('/overlay/song.mp3', { range: 'bytes=10-19' }),
            baseUrl: '/overlay/song.mp3',
            pathname: 'overlay/song.mp3',
            folderPath: folder
        });

        expect(res.status).toBe(206);
        expect(res.headers.get('content-range')).toBe('bytes 10-19/1000');
        expect((await res.arrayBuffer()).byteLength).toBe(10);
    });

    test('rejects ranges past the end', async () => {
        const res = await directoryWalker({
            req: request('/overlay/song.mp3', { range: 'bytes=999-2000' }),
            baseUrl: '/overlay/song.mp3',
            pathname: 'overlay/song.mp3',
            folderPath: folder
        });

        expect(res.status).toBe(416);
    });

    test('throws ENOENT for a missing file (mapped to 500/404 by the caller)', async () => {
        await expect(
            directoryWalker({
                req: request('/overlay/nope.png'),
                baseUrl: '/overlay/nope.png',
                pathname: 'overlay/nope.png',
                folderPath: folder
            })
        ).rejects.toMatchObject({ code: 'ENOENT' });
    });
});
