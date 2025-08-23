import { on } from 'node:events';

import { Keybind } from './keybind';
import { OverlayProcess } from './process';

export class OverlayManager {
    private readonly map: Map<number, OverlayProcess> = new Map();
    private keybindKeys: string[] = ['Control', 'Shift', 'Space'];

    private maxFps: number = 60;

    async runIpc() {
        for await (const events of on(process, 'message')) {
            for (const msg of events) {
                if (msg == null) {
                    continue;
                }

                try {
                    await this.handleEvent(msg);
                } catch (exc) {
                    console.error(`IPC:`, exc);
                }
            }
        }
    }

    // Run overlay in provided process
    async runOverlay(pid: number) {
        if (this.map.has(pid)) {
            console.debug('Already attached to process', pid);
            return;
        }

        try {
            console.log('initializing ingame overlay pid:', pid);

            const overlay = await OverlayProcess.initialize(pid);
            overlay.window.webContents.setFrameRate(this.maxFps);
            overlay.keybind = new Keybind(this.keybindKeys);
            this.map.set(pid, overlay);
            try {
                await overlay.window.loadURL(
                    'http://localhost:24050/api/ingame'
                );

                console.log(`warn: Initialized successfully`);
            } catch (exc) {
                console.error('Unnable connect to ingame overlay:', exc);
            }

            overlay.event.once('destroyed', () => {
                this.map.delete(pid);
            });
        } catch (exc) {
            console.error('Injection failed:', exc);
        }
    }

    reloadAll() {
        for (const overlay of this.map.values()) {
            overlay.window.reload();
        }
    }

    destroy() {
        for (const overlay of this.map.values()) {
            overlay.destroy();
        }
    }

    updateKeybind(keybind: string) {
        this.keybindKeys = keybind.split(/\s*\+\s*/);
        for (const overlay of this.map.values()) {
            overlay.keybind = new Keybind(this.keybindKeys);
        }

        console.debug(`Keybind updated to ${this.keybindKeys.join(' + ')}`);
    }

    updateMaxFps(maxFps: number) {
        this.maxFps = maxFps;
        for (const overlay of this.map.values()) {
            overlay.window.webContents.setFrameRate(maxFps);
        }

        console.debug(`MaxFps updated to ${maxFps}`);
    }

    async handleEvent(message: { cmd: string } & Record<string, unknown>) {
        if (message.cmd === 'add') {
            await this.runOverlay(message.pid as number);
        } else if (message.cmd === 'keybind') {
            this.updateKeybind(message.keybind as string);
        } else if (message.cmd === 'maxFps') {
            this.updateMaxFps(message.maxFps as number);
        }
    }
}
