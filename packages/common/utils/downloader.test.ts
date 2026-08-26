import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { downloadFile } from './downloader';

const payload = new Uint8Array(1024 * 256).map((_, i) => i % 251);
let server: ReturnType<typeof Bun.serve>;
let dir: string;

beforeAll(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tosu-download-'));
    server = Bun.serve({
        port: 0,
        hostname: '127.0.0.1',
        fetch(req) {
            const url = new URL(req.url);
            if (url.pathname === '/redirect') {
                return Response.redirect(`${url.origin}/file.zip`, 302);
            }
            if (url.pathname === '/file.zip') {
                return new Response(payload, {
                    headers: { 'Content-Length': String(payload.byteLength) }
                });
            }
            return new Response('nope', { status: 404 });
        }
    });
});

afterAll(async () => {
    await server.stop(true);
    fs.rmSync(dir, { recursive: true, force: true });
});

describe('downloadFile', () => {
    test('writes the body to the destination and follows redirects', async () => {
        const destination = path.join(dir, 'out.zip');
        const result = await downloadFile(
            `${server.url.origin}/redirect`,
            destination
        );

        expect(result).toBe(destination);
        expect(new Uint8Array(fs.readFileSync(destination))).toEqual(payload);
    });

    test('rejects and removes the file on HTTP errors', async () => {
        const destination = path.join(dir, 'missing.zip');

        await expect(
            downloadFile(`${server.url.origin}/missing.zip`, destination)
        ).rejects.toThrow('Download failed: 404');
        expect(fs.existsSync(destination)).toBe(false);
    });
});
