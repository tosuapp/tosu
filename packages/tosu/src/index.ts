import { argumetsParser, config, wLogger, watchConfigFile } from '@tosu/common';
import { Server } from '@tosu/server';
import { autoUpdater, checkUpdates } from '@tosu/updater';
import { Process } from 'tsprocess/dist/process';

import { InstanceManager } from './objects/instanceManager/instanceManager';

// NOTE: _version.js packs with pkg support in tosu build
const currentVersion = require(process.cwd() + '/_version.js');

(async () => {
    wLogger.info(`Starting tosu v${currentVersion}`);

    const currentResolution = Process.disablePowerThrottling();

    if (currentResolution > 0) {
        wLogger.info(
            `Successfully disabled power throttling (resolution: ${currentResolution / 10000} ms)`
        );
    } else {
        wLogger.warn(`Failed to disable power throttling`);
    }
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

    wLogger.info('Searching for osu!');

    httpServer.start();
    instanceManager.runWatcher();
})();
