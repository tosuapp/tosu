import { argumetsParser, configureLogger, wLogger } from '@tosu/common';
import { autoUpdater } from '@tosu/updater';

import { buildFastifyApp } from './api';
import { config, updateConfig } from './config';
import { InstanceManager } from './objects/instanceManager/instanceManager';

(async () => {
    wLogger.info('Starting tosu');

    const { update } = argumetsParser(process.argv);

    if ((update != null && update == true) || update == null)
        await autoUpdater();

    updateConfig();
    configureLogger();

    wLogger.info('Searching for osu!');

    const instancesManager = new InstanceManager();
    instancesManager.runWatcher();

    const app = await buildFastifyApp(instancesManager);

    app.listen({
        host: config.serverIP,
        port: config.serverPort
    });
})();
