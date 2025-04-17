import { argumetsParser, config, wLogger, watchConfigFile } from '@tosu/common';
import { Server } from '@tosu/server';
import { autoUpdater, checkUpdates } from '@tosu/updater';
import { homedir } from 'node:os';
import { resolve } from 'path';
import { Process } from 'tsprocess/dist/process';

import { InstanceManager } from '@/instances/manager';

// NOTE: _version.js packs with pkg support in tosu build
const currentVersion = require(process.cwd() + '/_version.js');

(async () => {
    config.currentVersion = currentVersion;
    wLogger.info(`Starting tosu`);

    Process.disablePowerThrottling();

    const instanceManager = new InstanceManager();
    const httpServer = new Server({ instanceManager });

    watchConfigFile({ httpServer, initial: true });

    const { update } = argumetsParser(process.argv);

    const isDev = process.env.NODE_ENV === 'development';
    const isConfigUpdate = config.enableAutoUpdate === true;
    if (update !== null && update !== undefined) {
        if (update === true) {
            await autoUpdater();
        } else {
            await checkUpdates();
        }
    } else {
        if (isDev === false && isConfigUpdate) {
            await autoUpdater();
        } else {
            await checkUpdates();
        }
    }

    let isInOneDrive = false;
    if (process.platform === 'win32') {
        const currentPath = resolve().toLowerCase();
        const homeDir = homedir().toLowerCase();

        // NOTE: The listed strings are only the default OneDrive paths.
        const oneDrivePaths = [
            'OneDrive',
            'OneDrive - Personal',
            'OneDrive - Business',
            'OneDrive for Business'
        ].map((path) => resolve(homeDir, path).toLowerCase());

        isInOneDrive = oneDrivePaths.some((path) =>
            currentPath.startsWith(path)
        );
    }

    if (isInOneDrive === false) {
        wLogger.info('Searching for osu!');

        httpServer.start();
        instanceManager.runWatcher();
        instanceManager.runDetemination();
    } else {
        wLogger.warn(
            'tosu cannot run from a OneDrive folder due to potential sync conflicts and performance issues.'
        );
        wLogger.warn('Please move the application to a local folder');
    }
})();
