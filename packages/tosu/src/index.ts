import { argumetsParser, wLogger, watchConfigFile } from '@tosu/common';
import { Server } from '@tosu/server';
import { autoUpdater } from '@tosu/updater';

import { InstanceManager } from './objects/instanceManager/instanceManager';

(async () => {
    const instanceManager = new InstanceManager();
    const httpServer = new Server({ instanceManager });

    watchConfigFile({ httpServer });

    wLogger.info('Starting tosu');

    const { update } = argumetsParser(process.argv);

    if (
        process.env.NODE_ENV != 'development' &&
        ((update != null && update == true) || update == null)
    )
        await autoUpdater();

    wLogger.info('Searching for osu!');

    instanceManager.runWatcher();
    httpServer.start();
})();
