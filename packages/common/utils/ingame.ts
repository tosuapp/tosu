import fs from 'fs/promises';

import { getSettingsPath } from './directories';

export const checkGameOverlayConfig = async () => {
    const newestConfigPath = getSettingsPath('__ingame__');
    try {
        await fs.access(newestConfigPath, fs.constants.F_OK);
    } catch {
        await fs.writeFile(newestConfigPath, '{}', 'utf8');
    }
};
