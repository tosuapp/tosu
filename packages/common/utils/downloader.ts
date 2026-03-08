import crypto from 'crypto';
import fs from 'fs';
import https from 'https';

import { wLogger } from './logger';
import { progressManager } from './progress';

/**
 * A cyperdark's downloadFile implmentation based on pure node api
 * @param url {string}
 * @param destination {string}
 * @returns  {Promise<string>}
 */
export const downloadFile = (
    url: string,
    destination: string
): Promise<string> =>
    new Promise((resolve, reject) => {
        let token: symbol | undefined;

        const options = {
            headers: {
                Accept: 'application/octet-stream',
                'User-Agent': '@tosuapp/tosu'
            },
            agent: new https.Agent({
                secureOptions: require('node:crypto').constants.SSL_OP_ALL
            })
        };

        // find url
        https
            .get(url, options, (response) => {
                if (response.headers.location) {
                    downloadFile(response.headers.location, destination)
                        .then(resolve)
                        .catch(reject);
                    return;
                }

                const file = fs.createWriteStream(destination);
                token = progressManager.start('Downloading File');

                file.on('error', async (err) => {
                    try {
                        if (fs.existsSync(destination))
                            fs.unlinkSync(destination);
                    } catch {
                        // Ignore cleanup errors to avoid masking the original download failure
                    }
                    if (token)
                        await progressManager.end(token, 'Download failed');
                    reject(err);
                });

                file.on('finish', async () => {
                    file.close();
                    if (token)
                        await progressManager.end(token, 'Download completed');
                    resolve(destination);
                });

                const totalSize = parseInt(
                    response.headers['content-length']!,
                    10
                );
                let downloadedSize = 0;

                response.on('data', (data) => {
                    downloadedSize += data.length;
                    const progress = downloadedSize / totalSize;

                    const downloadedMB = (downloadedSize / 1024 / 1024).toFixed(
                        2
                    );
                    const totalMB = (totalSize / 1024 / 1024).toFixed(2);

                    if (token) {
                        progressManager.update(
                            token,
                            progress,
                            `| ${downloadedMB} / ${totalMB} MB`
                        );
                    }
                });

                response.pipe(file);
            })
            .on('error', async (err) => {
                if (token) await progressManager.end(token, 'Download failed');
                reject(err);
            });
    });

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
