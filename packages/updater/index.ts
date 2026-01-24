import {
    context,
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

        wLogger.error('Failed to delete unlocked file', (err as any).message);
        wLogger.debug('Delete failure details', err);
    }
};

export const checkUpdates = async (from: 'autoUpdater' | 'startup') => {
    wLogger.info('Checking for updates...');

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
                `Unsupported platform (%${process.platform}%). Unable to run updater`
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

        context.currentVersion = currentVersion;
        context.updateVersion = versionName || currentVersion;

        if (versionName === null || versionName === undefined) {
            wLogger.info(
                `Failed to check updates for version %v${currentVersion}%`
            );

            return new Error('Version the same');
        }

        if (from === 'startup') {
            if (
                versionName.includes(currentVersion) ||
                currentVersion.includes('-forced')
            )
                wLogger.info(
                    `You're using the latest version (%v${currentVersion}%)`
                );
            else
                wLogger.warn(
                    `Update available: %v${currentVersion}% => %v${context.updateVersion}%`
                );
        }

        return { assets, versionName };
    } catch (exc) {
        wLogger.error(`Update check failed:`, (exc as any).message);
        wLogger.debug(`Update check error details:`, exc);

        context.currentVersion = currentVersion;
        context.updateVersion = currentVersion;

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
                `You're using the latest version (%v${currentVersion}%)`
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
                `Update files not found for platform (%${platform.type}%)`
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

        wLogger.info('Restarting program to apply updates...');

        const correctExecutablePath = path.join(
            path.dirname(process.argv[0]),
            `tosu${platform.fileType}`
        );
        spawn(`"${correctExecutablePath}"`, process.argv.slice(1), {
            detached: true,
            shell: true,
            stdio: 'ignore'
        }).unref();

        wLogger.info('Closing program...');

        await sleep(1000);

        process.exit();
    } catch (exc) {
        wLogger.error('Auto-update failed:', (exc as any).message);
        wLogger.debug('Auto-update error details:', exc);

        if (from === 'server' && res) {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ status: (exc as any).message }));
        }

        return exc;
    }
};
