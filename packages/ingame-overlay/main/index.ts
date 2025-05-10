import tosuIcon from '@asset/tosu.ico?no-inline';
import { Menu, Tray, app } from 'electron';
import path from 'path';

import packageJSON from '../package.json';
import { OverlayManager } from './overlay/manager';

// eslint-disable-next-line no-void
void (async () => {
    try {
        await main();
    } finally {
        app.quit();
    }
})();

async function main() {
    if (!app.requestSingleInstanceLock()) {
        return;
    }

    // prevent main process from exiting when all windows are closed
    app.on('window-all-closed', () => {});

    await app.whenReady();

    const manager = new OverlayManager();
    const tray = new Tray(path.join(__dirname, tosuIcon));
    const contextMenu = Menu.buildFromTemplate([
        {
            label: `${packageJSON.name} v${packageJSON.version} by ${packageJSON.author}`,
            enabled: false
        },
        {
            type: 'separator'
        },
        {
            label: 'Reload overlays',
            click: () => {
                manager.reloadAll();
            }
        },
        {
            type: 'separator'
        },
        {
            label: 'Exit',
            role: 'quit'
        }
    ]);
    tray.setToolTip(packageJSON.name);
    tray.setContextMenu(contextMenu);

    await manager.run();
}
