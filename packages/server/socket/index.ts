import { config, sleep, wLogger } from '@tosu/common';
import WebSocket from 'ws';

const socketsHandler = ({
    instancesManager,
    pollRate,
    socket,
    state
}: {
    socket: WebSocket.Server;
    instancesManager: any;
    pollRate: number;
    state: string;
}) => {
    socket.on('connection', async (ws) => {
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

            try {
                ws.send(
                    JSON.stringify(osuInstances[0][state](instancesManager))
                );
            } catch (error) {}

            await sleep(pollRate);
        }
    });
};

export const WebSocketV1 = (instancesManager: any) => {
    const wss = new WebSocket.Server({ noServer: true });

    socketsHandler({
        socket: wss,
        instancesManager,
        pollRate: config.pollRate,
        state: 'getState'
    });

    return wss;
};

export const WebSocketV2 = (instancesManager: any) => {
    const wss = new WebSocket.Server({ noServer: true });

    socketsHandler({
        socket: wss,
        instancesManager,
        pollRate: config.pollRate,
        state: 'getStateV2'
    });

    return wss;
};

export const WebSocketKeys = (instancesManager: any) => {
    const wss = new WebSocket.Server({ noServer: true });

    socketsHandler({
        socket: wss,
        instancesManager,
        pollRate: config.keyOverlayPollRate,
        state: 'getKeyOverlay'
    });

    return wss;
};

export { WebSocket };
