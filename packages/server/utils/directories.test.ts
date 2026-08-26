import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { directoryWalker } from './directories';
import type { TosuRequest } from './http';

let folder: string;
let secretPath: string;

const SECRET = 'do-not-serve-me';

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
    fs.mkdirSync(path.join(folder, 'overlay', 'nested'));
    fs.writeFileSync(
        path.join(folder, 'overlay', 'nested', 'deep.txt'),
        'nested file'
    );

    // Sibling of the served folder: reachable only by escaping it.
    secretPath = path.join(folder, '..', `${path.basename(folder)}-secret.txt`);
    fs.writeFileSync(secretPath, SECRET);
});

afterAll(() => {
    fs.rmSync(folder, { recursive: true, force: true });
    fs.rmSync(secretPath, { force: true });
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

    test('refuses an encoded traversal out of the served folder', async () => {
        const escaped = `overlay%2F..%2F..%2F${path.basename(secretPath)}`;
        const res = await directoryWalker({
            req: request(`/${escaped}`),
            baseUrl: `/${escaped}`,
            pathname: escaped,
            folderPath: folder
        });

        expect(res.status).toBe(404);
        expect(await res.text()).toBe('');
        // The file is there -- the guard is what kept it out of the response.
        expect(fs.readFileSync(secretPath, 'utf8')).toBe(SECRET);
    });

    test('refuses the windows separator form of the traversal', async () => {
        const escaped = `overlay%5C..%5C..%5C${path.basename(secretPath)}`;
        const walk = directoryWalker({
            req: request(`/${escaped}`),
            baseUrl: `/${escaped}`,
            pathname: escaped,
            folderPath: folder
        });

        if (process.platform === 'win32') {
            const res = await walk;

            expect(res.status).toBe(404);
            expect(await res.text()).toBe('');
        } else {
            // On POSIX a backslash is an ordinary filename character, so the
            // decoded path never leaves the folder -- it simply does not exist.
            await expect(walk).rejects.toMatchObject({ code: 'ENOENT' });
        }

        expect(fs.readFileSync(secretPath, 'utf8')).toBe(SECRET);
    });

    test('still serves a legitimate nested path', async () => {
        const res = await directoryWalker({
            req: request('/overlay/nested/deep.txt'),
            baseUrl: '/overlay/nested/deep.txt',
            pathname: 'overlay/nested/deep.txt',
            folderPath: folder
        });

        expect(res.status).toBe(200);
        expect(await res.text()).toBe('nested file');
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
