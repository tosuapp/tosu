import {
    argumentsParser,
    cleanupLogs,
    config,
    configEvents,
    configInitialization,
    context,
    getProgramPath,
    wLogger
} from '@tosu/common';
import { Server } from '@tosu/server';
import { autoUpdater, checkUpdates } from '@tosu/updater';
import { Process } from 'tsprocess';

import { InstanceManager } from '@/instances/manager';

// NOTE: _version.js packs with pkg support in tosu build
const currentVersion = require('./_version.js');

(async () => {
    context.currentVersion = currentVersion;
    wLogger.info(`Starting %tosu%`);

    Process.disablePowerThrottling();

    const instanceManager = new InstanceManager();
    const httpServer = new Server({ instanceManager });

    await configInitialization();

    const { update, onedrive: onedriveBypass } = argumentsParser(process.argv);

    const isDev = process.env.NODE_ENV === 'development';
    const isConfigUpdate = config.enableAutoUpdate === true;
    if (isDev) {
        context.updateVersion = currentVersion;
    } else {
        if (
            (update !== null && update !== undefined && update === true) ??
            isConfigUpdate
        ) {
            await autoUpdater('startup');
        } else {
            await checkUpdates('startup');
        }
    }

    if (process.platform === 'win32') {
        const currentPath = getProgramPath();
        if (process.env.TEMP && currentPath.startsWith(process.env.TEMP)) {
            wLogger.warn(
                'It appears you are running %tosu% from an archive. Please extract it to a folder before running.'
            );
            return;
        }

        if (
            onedriveBypass !== true &&
            process.env.OneDrive &&
            currentPath.startsWith(process.env.OneDrive)
        ) {
            wLogger.warn(
                '%tosu% cannot run from a OneDrive folder due to potential sync conflicts and performance issues.'
            );
            wLogger.warn('Please move %tosu% to a different folder.');
            return;
        }
    }

    cleanupLogs();

    wLogger.info('Searching for %osu!% process...');

    httpServer.start();
    instanceManager.runWatcher();
    instanceManager.runDetemination();

    configEvents.addListener(
        'change',
        httpServer.handleConfigUpdate.bind(httpServer)
    );
    configEvents.addListener(
        'change',
        instanceManager.handleConfigUpdate.bind(instanceManager)
    );

    if (config.enableIngameOverlay) instanceManager.startOverlay();
})();
