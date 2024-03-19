import {
    downloadFile,
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

const repositoryName = 'tosu';
const fileDestination = path.join(process.cwd(), 'update.zip');
const backupExecutablePath = path.join(process.cwd(), 'tosu_old.exe');

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

export const autoUpdater = async () => {
    wLogger.info('Checking updates');

    const { platformType } = platformResolver(process.platform);

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
    if (versionName === null) {
        wLogger.info(`Failed to check updates [${currentVersion}] `);

        return 'exact';
    }

    if (versionName.includes(currentVersion)) {
        wLogger.info(`You're using latest version [${currentVersion}] `);

        if (fs.existsSync(fileDestination)) {
            await deleteNotLocked(fileDestination);
        }

        if (fs.existsSync(backupExecutablePath)) {
            await deleteNotLocked(backupExecutablePath);
        }

        return 'exact';
    }

    const findAsset = assets.find(
        (r) => r.name.includes(platformType) && r.name.endsWith('.zip')
    );
    if (!findAsset) {
        wLogger.info('Files to update not found');
        return 'noFiles';
    }

    const downloadAsset = await downloadFile(
        findAsset.browser_download_url,
        fileDestination
    );

    const currentExecutablePath = process.argv[0]; // Path to the current executable

    await fs.promises.rename(currentExecutablePath, backupExecutablePath);

    await unzip(downloadAsset, process.cwd());

    wLogger.info('Restarting program');

    spawn(process.argv[0], process.argv.slice(1), {
        detached: true,
        shell: true,
        stdio: 'ignore'
    }).unref();

    wLogger.info('Closing program');

    await sleep(1000);

    process.exit();
};
