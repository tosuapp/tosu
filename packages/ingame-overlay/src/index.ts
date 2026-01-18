import tosuIcon from '@assets/tosu.ico?no-inline';
import { Menu, Tray, app } from 'electron';
import path from 'node:path';

import packageJSON from '../package.json';
import { OverlayManager } from './manager';
import { registerTosuProtocol } from './protocol';

// prefer discrete gpu on laptop
app.commandLine.appendSwitch('force_high_performance_gpu');
// disable view scaling on hidpi
app.commandLine.appendSwitch('high-dpi-support', '1');
app.commandLine.appendSwitch('force-device-scale-factor', '1');
// run in process gpu, reduce overheads
app.commandLine.appendSwitch('in-process-gpu');
app.commandLine.appendSwitch('disable-direct-composition');

(async () => {
    // Dev mode
    if (import.meta.env.DEV) {
        await import('./dev');
        return;
    }

    // Check single instance and ignore manually launched instance without ipc
    if (!app.requestSingleInstanceLock() || !process.channel) {
        return;
    }

    console.log('warn: Starting...');

    // disable default menu
    Menu.setApplicationMenu(null);

    // prevent main process from exiting when all windows are closed
    app.on('window-all-closed', () => {});

    const manager = new OverlayManager();
    manager.runIpc();

    await app.whenReady();

    registerTosuProtocol();

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
})().catch((exc) => {
    console.error(exc);
});
