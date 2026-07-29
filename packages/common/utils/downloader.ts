import crypto from 'crypto';
import fs from 'fs';
import { Readable, Transform } from 'stream';
import { pipeline } from 'stream/promises';

import { context } from './context';
import { wLogger } from './logger';
import { progressManager } from './progress';

/**
 * Downloads a file from a URL to a local destination on disk.
 *
 * @param url The target download URL.
 * @param destination The absolute destination file path on disk.
 * @returns Promise resolving to the destination path.
 */
export async function downloadFile(
    url: string,
    destination: string
): Promise<string> {
    const response = await fetch(url, {
        redirect: 'follow',
        headers: {
            'User-Agent': `tosu/${context.currentVersion} (https://tosu.app; i@kotrik.ru)`
        }
    });

    if (!response.ok) {
        throw new Error(
            `Download failed with status ${response.status} (${response.statusText})`
        );
    }

    if (!response.body) {
        throw new Error('Download failed: response body is null');
    }

    const totalSize = parseInt(
        response.headers.get('content-length') || '0',
        10
    );
    let downloadedSize = 0;

    const token = progressManager.start('Downloading File');

    const progressStream = new Transform({
        transform(chunk, _encoding, callback) {
            downloadedSize += chunk.length;
            const progress = totalSize > 0 ? downloadedSize / totalSize : 0;
            const downloadedMB = (downloadedSize / 1024 / 1024).toFixed(2);
            const totalMB =
                totalSize > 0 ? (totalSize / 1024 / 1024).toFixed(2) : '???';

            progressManager.update(
                token,
                progress,
                `| ${downloadedMB} / ${totalMB} MB`
            );

            callback(null, chunk);
        }
    });

    const fileStream = fs.createWriteStream(destination);
    const nodeStream = Readable.fromWeb(response.body as any);

    try {
        await pipeline(nodeStream, progressStream, fileStream);
        await progressManager.end(token, 'Download completed');
        return destination;
    } catch (err) {
        await progressManager.end(token, 'Download failed');
        if (fs.existsSync(destination)) {
            await fs.promises.unlink(destination).catch(() => {});
        }
        throw err;
    }
}

/**
 * Verifies a downloaded file's checksum against an expected 'algorithm:hash' digest.
 *
 * @param expectedDigest The digest string in format 'algorithm:checksum' (e.g. 'sha256:abcd...').
 * @param filePath The absolute path of the local file to verify.
 * @returns Promise resolving to true if checksum matches, false otherwise.
 */
export async function verifyDownload(
    expectedDigest: `${string}:${string}` | string,
    filePath: string
): Promise<boolean> {
    try {
        if (!expectedDigest || !expectedDigest.includes(':')) return false;

        const [hashAlgorithm, apiChecksum] = expectedDigest.split(':');
        if (!hashAlgorithm || !apiChecksum) return false;

        const hash = crypto.createHash(hashAlgorithm);
        const fileStream = fs.createReadStream(filePath);

        await pipeline(fileStream, hash);

        const checksum = hash.digest('hex');
        if (apiChecksum.toLowerCase() !== checksum.toLowerCase()) {
            wLogger.error(
                `Download verification failed: checksum mismatch (expected ${apiChecksum}, got ${checksum})`
            );
            return false;
        }

        return true;
    } catch (exc) {
        wLogger.error(`Download verification failed:`, (exc as Error).message);
        wLogger.debug('Checksum error details:', exc);

        return false;
    }
}
