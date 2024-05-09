import { argumetsParser, config, wLogger, watchConfigFile } from '@tosu/common';
import { Server } from '@tosu/server';
import { autoUpdater, checkUpdates } from '@tosu/updater';

import { InstanceManager } from './objects/instanceManager/instanceManager';

(async () => {
    wLogger.info('Starting tosu');

    const instanceManager = new InstanceManager();
    const httpServer = new Server({ instanceManager });

    watchConfigFile({ httpServer, initial: true });

    const { update } = argumetsParser(process.argv);

    const isDev = process.env.NODE_ENV === 'development';
    const isUpdateArg = (update !== null && update === true) || update === null;
    const isConfigUpdate = config.enableAutoUpdate === true;
    if ((isDev === false && isConfigUpdate) || isUpdateArg) {
        await autoUpdater();
    } else {
        await checkUpdates();
    }

    wLogger.info('Searching for osu!');

    httpServer.start();
    instanceManager.runWatcher();
})();
