import { configureLogger, wLogger } from '@tosu/common';

import { buildFastifyApp } from './api';
import { config, updateConfig } from './config';
import { InstanceManager } from './objects/instanceManager/instanceManager';
import { autoUpdater } from './updater';

(async () => {
    updateConfig();
    configureLogger();

    await autoUpdater();

    wLogger.info('Starting tosu');

    wLogger.info('Searching for osu!');

    const instancesManager = new InstanceManager();
    instancesManager.runWatcher();

    const app = await buildFastifyApp(instancesManager);

    app.listen({
        host: config.serverIP,
        port: config.serverPort
    });
})();
