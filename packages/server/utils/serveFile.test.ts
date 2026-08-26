import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { serveFile } from './serveFile';

let folder: string;
let filePath: string;

beforeAll(() => {
    folder = fs.mkdtempSync(path.join(os.tmpdir(), 'tosu-servefile-'));
    filePath = path.join(folder, 'song.mp3');
    fs.writeFileSync(filePath, Buffer.alloc(1000, 7));
});

afterAll(() => {
    fs.rmSync(folder, { recursive: true, force: true });
});

describe('serveFile', () => {
    test('serves the full file with a 200 and Accept-Ranges when requested', async () => {
        const res = await serveFile(filePath, {
            contentType: 'audio/mpeg',
            extraHeaders: { 'Accept-Ranges': 'bytes', 'Content-Length': '1000' }
        });

        expect(res.status).toBe(200);
        expect(res.headers.get('content-type')).toBe('audio/mpeg');
        expect(res.headers.get('accept-ranges')).toBe('bytes');
        expect(res.headers.get('content-length')).toBe('1000');
        expect((await res.arrayBuffer()).byteLength).toBe(1000);
    });

    test('falls back to getContentType when contentType is not given', async () => {
        const res = await serveFile(filePath);

        expect(res.status).toBe(200);
        expect(res.headers.get('content-type')).toBe(
            'audio/mpeg; charset=utf-8'
        );
    });

    test('serves a valid range as 206 with the exact slice', async () => {
        const res = await serveFile(filePath, {
            range: 'bytes=10-19',
            contentType: 'audio/mpeg'
        });

        expect(res.status).toBe(206);
        expect(res.headers.get('accept-ranges')).toBe('bytes');
        expect(res.headers.get('content-range')).toBe('bytes 10-19/1000');
        expect(res.headers.get('content-length')).toBe('10');
        expect((await res.arrayBuffer()).byteLength).toBe(10);
    });

    test('an open-ended range serves through the end of the file', async () => {
        const res = await serveFile(filePath, {
            range: 'bytes=990-',
            contentType: 'audio/mpeg'
        });

        expect(res.status).toBe(206);
        expect(res.headers.get('content-range')).toBe('bytes 990-999/1000');
        expect((await res.arrayBuffer()).byteLength).toBe(10);
    });

    test('a range past the end of the file is rejected with 416', async () => {
        const res = await serveFile(filePath, {
            range: 'bytes=999-2000',
            contentType: 'audio/mpeg'
        });

        expect(res.status).toBe(416);
        expect(res.headers.get('content-range')).toBe('bytes */1000');
    });

    test('a suffix range (no start) is rejected with 416', async () => {
        const res = await serveFile(filePath, {
            range: 'bytes=-500',
            contentType: 'audio/mpeg'
        });

        expect(res.status).toBe(416);
        expect(res.headers.get('content-range')).toBe('bytes */1000');
    });

    test('a range where start is past end is rejected with 416', async () => {
        const res = await serveFile(filePath, {
            range: 'bytes=20-10',
            contentType: 'audio/mpeg'
        });

        expect(res.status).toBe(416);
        expect(res.headers.get('content-range')).toBe('bytes */1000');
    });

    test('a non-numeric range is rejected with 416', async () => {
        const res = await serveFile(filePath, {
            range: 'bytes=abc-def',
            contentType: 'audio/mpeg'
        });

        expect(res.status).toBe(416);
        expect(res.headers.get('content-range')).toBe('bytes */1000');
    });

    test('extraHeaders cannot override the computed range headers', async () => {
        const res = await serveFile(filePath, {
            range: 'bytes=10-19',
            contentType: 'audio/mpeg',
            extraHeaders: { 'Content-Length': '1000' }
        });

        expect(res.status).toBe(206);
        expect(res.headers.get('content-length')).toBe('10');
    });

    test('throws ENOENT for a missing file', async () => {
        await expect(
            serveFile(path.join(folder, 'nope.mp3'))
        ).rejects.toMatchObject({ code: 'ENOENT' });
    });
});
