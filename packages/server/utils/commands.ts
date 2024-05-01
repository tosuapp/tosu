import { JsonSaveParse, getStaticPath, wLogger } from '@tosu/common';
import fs from 'fs';
import path from 'path';

import { ISettings, ISettingsCompact } from './counters.types';
import { ModifiedWebsocket } from './socket';

export function handleSocketCommands(data: string, socket: ModifiedWebsocket) {
    wLogger.info(`WS_COMMANDS >>>`, data);
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
                const staticPath = getStaticPath();
                const settingsPath = path.join(
                    staticPath,
                    decodeURI(payload),
                    'settings.json'
                );
                const settingsValuesPath = path.join(
                    staticPath,
                    decodeURI(payload),
                    'settings.values.json'
                );

                const settings: ISettings[] = JsonSaveParse(
                    fs.readFileSync(settingsPath, 'utf8'),
                    []
                );

                const values: ISettingsCompact = JsonSaveParse(
                    fs.readFileSync(settingsValuesPath, 'utf8'),
                    {}
                );

                for (let i = 0; i < settings.length; i++) {
                    const setting = settings[i];
                    if (!values[setting.title])
                        values[setting.title] = setting.value;
                }

                message = values;
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
