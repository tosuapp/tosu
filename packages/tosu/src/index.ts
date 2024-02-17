import {
    argumetsParser,
    config,
    configureLogger,
    updateConfig,
    wLogger
} from '@tosu/common';
import { HttpServer, WebSocketV1 } from '@tosu/server';
import { autoUpdater } from '@tosu/updater';

import { legacyApi } from './api/router/v1';
import { InstanceManager } from './objects/instanceManager/instanceManager';

(async () => {
    updateConfig();
    configureLogger();

    wLogger.info('Starting tosu');

    const { update } = argumetsParser(process.argv);

    if ((update != null && update == true) || update == null)
        await autoUpdater();

    wLogger.info('Searching for osu!');

    const instancesManager = new InstanceManager();
    instancesManager.runWatcher();

    const httpServer = new HttpServer();
    const oldWebsocket = WebSocketV1(instancesManager);
    legacyApi({
        app: httpServer,
        instanceManager: instancesManager,
        oldWebsocket: oldWebsocket
    });
    httpServer.listen(config.serverPort, config.serverIP);
})();
