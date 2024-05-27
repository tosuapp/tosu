import { JsonSafeParse, wLogger } from '@tosu/common';

import { parseCounterSettings } from './parseSettings';
import { ModifiedWebsocket } from './socket';

export function handleSocketCommands(data: string, socket: ModifiedWebsocket) {
    wLogger.debug(`WS_COMMANDS >>>`, data);
    if (!data.includes(':')) {
        return;
    }

    const index = data.indexOf(':');
    const command = data.substring(0, index);
    const payload = data.substring(index + 1);

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

        case 'applyFilters': {
            const json = JsonSafeParse(payload, new Error('Broken json'));
            if (json instanceof Error) {
                wLogger.error(`applyFilter >>>`, (json as any).message);
                wLogger.debug(json);
                return;
            }

            try {
                if (!Array.isArray(json)) {
                    wLogger.error(
                        `applyFilter(${socket.id})[${socket.pathname}] >>>`,
                        `Filters should be array of strings (${json})`
                    );
                    return;
                }

                socket.filters = json;
                return;
            } catch (exc) {
                wLogger.error(
                    `WS_COMMANDS(applyFilter) >>>`,
                    (exc as any).message
                );
                wLogger.debug(exc);
            }
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
