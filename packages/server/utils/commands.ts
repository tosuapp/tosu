import { JsonSafeParse, wLogger } from '@tosu/common';

import { getLocalCounters } from './counters';
import { parseCounterSettings } from './parseSettings';
import { ModifiedWebsocket } from './socket';

export function handleSocketCommands(data: string, socket: ModifiedWebsocket) {
    wLogger.debug('[ws]', `commands`, data);
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
        case 'getCounters': {
            if (
                requestedFrom !== '__ingame__' ||
                requestedName !== requestedFrom
            ) {
                message = {
                    error: 'Wrong overlay'
                };
                break;
            }

            message = getLocalCounters();
            break;
        }

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
                        error: result.message
                    };
                    break;
                }

                message = result.values;
            } catch (exc) {
                wLogger.error(
                    '[ws]',
                    `commands`,
                    command,
                    (exc as Error).message
                );
                wLogger.debug('[ws]', `commands`, command, exc);
            }

            break;
        }

        case 'applyFilters': {
            const json = JsonSafeParse({
                isFile: false,
                payload,
                defaultValue: new Error('Broken json')
            });
            if (json instanceof Error) {
                wLogger.error(
                    '[ws]',
                    `commands`,
                    command,
                    (json as Error).message
                );
                wLogger.debug('[ws]', `commands`, command, json);
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
                    '[ws]',
                    `commands`,
                    command,
                    (exc as Error).message
                );
                wLogger.debug('[ws]', `commands`, command, exc);
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
        wLogger.error('[ws]', `commands-send`, (exc as Error).message);
        wLogger.debug('[ws]', `commands-send`, exc);
    }
}
