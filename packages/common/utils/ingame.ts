import fs from 'fs';

import { getSettingsPath } from './directories';

export const checkGameOverlayConfig = () => {
    const newestConfigPath = getSettingsPath('__ingame__');
    if (fs.existsSync(newestConfigPath)) return;

    fs.writeFileSync(newestConfigPath, '{}', 'utf8');
};
