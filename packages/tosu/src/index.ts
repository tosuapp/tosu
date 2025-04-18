import {
    argumentsParser,
    config,
    getProgramPath,
    wLogger,
    watchConfigFile
} from '@tosu/common';
import { Server } from '@tosu/server';
import { autoUpdater, checkUpdates } from '@tosu/updater';
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

    const { update } = argumentsParser(process.argv);

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

    if (process.platform === 'win32') {
        const currentPath = getProgramPath().toLowerCase();
        if (currentPath.includes('temp') && currentPath.includes('appdata')) {
            wLogger.warn(
                'Do not run tosu in temp folder. Incase if you running it from archive, please extract tosu from archive (aka .zip)'
            );
            return;
        }

        if (currentPath.includes('onedrive')) {
            wLogger.warn(
                'tosu cannot run from a OneDrive folder due to potential sync conflicts and performance issues.'
            );
            wLogger.warn('Please move tosu to a desktop, or somewhere else.');
            return;
        }
    }

    wLogger.info('Searching for osu!');

    httpServer.start();
    instanceManager.runWatcher();
    instanceManager.runDetemination();
})();
