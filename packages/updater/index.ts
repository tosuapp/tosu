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
import { IncomingMessage, ServerResponse } from 'http';
import path from 'path';

// NOTE: _version.js packs with pkg support in tosu build
const currentVersion = require(process.cwd() + '/_version.js');

const platform = platformResolver(process.platform);

const fileDestination = path.join(getProgramPath(), 'update.zip');
const backupExecutablePath = path.join(
    getProgramPath(),
    `tosu_old${platform.fileType}`
);

const deleteNotLocked = async (filePath: string) => {
    try {
        await fs.promises.unlink(filePath);
    } catch (err) {
        if ((err as any).code === 'EPERM') {
            await sleep(1000);
            deleteNotLocked(filePath);
            return;
        }

        wLogger.error('[updater]', 'deleteNotLocked', (err as any).message);
        wLogger.debug('[updater]', 'deleteNotLocked', err);
    }
};

export const checkUpdates = async (from: 'autoUpdater' | 'startup') => {
    wLogger.info('[updater]', 'Checking updates');

    try {
        if (from === 'startup') {
            if (fs.existsSync(fileDestination)) {
                await deleteNotLocked(fileDestination);
            }

            if (fs.existsSync(backupExecutablePath)) {
                await deleteNotLocked(backupExecutablePath);
            }
        }

        if (platform.type === 'unknown') {
            wLogger.warn(
                '[updater]',
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
            wLogger.info(
                '[updater]',
                `Failed to check updates v${currentVersion}`
            );

            return new Error('Version the same');
        }

        if (from === 'startup') {
            if (
                versionName.includes(currentVersion) ||
                currentVersion.includes('-forced')
            )
                wLogger.info(
                    '[updater]',
                    `You're using latest version v${currentVersion}`
                );
            else
                wLogger.warn(
                    '[updater]',
                    `Update available v${currentVersion} => v${config.updateVersion}`
                );
        }

        return { assets, versionName };
    } catch (exc) {
        wLogger.error('[updater]', `checkUpdates`, (exc as any).message);
        wLogger.debug('[updater]', `checkUpdates`, exc);

        config.currentVersion = currentVersion;
        config.updateVersion = currentVersion;

        return exc as Error;
    }
};

export const autoUpdater = async (
    from: 'server' | 'startup',
    res?: ServerResponse<IncomingMessage>
) => {
    try {
        const check = await checkUpdates('autoUpdater');
        if (check instanceof Error) {
            return check;
        }

        const { assets, versionName } = check;
        if (
            versionName.includes(currentVersion) ||
            currentVersion.includes('-forced')
        ) {
            wLogger.info(
                '[updater]',
                `You're using latest version v${currentVersion}`
            );

            if (fs.existsSync(fileDestination)) {
                await deleteNotLocked(fileDestination);
            }

            if (fs.existsSync(backupExecutablePath)) {
                await deleteNotLocked(backupExecutablePath);
            }

            return;
        }

        const findAsset = assets.find(
            (r) => r.name.includes(platform.type) && r.name.endsWith('.zip')
        );
        if (!findAsset) {
            wLogger.info(
                '[updater]',
                `Files to update not found (${platform.type})`
            );
            return 'noFiles';
        }

        const downloadAsset = await downloadFile(
            findAsset.browser_download_url,
            fileDestination
        );

        const currentExecutablePath = process.argv[0]; // Path to the current executable

        await fs.promises.rename(currentExecutablePath, backupExecutablePath);
        await unzip(downloadAsset, getProgramPath());

        // close request to allow destroy server
        if (from === 'server' && res) {
            res.setHeader('Content-Type', 'application/json');
            res.end('{"status":"updated"}');
        }

        await sleep(100);

        wLogger.info('[updater]', 'Restarting program');

        const correctExecutablePath = path.join(
            path.dirname(process.argv[0]),
            `tosu${platform.fileType}`
        );
        spawn(`"${correctExecutablePath}"`, process.argv.slice(1), {
            detached: true,
            shell: true,
            stdio: 'ignore'
        }).unref();

        wLogger.info('[updater]', 'Closing program');

        await sleep(1000);

        process.exit();
    } catch (exc) {
        wLogger.error('[updater]', 'autoUpdater', (exc as any).message);
        wLogger.debug('[updater]', 'autoUpdater', exc);

        if (from === 'server' && res) {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ status: (exc as any).message }));
        }

        return exc;
    }
};
