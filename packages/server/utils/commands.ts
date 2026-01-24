import { JsonSafeParse, wLogger } from '@tosu/common';

import { getLocalCounters } from './counters';
import { parseCounterSettings } from './parseSettings';
import { ModifiedWebsocket } from './socket';

export function handleSocketCommands(data: string, socket: ModifiedWebsocket) {
    wLogger.debug(`Received WebSocket command: %${data}%`);
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
                    `Failed to get data for command %${command}%:`,
                    (exc as Error).message
                );
                wLogger.debug(`Settings retrieval error details:`, exc);
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
                    `Failed to parse JSON for command %${command}%:`,
                    (json as Error).message
                );
                wLogger.debug(`JSON parsing error details:`, json);
                return;
            }

            try {
                if (!Array.isArray(json)) {
                    wLogger.error(
                        `Invalid filter format for socket %${socket.id}% [${socket.pathname}]:`,
                        `Filters should be an array of strings (received: ${json})`
                    );
                    return;
                }

                socket.filters = json;
                return;
            } catch (exc) {
                wLogger.error(
                    `Failed to apply filters for command %${command}%:`,
                    (exc as Error).message
                );
                wLogger.debug(`Filter application error details:`, exc);
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
        wLogger.error(
            `Failed to send response for command %${command}%:`,
            (exc as Error).message
        );
        wLogger.debug(`Command response error details:`, exc);
    }
}
