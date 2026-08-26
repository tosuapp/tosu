import crypto from 'node:crypto';
import fs from 'node:fs';

import { wLogger } from './logger';
import { progressManager } from './progress';

const toMB = (bytes: number) => (bytes / 1024 / 1024).toFixed(2);

/**
 * Streams `url` into `destination` with a console progress bar.
 * @returns the destination path
 */
export const downloadFile = async (
    url: string,
    destination: string
): Promise<string> => {
    const response = await fetch(url, {
        headers: {
            Accept: 'application/octet-stream',
            'User-Agent': '@tosuapp/tosu'
        }
    });

    if (!response.ok || !response.body) {
        await response.body?.cancel().catch(() => null);

        throw new Error(
            `Download failed: ${response.status} ${response.statusText}`
        );
    }

    const totalSize = parseInt(response.headers.get('content-length') || '0');
    const token = progressManager.start('Downloading File');
    const writer = Bun.file(destination).writer();
    let downloadedSize = 0;

    try {
        for await (const chunk of response.body) {
            writer.write(chunk);
            downloadedSize += chunk.byteLength;

            progressManager.update(
                token,
                totalSize > 0 ? downloadedSize / totalSize : 0,
                `| ${toMB(downloadedSize)} / ${toMB(totalSize)} MB`
            );
        }

        await writer.end();
        await progressManager.end(token, 'Download completed');

        return destination;
    } catch (err) {
        try {
            await writer.end();
        } catch {
            // Ignore cleanup errors to avoid masking the original download failure
        }
        await fs.promises.unlink(destination).catch(() => null);
        await progressManager.end(token, 'Download failed');

        throw err;
    }
};

export async function verifyDownload(
    githubDigest: `${string}:${string}`,
    filePath: string
): Promise<boolean> {
    try {
        const [hashAlgorithm, apiChecksum] = githubDigest.split(':');
        const checksum = crypto
            .createHash(hashAlgorithm)
            .update(await fs.promises.readFile(filePath))
            .digest('hex');

        if (apiChecksum !== checksum) {
            wLogger.error(
                `Download verification: file checksum doesn't match - ${apiChecksum} ${checksum} `
            );
            return false;
        }

        return true;
    } catch (exc) {
        wLogger.error(`Download verification failed:`, (exc as Error).message);
        wLogger.debug('Auto-update error details:', exc);

        return false;
    }
}
