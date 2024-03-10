import { config, wLogger } from '@tosu/common';
import WebSocket from 'ws';

import { getUniqueID } from './hashing';

interface ModifiedWebsocket extends WebSocket {
    id: string;
}

export class Websocket {
    private instanceManager: any;
    private pollRateFieldName: string;
    private stateFunctionName: string;

    socket: WebSocket.Server;
    clients = new Map<string, ModifiedWebsocket>();

    constructor({
        instanceManager,
        pollRateFieldName,
        stateFunctionName
    }: {
        instanceManager: any;
        pollRateFieldName: string;
        stateFunctionName: 'getState' | 'getStateV2' | 'getPreciseData';
    }) {
        this.socket = new WebSocket.Server({ noServer: true });

        this.instanceManager = instanceManager;
        this.pollRateFieldName = pollRateFieldName;
        this.stateFunctionName = stateFunctionName;

        this.handle = this.handle.bind(this);
        this.loop = this.loop.bind(this);

        this.handle();
    }

    handle() {
        this.socket.on('connection', (ws: ModifiedWebsocket) => {
            ws.id = getUniqueID();

            wLogger.debug(`WS(CONNECTED) >>> ${ws.id}`);

            ws.on('close', (reason, description) => {
                this.clients.delete(ws.id);

                wLogger.debug(
                    `WS(CLOSED) >>> ${ws.id}: ${reason} [${description}]`
                );
            });

            ws.on('error', (reason, description) => {
                this.clients.delete(ws.id);

                wLogger.debug(
                    `WS(ERROR) >>> ${ws.id}: ${reason} [${description}]`
                );
            });

            this.clients.set(ws.id, ws);
        });

        this.loop();
    }

    loop() {
        try {
            const osuInstances: any = Object.values(
                this.instanceManager.osuInstances || {}
            );
            if (osuInstances.length < 1) {
                setTimeout(this.loop, 500);
                return;
            }

            if (this.clients.size > 0) {
                try {
                    const message = JSON.stringify(
                        osuInstances[0][this.stateFunctionName](
                            this.instanceManager
                        )
                    );

                    this.clients.forEach((client, key) => client.send(message));
                } catch (error) {}
            }

            setTimeout(this.loop, config[this.pollRateFieldName]);
        } catch (error) {
            wLogger.error((error as any).message);

            setTimeout(this.loop, 1000);
            return;
        }
    }
}
