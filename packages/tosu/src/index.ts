import {
    argumetsParser,
    config,
    configureLogger,
    updateConfig,
    wLogger
} from '@tosu/common';
import { HttpServer, WebSocketV1, WebSocketV2, WebSocketKeys } from '@tosu/server';
import { autoUpdater } from '@tosu/updater';

import { httpMiddleware } from './api/middleware';
import { baseApi } from './api/router/base';
import { legacyApi } from './api/router/v1';
import { ApiV2 } from './api/router/v2';
import { InstanceManager } from './objects/instanceManager/instanceManager';

(async () => {
    updateConfig();
    configureLogger();

    wLogger.info('Starting tosu');

    const { update } = argumetsParser(process.argv);

    if (
        process.env.NODE_ENV != 'development' &&
        ((update != null && update == true) || update == null)
    )
        await autoUpdater();

    wLogger.info('Searching for osu!');

    const instancesManager = new InstanceManager();
    instancesManager.runWatcher();

    const httpServer = new HttpServer();
    const legacyWebSocket = WebSocketV1(instancesManager);
    const webSocketV2 = WebSocketV2(instancesManager);
    const keysWebsocket = WebSocketKeys(instancesManager);

    httpMiddleware({ app: httpServer, instanceManager: instancesManager });
    baseApi(httpServer);
    legacyApi({ app: httpServer, webSocket: legacyWebSocket });
    ApiV2({
        app: httpServer,
        webSocket: webSocketV2,
        keysWebsocket: keysWebsocket
    });

    httpServer.listen(config.serverPort, config.serverIP);
})();
