import tosuIcon from '@asset/tosu.ico?no-inline';
import { Menu, Tray, app } from 'electron';
import path from 'path';

import packageJSON from '../package.json';
import { OverlayManager } from './overlay/manager';

(async () => {
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

    // prefer discrete gpu on laptop
    app.commandLine.appendSwitch('force_high_performance_gpu');
    // disable view scaling on hidpi
    app.commandLine.appendSwitch('high-dpi-support', '1');
    app.commandLine.appendSwitch('force-device-scale-factor', '1');

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
