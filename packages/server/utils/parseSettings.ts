import { JsonSaveParse, getStaticPath } from '@tosu/common';
import fs from 'fs';
import path from 'path';

import { ISettings, ISettingsCompact, bodyPayload } from './counters.types';

export function parseCounterSettings(
    folderName: string,
    action: 'parse' | 'user/save' | 'counter/get' | '',
    payload?: bodyPayload[]
) {
    const staticPath = getStaticPath();
    const settingsPath = path.join(
        staticPath,
        decodeURI(folderName),
        'settings.json'
    );
    const settingsValuesPath = path.join(
        staticPath,
        decodeURI(folderName),
        'settings.values.json'
    );

    if (!fs.existsSync(settingsPath))
        fs.writeFileSync(settingsPath, JSON.stringify([]), 'utf8');

    if (!fs.existsSync(settingsValuesPath))
        fs.writeFileSync(settingsValuesPath, JSON.stringify({}), 'utf8');

    const settings: ISettings[] = JsonSaveParse(
        fs.readFileSync(settingsPath, 'utf8'),
        []
    );

    const values: ISettingsCompact = JsonSaveParse(
        fs.readFileSync(settingsValuesPath, 'utf8'),
        {}
    );

    switch (action) {
        case 'parse':
            for (let i = 0; i < settings.length; i++) {
                const setting = settings[i];
                if (!values[setting.uniqueID]) continue;

                setting.value = values[setting.uniqueID] || setting.value;
            }

            return {
                settings,
                values,
                settingsPath,
                settingsValuesPath
            };

        case 'user/save':
            if (!Array.isArray(payload)) {
                return new Error('body payload is not array');
            }

            for (let i = 0; i < payload.length; i++) {
                const setting = payload[i];
                setting.uniqueID = setting.uniqueID.replace(/[^a-z0-9]/gim, '');

                const find = settings.findIndex(
                    (r) => r.uniqueID === setting.uniqueID
                );
                if (find === -1) continue;

                switch (settings[find].type) {
                    case 'number': {
                        settings[find].value = isNaN(setting.value)
                            ? 0
                            : +setting.value;
                        break;
                    }

                    case 'checkbox': {
                        settings[find].value = Boolean(setting.value);
                        break;
                    }

                    default: {
                        settings[find].value = setting.value;
                        break;
                    }
                }

                values[setting.uniqueID] = settings[find].value;
            }

            return {
                settings,
                values,
                settingsPath,
                settingsValuesPath
            };

        case 'counter/get':
            for (let i = 0; i < settings.length; i++) {
                const setting = settings[i];
                if (!values[setting.uniqueID])
                    values[setting.uniqueID] = setting.value;
            }

            return {
                settings,
                values,
                settingsPath,
                settingsValuesPath
            };
    }

    return new Error('Undefined action to parse counter settings');
}
