import fs from 'fs';
import https from 'https';

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
