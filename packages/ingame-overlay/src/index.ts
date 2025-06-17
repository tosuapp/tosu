import tosuIcon from '@assets/tosu.ico?no-inline';
import { Menu, Tray, app } from 'electron';
import { on } from 'node:events';
import path from 'path';

import packageJSON from '../package.json';
import { OverlayManager } from './manager';

(async () => {
    // Check single instance and ignore manually launched instance without ipc
    if (!app.requestSingleInstanceLock() || !process.channel) {
        return;
    }

    // prefer discrete gpu on laptop
    app.commandLine.appendSwitch('force_high_performance_gpu');
    // disable view scaling on hidpi
    app.commandLine.appendSwitch('high-dpi-support', '1');
    app.commandLine.appendSwitch('force-device-scale-factor', '1');

    // prevent main process from exiting when all windows are closed
    app.on('window-all-closed', () => {});

    const manager = new OverlayManager();
    runIpc(manager);
    await app.whenReady();

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
})();

async function runIpc(manager: OverlayManager) {
    async function handleEvent(
        message: { cmd: string } & Record<string, unknown>
    ) {
        if (message.cmd === 'add') {
            await manager.runOverlay(message.pid as number);
        }
    }

    for await (const events of on(process, 'message')) {
        for (const msg of events) {
            if (msg == null) {
                continue;
            }

            try {
                await handleEvent(msg);
            } catch (e) {
                console.error(`invalid ipc message. err:`, e);
            }
        }
    }
}
