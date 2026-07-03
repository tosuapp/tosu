import { JsonSafeParse, debounce, wLogger } from '@tosu/common';

import { getLocalCounters, saveSettings } from './counters';
import { parseCounterSettings } from './parseSettings';
import { ModifiedWebsocket, Websocket } from './socket';

const saveDelay = debounce((overlayFrom: string, json: any) => {
    const html = saveSettings(overlayFrom, json);
    if (html instanceof Error) {
        wLogger.error(
            `Failed to save settings for %${overlayFrom}%: ${html.message}`
        );
        wLogger.debug(`Detailed error object for failed save:`, html);
        return;
    }

    wLogger.debug(`Successfully saved settings for %${overlayFrom}%`);
}, 500);

export function handleSocketCommands(
    data: string,
    socket: ModifiedWebsocket,
    ws: Websocket
) {
    wLogger.debug(`Received WebSocket command: %${data}%`);
    if (!data.includes(':')) {
        return;
    }

    const firstIndex = data.indexOf(':');
    const SecondIndex = data.indexOf(':', firstIndex + 1);

    const command = data.substring(0, firstIndex);
    const overlayName =
        SecondIndex === -1
            ? decodeURIComponent(data.substring(firstIndex + 1))
            : decodeURIComponent(data.substring(firstIndex + 1, SecondIndex));

    const legacyPayload = data.substring(firstIndex + 1);
    const payload = data.substring(SecondIndex + 1);

    let message: any;

    const overlayFrom = decodeURI(socket.query?.l || '');
    switch (command) {
        case 'getOverlays':
        case 'getCounters': {
            if (overlayFrom !== '__ingame__' || overlayName !== overlayFrom) {
                message = {
                    error: 'Wrong overlay'
                };
                break;
            }

            message = getLocalCounters();
            break;
        }

        case 'getSettings': {
            if (overlayName !== overlayFrom) {
                message = {
                    error: 'Wrong overlay'
                };
                break;
            }

            try {
                const result = parseCounterSettings(overlayName, 'counter/get');
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

        case 'updateSettings': {
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

            message = json;
            break;
        }

        case 'saveSettings': {
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

            saveDelay(overlayFrom, json);

            ws.socket.emit(
                'message',
                socket.id,
                'updateSettings',
                overlayName,
                payload
            );
            return;
        }

        case 'applyFilters': {
            const json = JsonSafeParse({
                isFile: false,
                payload: payload.startsWith('[') ? payload : legacyPayload, // FIXME:
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
