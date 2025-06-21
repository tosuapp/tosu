import { key } from 'asdf-overlay-node';
import { on } from 'node:events';

import { KEYS, Keybind } from './input';
import { OverlayProcess } from './process';

export class OverlayManager {
    private readonly map: Map<number, OverlayProcess> = new Map();

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
        const array = Array.from(Object.entries(KEYS));
        const keys: { code: number; key: string }[] = keybind
            .split('+')
            .map((key) => {
                const find = array.find(
                    (r) => r[1].toLowerCase() === key.toLowerCase().trim()
                );
                return find ? { code: +find[0], key: find[1] } : null;
            })
            .filter((r) => r !== null);

        for (const overlay of this.map.values()) {
            overlay.keybind = new Keybind(keys.map((k) => key(k.code)));
        }

        console.debug(
            `Keybind updated to ${keys.map((r) => r.key).join(' + ')}`
        );
    }

    async handleEvent(message: { cmd: string } & Record<string, unknown>) {
        if (message.cmd === 'add') {
            await this.runOverlay(message.pid as number);
        }

        if (message.cmd === 'keybind') {
            this.updateKeybind(message.keybind as string);
        }
    }
}
