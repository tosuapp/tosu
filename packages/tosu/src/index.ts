import { argumetsParser, wLogger, watchConfigFile } from '@tosu/common';
import { Server } from '@tosu/server';
import { autoUpdater } from '@tosu/updater';

import { InstanceManager } from './objects/instanceManager/instanceManager';

(async () => {
    wLogger.info('Starting tosu');

    const instanceManager = new InstanceManager();
    const httpServer = new Server({ instanceManager });

    const { update } = argumetsParser(process.argv);
    if (
        process.env.NODE_ENV !== 'development' &&
        ((update !== null && update === true) || update === null)
    ) {
        await autoUpdater();
    }

    watchConfigFile({ httpServer, initial: true });

    wLogger.info('Searching for osu!');

    httpServer.start();
    instanceManager.runWatcher();
})();
