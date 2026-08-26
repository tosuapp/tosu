import fs from 'node:fs';

import { getContentType } from '../utils';

/**
 * Serves a single file on disk as a `Response`, honoring an HTTP `Range`
 * header (single-range only) the same way across every route that streams a
 * file: 200 for the whole file, 206 for a satisfiable range, 416 for a range
 * past the end of the file.
 *
 * Throws whatever `fs.promises.stat` throws (e.g. ENOENT for a missing
 * file) -- callers that need a different missing-file status should check
 * for existence before calling this.
 */
export async function serveFile(
    filePath: string,
    options: {
        range?: string | null;
        contentType?: string;
        extraHeaders?: Record<string, string>;
    } = {}
): Promise<Response> {
    const stat = await fs.promises.stat(filePath);
    const contentType = options.contentType ?? getContentType(filePath);
    const file = Bun.file(filePath);

    if (options.range) {
        const [startText, endText] = options.range
            .replace('bytes=', '')
            .split('-');
        const start = parseInt(startText);
        const end = endText ? parseInt(endText) : stat.size - 1;

        if (
            !Number.isFinite(start) ||
            !Number.isFinite(end) ||
            start > end ||
            start >= stat.size ||
            end >= stat.size
        ) {
            return new Response(null, {
                status: 416,
                headers: { 'Content-Range': `bytes */${stat.size}` }
            });
        }

        const rangeHeaders: Record<string, string> = {
            ...options.extraHeaders,
            'Accept-Ranges': 'bytes',
            'Content-Range': `bytes ${start}-${end}/${stat.size}`,
            'Content-Length': String(end - start + 1)
        };
        // Unknown extensions (.ini, .osb, ...) have no content type -- send no
        // header at all rather than an empty one, same as the 200 path below.
        if (contentType) rangeHeaders['Content-Type'] = contentType;

        return new Response(file.slice(start, end + 1), {
            status: 206,
            headers: rangeHeaders
        });
    }

    const headers: Record<string, string> = { ...options.extraHeaders };
    if (contentType) headers['Content-Type'] = contentType;

    return new Response(file, { headers });
}
