import { wLogger } from '@tosu/common';

import { parseCounterSettings } from './parseSettings';
import { ModifiedWebsocket } from './socket';

export function handleSocketCommands(data: string, socket: ModifiedWebsocket) {
    wLogger.debug(`WS_COMMANDS >>>`, data);
    if (!data.includes(':')) {
        return;
    }

    const [command, payload] = data.split(':');
    let message: any;

    switch (command) {
        case 'getSettings': {
            if (payload !== socket.query?.l) {
                message = {
                    error: 'Wrong overlay'
                };
                break;
            }

            try {
                const result = parseCounterSettings(payload, 'counter/get');
                if (result instanceof Error) {
                    message = {
                        error: result.name
                    };
                    break;
                }

                message = result.values;
            } catch (exc) {
                wLogger.error(
                    `WS_COMMANDS(getSettings) >>>`,
                    (exc as any).message
                );
                wLogger.debug(exc);
            }

            break;
        }
    }

    try {
        socket.send(
            JSON.stringify({
                command,
                message
            })
        );
    } catch (exc) {
        wLogger.error(`WS_COMMANDS(sending) >>>`, (exc as any).message);
        wLogger.debug(exc);
    }
}
