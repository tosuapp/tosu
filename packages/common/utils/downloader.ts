import fs from 'fs';
import https from 'https';

import { colorText, wLogger } from './logger';

const progressBarWidth = 40;

export const updateProgressBar = (
    title: string,
    progress: number,
    message: string = ''
): void => {
    const coloredText = colorText('info');
    if (message) message = ` - ${message}`;

    const filledWidth = Math.round(progressBarWidth * progress);
    const emptyWidth = progressBarWidth - filledWidth;
    const progressBar = '█'.repeat(filledWidth) + '░'.repeat(emptyWidth);

    process.stdout.write(
        `${coloredText} ${title}: [${progressBar}] ${(progress * 100).toFixed(2)}%${message}\r`
    );

    if (progress === 1) {
        if (
            typeof process.stdout.clearLine === 'function' &&
            typeof process.stdout.cursorTo === 'function'
        ) {
            process.stdout.clearLine(0);
            process.stdout.cursorTo(0);
        } else {
            process.stdout.write('\n');
        }
    }
};

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
        const options: https.RequestOptions = {
            headers: {
                Accept: 'application/octet-stream',
                'User-Agent': '@tosuapp/tosu'
            },
            agent: new https.Agent({
                secureOptions: require('node:crypto').constants.SSL_OP_ALL,
                minVersion: 'TLSv1.2',
                maxVersion: 'TLSv1.3'
            }),
            minVersion: 'TLSv1.2',
            maxVersion: 'TLSv1.3'
        };

        wLogger.info(`[request] request to ${url}`);
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

                file.on('error', (err) => {
                    fs.unlinkSync(destination);
                    reject(err);
                });

                file.on('finish', () => {
                    file.close();
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
                    updateProgressBar('Downloading', progress);
                });

                response.pipe(file);
            })
            .on('error', reject);
    });
