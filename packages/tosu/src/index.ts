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

    const { update, onedrive: onedriveBypass } = argumentsParser(process.argv);

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
        const currentPath = getProgramPath();
        if (process.env.TEMP && currentPath.startsWith(process.env.TEMP)) {
            wLogger.warn(
                'Incase if you running tosu from archive, please extract it to a folder'
            );
            return;
        }

        if (
            onedriveBypass !== true &&
            process.env.OneDrive &&
            currentPath.startsWith(process.env.OneDrive)
        ) {
            wLogger.warn(
                'tosu cannot run from a OneDrive folder due to potential sync conflicts and performance issues.'
            );
            wLogger.warn('Please move tosu to different folder');
            return;
        }
    }

    wLogger.info('Searching for osu!');

    httpServer.start();
    instanceManager.runWatcher();
    instanceManager.runDetemination();
})();
