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

    const requestedFrom = decodeURI(socket.query?.l || '');
    const requestedName = decodeURI(payload || '');
    switch (command) {
        case 'getSettings': {
            if (requestedName !== requestedFrom) {
                message = {
                    error: 'Wrong overlay'
                };
                break;
            }

            try {
                const result = parseCounterSettings(
                    requestedName,
                    'counter/get'
                );
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
