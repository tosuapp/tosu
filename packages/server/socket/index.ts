import { config, sleep, wLogger } from '@tosu/common';
import WebSocket from 'ws';

export const WebSocketV1 = (instancesManager: any) => {
    const wss = new WebSocket.Server({ noServer: true });
    wss.on('connection', async (ws) => {
        wLogger.debug('>>> ws: CONNECTED');
        let isSocketConnected = true;

        ws.on('close', function (reasonCode, description) {
            isSocketConnected = false;
            wLogger.debug('>>> ws: CLOSED');
        });

        ws.on('error', function (reasonCode, description) {
            isSocketConnected = false;
            wLogger.debug(`>>> ws: error: ${reasonCode} [${description}]`);
        });

        while (isSocketConnected) {
            const osuInstances: any = Object.values(
                instancesManager.osuInstances || {}
            );
            if (osuInstances.length < 1) {
                await sleep(500);
                continue;
            }

            ws.send(JSON.stringify(osuInstances[0].getState(instancesManager)));
            await sleep(config.pollRate);
        }
    });

    return wss;
};

export const WebSocketV2 = (instancesManager: any) => {
    const wss = new WebSocket.Server({ noServer: true });
    wss.on('connection', async (ws) => {
        wLogger.debug('>>> websocketV2: CONNECTED');
        let isSocketConnected = true;

        ws.on('close', function (reasonCode, description) {
            isSocketConnected = false;
            wLogger.debug('>>> websocketV2: CLOSED');
        });

        ws.on('error', function (reasonCode, description) {
            isSocketConnected = false;
            wLogger.debug(
                `>>> websocketV2: error: ${reasonCode} [${description}]`
            );
        });

        while (isSocketConnected) {
            const osuInstances: any = Object.values(
                instancesManager.osuInstances || {}
            );
            if (osuInstances.length < 1) {
                await sleep(500);
                continue;
            }

            ws.send(
                JSON.stringify(osuInstances[0].getStateV2(instancesManager))
            );
            await sleep(config.pollRate);
        }
    });

    return wss;
};

export const WebSocketKeys = (instancesManager: any) => {
    const wss = new WebSocket.Server({ noServer: true });
    wss.on('connection', async (ws) => {
        wLogger.debug('>>> websocketV2: CONNECTED');
        let isSocketConnected = true;

        ws.on('close', function (reasonCode, description) {
            isSocketConnected = false;
            wLogger.debug('>>> websocketV2: CLOSED');
        });

        ws.on('error', function (reasonCode, description) {
            isSocketConnected = false;
            wLogger.debug(
                `>>> websocketV2: error: ${reasonCode} [${description}]`
            );
        });

        while (isSocketConnected) {
            const osuInstances: any = Object.values(
                instancesManager.osuInstances || {}
            );
            if (osuInstances.length < 1) {
                await sleep(500);
                continue;
            }

            ws.send(JSON.stringify(osuInstances[0].getKeyOverlay()));
            await sleep(config.keyOverlayPollRate);
        }
    });

    return wss;
};

export { WebSocket };
