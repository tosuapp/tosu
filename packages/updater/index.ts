import {
    config,
    downloadFile,
    getProgramPath,
    platformResolver,
    sleep,
    unzip,
    wLogger
} from '@tosu/common';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

// NOTE: _version.js packs with pkg support in tosu build
const currentVersion = require(process.cwd() + '/_version.js');

const fileDestination = path.join(getProgramPath(), 'update.zip');
const backupExecutablePath = path.join(getProgramPath(), 'tosu_old.exe');

const deleteNotLocked = async (filePath: string) => {
    try {
        await fs.promises.unlink(filePath);
    } catch (err: any) {
        if (err.code === 'EPERM') {
            await sleep(1000);
            deleteNotLocked(filePath);
            return;
        }

        wLogger.error(err.message);
        wLogger.debug(err);
    }
};

export const checkUpdates = async () => {
    wLogger.info('Checking updates');

    try {
        const { platformType } = platformResolver(process.platform);

        if (platformType === '') {
            wLogger.warn(
                `Unsupported platform (${process.platform}). Unable to run updater`
            );

            return new Error(
                `Unsupported platform (${process.platform}). Unable to run updater`
            );
        }

        const request = await fetch(
            `https://api.github.com/repos/tosuapp/tosu/releases/latest`
        );
        const json = (await request.json()) as any;
        const {
            assets,
            name: versionName
        }: {
            name: string;
            assets: { name: string; browser_download_url: string }[];
        } = json;

        config.currentVersion = currentVersion;
        config.updateVersion = versionName || currentVersion;

        if (versionName === null || versionName === undefined) {
            wLogger.info(`Failed to check updates v${currentVersion}`);

            return new Error('Version the same');
        }

        return { assets, versionName, platformType };
    } catch (exc) {
        wLogger.error(`checkUpdates`, (exc as any).message);
        wLogger.debug(exc);

        config.currentVersion = currentVersion;
        config.updateVersion = currentVersion;

        return exc as Error;
    }
};

export const autoUpdater = async () => {
    try {
        const check = await checkUpdates();
        if (check instanceof Error) {
            return check;
        }

        const { assets, versionName, platformType } = check;
        if (versionName.includes(currentVersion)) {
            wLogger.info(`You're using latest version v${currentVersion}`);

            if (fs.existsSync(fileDestination)) {
                await deleteNotLocked(fileDestination);
            }

            if (fs.existsSync(backupExecutablePath)) {
                await deleteNotLocked(backupExecutablePath);
            }

            return;
        }

        const findAsset = assets.find(
            (r) => r.name.includes(platformType) && r.name.endsWith('.zip')
        );
        if (!findAsset) {
            wLogger.info(`Files to update not found (${platformType})`);
            return 'noFiles';
        }

        const downloadAsset = await downloadFile(
            findAsset.browser_download_url,
            fileDestination
        );

        const currentExecutablePath = process.argv[0]; // Path to the current executable

        await fs.promises.rename(currentExecutablePath, backupExecutablePath);
        await unzip(downloadAsset, getProgramPath());

        wLogger.info('Restarting program');

        spawn(`"${process.argv[0]}"`, process.argv.slice(1), {
            detached: true,
            shell: true,
            stdio: 'ignore'
        }).unref();

        wLogger.info('Closing program');

        await sleep(1000);

        process.exit();
    } catch (exc) {
        wLogger.error('autoUpdater', (exc as any).message);
        wLogger.debug('autoUpdater', exc);

        return exc;
    }
};
