import { JsonSafeParse, debounce, wLogger } from '@tosu/common';

import { getLocalCounters, saveSettings } from './counters';
import { parseCounterSettings } from './parseSettings';
import { ModifiedWebsocket, Websocket } from './socket';

const saveDelay = debounce((overlayFrom: string, json: any) => {
    const html = saveSettings(overlayFrom, json);
    if (html instanceof Error) {
        wLogger.error(
            '[ws]',
            `commands`,
            'saveSettings',
            (html as Error).message
        );
        wLogger.debug('[ws]', `commands`, 'saveSettings', html);

        return;
    }

    wLogger.debug('[ws]', `commands`, 'saveSettings', 'done');
}, 500);

export function handleSocketCommands(
    data: string,
    socket: ModifiedWebsocket,
    ws: Websocket
) {
    wLogger.debug('[ws]', `commands`, data);
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
                    '[ws]',
                    `commands`,
                    command,
                    (exc as Error).message
                );
                wLogger.debug('[ws]', `commands`, command, exc);
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
                    '[ws]',
                    `commands`,
                    command,
                    (json as Error).message
                );
                wLogger.debug('[ws]', `commands`, command, json);
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
                    '[ws]',
                    `commands`,
                    command,
                    (json as Error).message
                );
                wLogger.debug('[ws]', `commands`, command, json);
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
