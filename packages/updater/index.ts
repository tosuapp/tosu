import {
    downloadFile,
    platformResolver,
    sleep,
    unzipTosu,
    wLogger
} from '@tosu/common';
import { exec, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

// NOTE: _version.js packs with pkg support in tosu build
const currentVersion = require(process.cwd() + '/_version.js');

const repositoryName = 'tosu';
const fileDestination = path.join(process.cwd(), 'update.zip');
const newExecutablePath = path.join(process.cwd(), 'tosu.exe');
const backupExecutablePath = path.join(process.cwd(), 'tosu_old.exe');

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

export const autoUpdater = () =>
    new Promise(async (resolve) => {
        wLogger.info('Checking updates');

        const { platformType, platformFileType } = platformResolver(
            process.platform
        );

        if (platformType === '') {
            wLogger.warn(
                `Unsupported platform (${process.platform}). Unable to run updater`
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

        const unzipExecutable = await unzipTosu(downloadAsset, process.cwd());

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

        exec(
            `start "" "${newExecutablePath}"`,
            async (error, stdout, stderr) => {
                if (error) {
                    console.error(`Error starting updated process: ${error}`);
                    return;
                }

                await sleep(2500);

                wLogger.info('Closing program');

                await sleep(1000);

                oldProcess.kill();
                process.exit();
            }
        );
    });
