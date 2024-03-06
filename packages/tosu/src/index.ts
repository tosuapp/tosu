import { argumetsParser, wLogger, watchConfigFile } from '@tosu/common';
import { Server } from '@tosu/server';
import { autoUpdater } from '@tosu/updater';

import { InstanceManager } from './objects/instanceManager/instanceManager';

(async () => {
    wLogger.info('Starting tosu');

    const instanceManager = new InstanceManager();
    const httpServer = new Server({ instanceManager });

    httpServer.start();
    watchConfigFile({ httpServer });

    const { update } = argumetsParser(process.argv);

    if (
        process.env.NODE_ENV != 'development' &&
        ((update != null && update == true) || update == null)
    )
        await autoUpdater();

    wLogger.info('Searching for osu!');

    instanceManager.runWatcher();
})();
