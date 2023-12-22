import { exec, execFile, execFileSync, spawn } from 'child_process';
import fs from 'fs';
import https from 'https';
import path from 'path';
import unzipper from 'unzipper';

import { wLogger } from './logger';
import { sleep } from './utils/sleep';

const progressBarWidth = 40;
const currentVersion = '1.1.0';

const repositoryName = 'tosu';
const fileDestination = path.join(process.cwd(), 'update.zip');
const newExecutablePath = path.join(process.cwd(), 'tosu.exe');
const backupExecutablePath = path.join(process.cwd(), 'tosu_old.exe');

const updateProgressBar = (progress: number): void => {
    const filledWidth = Math.round(progressBarWidth * progress);
    const emptyWidth = progressBarWidth - filledWidth;
    const progressBar = '█'.repeat(filledWidth) + '░'.repeat(emptyWidth);
    process.stdout.write(
        `Download update: [${progressBar}] ${(progress * 100).toFixed(2)}%\r`
    );
};

const deleteNotLocked = async (filePath: string) => {
    try {
        await fs.promises.unlink(filePath);
    } catch (err: any) {
        if (err.code == 'EPERM') {
            await sleep(1000);
            deleteNotLocked(filePath);
            return;
        }

        console.log(err.message, err.code);
    }
};

const downloadFile = (url: string, destination: string): Promise<string> =>
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
            .get(url, options, (res) => {
                // actual download
                https
                    .get(res.headers.location!, options, (response) => {
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
            })
            .on('error', reject);
    });

const unzipAsset = (zipPath: string, extractPath: string): Promise<string> =>
    new Promise((resolve, reject) => {
        const zip = fs.createReadStream(zipPath).pipe(unzipper.Parse());

        zip.on('entry', async (entry) => {
            const fileName = entry.path;
            if (fileName === 'tosu' || fileName === 'tosu.exe') {
                const { name, ext } = path.parse(fileName);
                const modifyName = path.join(extractPath, `${name}_new${ext}`);

                entry
                    .pipe(fs.createWriteStream(modifyName))
                    .on('finish', () => {
                        resolve(modifyName);
                    });
            } else {
                entry.autodrain();
            }
        });

        zip.on('error', reject);
        // zip.on('finish', resolve);
    });

export const autoUpdater = () =>
    new Promise(async (resolve) => {
        wLogger.info('Checking updates');

        const platform = process.platform;
        const platformType =
            platform === 'win32'
                ? 'windows'
                : platform === 'linux'
                ? 'linux'
                : platform === 'darwin'
                ? 'macos'
                : '';
        const platformFileType =
            platform === 'win32'
                ? '.exe'
                : platform === 'linux'
                ? ''
                : platform === 'darwin'
                ? 'macos'
                : '';

        if (platformType === '') {
            wLogger.warn(
                `Unsupported platform (${platform}). Unable to run updater`
            );

            return;
        }

        const request = await fetch(
            `https://api.github.com/repos/KotRikD/${repositoryName}/releases/latest`
        );
        const json = (await request.json()) as any;
        const {
            assets,
            name: versionName
        }: {
            name: string;
            assets: { name: string; browser_download_url: string }[];
        } = json;

        if (versionName.includes(currentVersion)) {
            wLogger.info(`You're using latest version [${currentVersion}] `);

            if (fs.existsSync(fileDestination))
                await deleteNotLocked(fileDestination);
            if (fs.existsSync(backupExecutablePath))
                await deleteNotLocked(backupExecutablePath);

            resolve('exact');
            return;
        }

        const findAsset = assets.find(
            (r) => r.name.includes(platformType) && r.name.endsWith('.zip')
        );
        if (!findAsset) {
            wLogger.info('Files to update not found');

            resolve('noFiles');
            return;
        }

        const downloadAsset = await downloadFile(
            findAsset.browser_download_url,
            fileDestination
        );

        const unzipExecutable = await unzipAsset(downloadAsset, process.cwd());

        const currentExecutablePath = process.argv[0]; // Path to the current executable

        await fs.promises.rename(currentExecutablePath, backupExecutablePath);
        await fs.promises.rename(unzipExecutable, newExecutablePath);

        wLogger.info('Restarting program');

        // Start the updated executable
        const oldProcess = spawn(backupExecutablePath, [], {
            detached: true,
            stdio: 'ignore'
        });

        oldProcess.unref();

        let started = false;
        exec(
            `start "" "${newExecutablePath}"`,
            async (error, stdout, stderr) => {
                if (error) {
                    console.error(`Error starting updated process: ${error}`);
                    return;
                }

                started = true;
            }
        );

        while (started == false) {
            await sleep(1000);
        }

        wLogger.info('Closing program');

        await sleep(1000);
        oldProcess.kill();
        process.exit();
    });
