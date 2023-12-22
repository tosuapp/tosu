import fs from 'fs';
import https from 'https';

const progressBarWidth = 40;

const updateProgressBar = (progress: number): void => {
    const filledWidth = Math.round(progressBarWidth * progress);
    const emptyWidth = progressBarWidth - filledWidth;
    const progressBar = '█'.repeat(filledWidth) + '░'.repeat(emptyWidth);
    process.stdout.write(
        `Progress: [${progressBar}] ${(progress * 100).toFixed(2)}%\r`
    );
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
        const options = {
            headers: {
                Accept: 'application/octet-stream',
                'User-Agent': '@KotRikD/tosu'
            }
        };

        const file = fs.createWriteStream(destination);

        file.on('error', (err) => {
            fs.unlinkSync(destination);
            reject(err);
        });

        file.on('finish', () => {
            file.close();
            resolve(destination);
        });

        // find url
        https
            .get(url, options, (response) => {
                if (response.headers.location) {
                    downloadFile(response.headers.location, destination)
                        .then(resolve)
                        .catch(reject);
                    return;
                }

                const totalSize = parseInt(
                    response.headers['content-length']!,
                    10
                );
                let downloadedSize = 0;

                response.on('data', (data) => {
                    downloadedSize += data.length;
                    const progress = downloadedSize / totalSize;
                    updateProgressBar(progress);
                });

                response.pipe(file);
            })
            .on('error', reject);
    });
