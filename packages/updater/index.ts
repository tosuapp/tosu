import {
    context,
    downloadFile,
    getProgramPath,
    platformResolver,
    sleep,
    unzip,
    verifyDownload,
    wLogger
} from '@tosu/common';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

export type UpdateResult = {
    status: 'updated' | 'up-to-date' | 'noFiles' | 'unverified';
};

const platform = platformResolver(process.platform);

const updateArchivePath = path.join(getProgramPath(), 'update.zip');
const backupExecutablePath = path.join(
    getProgramPath(),
    `tosu_old${platform.fileType}`
);
const executablePath = path.join(getProgramPath(), `tosu${platform.fileType}`);

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
            if (fs.existsSync(updateArchivePath)) {
                await deleteNotLocked(updateArchivePath);
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
            assets: {
                name: string;
                digest: `${string}:${string}`;
                browser_download_url: string;
            }[];
        } = json;

        context.updateVersion = versionName || context.currentVersion;

        if (versionName === null || versionName === undefined) {
            wLogger.info(
                `Failed to check updates for version %v${context.currentVersion}%`
            );

            return new Error('Version the same');
        }

        if (from === 'startup') {
            if (
                versionName.includes(context.currentVersion) ||
                context.currentVersion.includes('-forced')
            )
                wLogger.info(
                    `You're using the latest version (%v${context.currentVersion}%)`
                );
            else
                wLogger.warn(
                    `Update available: %v${context.currentVersion}% => %v${context.updateVersion}%`
                );
        }

        return { assets, versionName };
    } catch (exc) {
        wLogger.error(`Update check failed:`, (exc as any).message);
        wLogger.debug(`Update check error details:`, exc);

        context.updateVersion = context.currentVersion;

        return exc as Error;
    }
};

/** Spawns the freshly unpacked executable with the same arguments and exits. */
async function restartProcess() {
    wLogger.info('Restarting program to apply updates...');

    if (platform.type === 'linux') {
        const stats = await fs.promises.stat(backupExecutablePath);
        await fs.promises.chmod(executablePath, stats.mode).catch(() => null);
    }

    // shell + detached: the new console app gets its own window and outlives this process.
    spawn(`"${executablePath}"`, process.argv.slice(1), {
        detached: true,
        shell: true,
        stdio: 'ignore'
    }).unref();

    wLogger.info('Closing program...');

    await sleep(1000);

    process.exit();
}

export const autoUpdater = async (
    from: 'server' | 'startup'
): Promise<UpdateResult | Error> => {
    // Outside a compiled binary `process.execPath` is the bun runtime itself,
    // and applying an update would rename bun.exe to tosu_old.exe.
    if (!Bun.isStandaloneExecutable) {
        wLogger.debug(
            'Auto-update skipped: not running from a compiled binary'
        );

        return { status: 'up-to-date' };
    }

    try {
        const check = await checkUpdates('autoUpdater');
        if (check instanceof Error) {
            return check;
        }

        const { assets, versionName } = check;
        if (
            versionName.includes(context.currentVersion) ||
            context.currentVersion.includes('-forced')
        ) {
            wLogger.info(
                `You're using the latest version (%v${context.currentVersion}%)`
            );

            if (fs.existsSync(updateArchivePath)) {
                await deleteNotLocked(updateArchivePath);
            }

            if (fs.existsSync(backupExecutablePath)) {
                await deleteNotLocked(backupExecutablePath);
            }

            return { status: 'up-to-date' };
        }

        const findAsset = assets.find(
            (r) => r.name.includes(platform.type) && r.name.endsWith('.zip')
        );
        if (!findAsset) {
            wLogger.info(
                `Update files not found for platform (%${platform.type}%)`
            );
            return { status: 'noFiles' };
        }

        await downloadFile(findAsset.browser_download_url, updateArchivePath);

        const verify = await verifyDownload(
            findAsset.digest,
            updateArchivePath
        );
        if (verify === false) {
            await fs.promises.rm(updateArchivePath);
            return { status: 'unverified' };
        }

        await fs.promises.rename(process.execPath, backupExecutablePath);
        await unzip(updateArchivePath, getProgramPath());

        if (from === 'startup') {
            await restartProcess();
            return { status: 'updated' };
        }

        // Let the HTTP response reach the dashboard before the process goes away.
        setTimeout(() => {
            restartProcess().catch((exc) => {
                wLogger.error('Restart failed:', (exc as any).message);
                wLogger.debug('Restart error details:', exc);
            });
        }, 100);

        return { status: 'updated' };
    } catch (exc) {
        wLogger.error('Auto-update failed:', (exc as any).message);
        wLogger.debug('Auto-update error details:', exc);

        return exc as Error;
    }
};
