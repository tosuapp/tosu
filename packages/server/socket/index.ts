import { config, sleep, wLogger } from '@tosu/common';
import WebSocket from 'ws';

interface ModifiedWebsocket extends WebSocket {
    id: string;
}

interface ModifiedSocket extends WebSocket.Server {
    getUniqueID: () => string;
}

const connectedClients = {
    v1: new Map<string, ModifiedWebsocket>(),
    v2: new Map<string, ModifiedWebsocket>(),
    keyOvelay: new Map<string, ModifiedWebsocket>()
};

const socketsHandler = async ({
    socketType,
    instancesManager,
    pollRate,
    socket,
    state
}: {
    socketType: 'v1' | 'v2' | 'keyOvelay';
    socket: ModifiedSocket;
    instancesManager: any;
    pollRate: number;
    state: string;
}) => {
    socket.getUniqueID = function () {
        function s4() {
            return Math.floor((1 + Math.random()) * 0x10000)
                .toString(16)
                .substring(1);
        }
        return s4() + s4() + '-' + s4();
    };

    socket.on('connection', (ws: ModifiedWebsocket) => {
        ws.id = socket.getUniqueID();

        wLogger.debug(
            `[${ws.id}](${connectedClients[socketType].size}) >>> ws: CONNECTED`
        );

        ws.on('close', function (reasonCode, description) {
            connectedClients[socketType].delete(ws.id);

            wLogger.debug(
                `[${ws.id}](${connectedClients[socketType].size}) >>> ws: CLOSED`
            );
        });

        ws.on('error', function (reasonCode, description) {
            connectedClients[socketType].delete(ws.id);

            wLogger.debug(
                `[${ws.id}](${connectedClients[socketType].size}) >>> ws: error: ${reasonCode} [${description}]`
            );
        });

        connectedClients[socketType].set(ws.id, ws);
    });

    while (true) {
        const osuInstances: any = Object.values(
            instancesManager.osuInstances || {}
        );
        if (osuInstances.length < 1) {
            await sleep(500);
            continue;
        }

        const clients = connectedClients[socketType];
        if (clients.size > 0) {
            clients.forEach((value, key) => {
                try {
                    value.send(
                        JSON.stringify(osuInstances[0][state](instancesManager))
                    );
                } catch (error) {}
            });
        }

        await sleep(pollRate);
    }
};

export const WebSocketV1 = (instancesManager: any) => {
    const wss = new WebSocket.Server({ noServer: true }) as ModifiedSocket;

    socketsHandler({
        socketType: 'v1',
        socket: wss,
        instancesManager,
        pollRate: config.pollRate,
        state: 'getState'
    });

    return wss;
};

export const WebSocketV2 = (instancesManager: any) => {
    const wss = new WebSocket.Server({ noServer: true }) as ModifiedSocket;

    socketsHandler({
        socketType: 'v2',
        socket: wss,
        instancesManager,
        pollRate: config.pollRate,
        state: 'getStateV2'
    });

    return wss;
};

export const WebSocketKeys = (instancesManager: any) => {
    const wss = new WebSocket.Server({ noServer: true }) as ModifiedSocket;

    socketsHandler({
        socketType: 'keyOvelay',
        socket: wss,
        instancesManager,
        pollRate: config.keyOverlayPollRate,
        state: 'getKeyOverlay'
    });

    return wss;
};

export { WebSocket };
