import { buildFastifyApp } from './api';
import { config, updateConfig } from './config';
import { configureLogger, wLogger } from './logger';
import { InstanceManager } from './objects/instanceManager/instanceManager';

(async () => {
    updateConfig();
    configureLogger();

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
