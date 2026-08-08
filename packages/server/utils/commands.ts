import { JsonSafeParse, debounce, wLogger } from '@tosu/common';

import { getLocalCounters, saveSettings } from './counters';
import type { bodyPayload } from './counters.types';
import { parseCounterSettings } from './parseSettings';
import {
    type WebSocketChannel,
    type WsConnection,
    getConnName
} from './socket';

const saveDelay = debounce((overlayFrom: string, json: bodyPayload[]) => {
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
    conn: WsConnection,
    channel: WebSocketChannel
) {
    wLogger.debug(
        `Received WebSocket command: %${data}% from %${getConnName(conn)}%`
    );
    if (!data.includes(':')) {
        return;
    }

    const firstIndex = data.indexOf(':');
    const secondIndex = data.indexOf(':', firstIndex + 1);

    const command = data.substring(0, firstIndex);
    const overlayName =
        secondIndex === -1
            ? decodeURIComponent(data.substring(firstIndex + 1))
            : decodeURIComponent(data.substring(firstIndex + 1, secondIndex));

    const legacyPayload = data.substring(firstIndex + 1);
    const payload = secondIndex === -1 ? '' : data.substring(secondIndex + 1);

    let message: unknown;

    switch (command) {
        case 'getOverlays':
        case 'getCounters': {
            message = getLocalCounters();
            break;
        }

        case 'getSettings': {
            try {
                const targetOverlay =
                    overlayName && overlayName !== 'undefined'
                        ? overlayName
                        : conn.overlayName || '';

                if (!targetOverlay) {
                    message = { error: 'No overlay specified or resolved' };
                    break;
                }

                const result = parseCounterSettings(
                    targetOverlay,
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
                    `Failed to get settings for %${overlayName}% from %${getConnName(conn)}%:`,
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
                    `Failed to parse JSON for command %${command}% from %${getConnName(conn)}%:`,
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
                    `Failed to parse JSON for command %${command}% from %${getConnName(conn)}%:`,
                    (json as Error).message
                );
                wLogger.debug(`JSON parsing error details:`, json);
                return;
            }

            const targetOverlay =
                overlayName && overlayName !== 'undefined'
                    ? overlayName
                    : conn.overlayName || '';
            saveDelay(targetOverlay, json);

            channel.dispatchCommand(
                conn.id,
                'updateSettings',
                targetOverlay,
                payload
            );
            return;
        }

        case 'applyFilters': {
            const json = JsonSafeParse({
                isFile: false,
                payload: payload.startsWith('[') ? payload : legacyPayload,
                defaultValue: new Error('Broken json')
            });
            if (json instanceof Error) {
                wLogger.error(
                    `Failed to parse JSON for command %${command}% from %${getConnName(conn)}%:`,
                    (json as Error).message
                );
                wLogger.debug(`JSON parsing error details:`, json);
                return;
            }

            try {
                if (!Array.isArray(json)) {
                    wLogger.error(
                        `Invalid filter format for socket %${getConnName(conn)}%:`,
                        `Filters should be an array of strings (received: ${json})`
                    );
                    return;
                }

                conn.filters = json;
                return;
            } catch (exc) {
                wLogger.error(
                    `Failed to apply filters for command %${command}% from %${getConnName(conn)}%:`,
                    (exc as Error).message
                );
                wLogger.debug(`Filter application error details:`, exc);
            }
        }
    }

    try {
        conn.socket.send(
            JSON.stringify({
                command,
                message
            })
        );
    } catch (exc) {
        wLogger.error(
            `Failed to send response for command %${command}% to %${getConnName(conn)}%:`,
            (exc as Error).message
        );
        wLogger.debug(`Command response error details:`, exc);
    }
}
