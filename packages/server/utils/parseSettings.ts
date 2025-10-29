import {
    JsonSafeParse,
    getSettingsPath,
    getStaticPath,
    isRealNumber,
    wLogger
} from '@tosu/common';
import fs from 'fs';
import path from 'path';

import { ISettings, ISettingsCompact, bodyPayload } from './counters.types';

export function parseCounterSettings(
    folderName: string,
    action: 'parse' | 'user/save' | 'counter/get' | 'dev/save' | '',
    payload?: bodyPayload[] & ISettings[]
) {
    const ingameOverlay = folderName === '__ingame__';
    const staticPath = getStaticPath();
    const settingsPath = path.join(
        staticPath,
        decodeURI(folderName),
        'settings.json'
    );
    const settingsValuesPath = getSettingsPath(decodeURI(folderName));
    const legacySettingsValuesPath = path.join(
        staticPath,
        decodeURI(folderName),
        'settings.values.json'
    );

    try {
        // copy legacy settings instead of moving/renaming, because some could have their static folder on other drive
        if (fs.existsSync(legacySettingsValuesPath)) {
            fs.copyFileSync(legacySettingsValuesPath, settingsValuesPath);
            fs.renameSync(
                legacySettingsValuesPath,
                legacySettingsValuesPath.replace('values', 'old-values')
            );
        }

        if (ingameOverlay !== true && !fs.existsSync(settingsPath))
            fs.writeFileSync(settingsPath, JSON.stringify([]), 'utf8');

        if (fs.existsSync(settingsPath) && !fs.existsSync(settingsValuesPath))
            fs.writeFileSync(settingsValuesPath, JSON.stringify({}), 'utf8');

        const settings: ISettings[] = !ingameOverlay
            ? JsonSafeParse({
                  isFile: true,
                  payload: settingsPath,
                  defaultValue: []
              })
            : [];

        const values: ISettingsCompact = JsonSafeParse({
            isFile: true,
            payload: settingsValuesPath,
            defaultValue: {}
        });

        switch (action) {
            case 'parse':
                return {
                    settings,
                    values
                };

            case 'user/save':
                if (ingameOverlay)
                    return {
                        values: payload,
                        settingsValuesPath
                    };

                if (!Array.isArray(payload)) {
                    return new Error('body payload is not array');
                }

                for (let i = 0; i < payload.length; i++) {
                    const setting = payload[i];
                    setting.uniqueID = setting.uniqueID.replace(
                        /[^a-z0-9]/gim,
                        ''
                    );

                    const find = settings.findIndex(
                        (r) => r.uniqueID === setting.uniqueID
                    );
                    if (find === -1) continue;

                    switch (settings[find].type) {
                        case 'number': {
                            values[setting.uniqueID] = isRealNumber(
                                setting.value
                            )
                                ? +setting.value
                                : 0;
                            break;
                        }

                        case 'checkbox': {
                            if (typeof setting.value === 'string') {
                                values[setting.uniqueID] =
                                    setting.value === 'true';
                                break;
                            }

                            values[setting.uniqueID] = setting.value;
                            break;
                        }

                        case 'options':
                        case 'commands': {
                            if (
                                values[setting.uniqueID] === null &&
                                values[setting.uniqueID] === undefined &&
                                JSON.stringify(setting.value) ===
                                    JSON.stringify(settings[find].value)
                            )
                                continue;

                            values[setting.uniqueID] = setting.value;
                            break;
                        }

                        default: {
                            values[setting.uniqueID] = setting.value;
                            break;
                        }
                    }
                }

                return {
                    values,
                    settingsValuesPath
                };

            case 'counter/get':
                for (let i = 0; i < settings.length; i++) {
                    const setting = settings[i];

                    const value = values[setting.uniqueID] ?? setting.value;
                    switch (setting.type) {
                        case 'number': {
                            values[setting.uniqueID] = isNaN(value)
                                ? 0
                                : +value;
                            break;
                        }

                        case 'checkbox': {
                            if (typeof value === 'string') {
                                values[setting.uniqueID] = value === 'true';
                                break;
                            }
                            values[setting.uniqueID] = value;
                            break;
                        }

                        // headers are meant to be in the settings page only
                        case 'header': {
                            delete values[setting.uniqueID];
                            break;
                        }

                        default: {
                            values[setting.uniqueID] = value;
                            break;
                        }
                    }
                }

                return { values };

            case 'dev/save': {
                if (!Array.isArray(payload)) {
                    return new Error('body payload is not array');
                }

                for (let i = 0; i < payload.length; i++) {
                    const setting = payload[i];

                    setting.uniqueID = setting.uniqueID.replace(
                        /[^a-z0-9]/gim,
                        ''
                    );

                    const value = setting.value;
                    switch (setting.type) {
                        case 'number': {
                            setting.value = isRealNumber(value) ? +value : 0;
                            break;
                        }

                        case 'checkbox': {
                            if (typeof value === 'string') {
                                setting.value = value === 'true';
                                break;
                            }
                            setting.value = value;
                            break;
                        }

                        default: {
                            setting.value = value;
                            break;
                        }
                    }
                }

                return {
                    settings: payload,
                    settingsPath
                };
            }
        }

        return new Error('Undefined action to parse counter settings');
    } catch (exc) {
        wLogger.error('parseCounterSettings', (exc as any).message);
        wLogger.debug('parseCounterSettings', { staticPath, folderName }, exc);

        return new Error(`parseCounterSettings Error: ${(exc as any).message}`);
    }
}
