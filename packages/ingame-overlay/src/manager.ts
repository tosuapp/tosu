import { on } from 'node:events';

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

    async handleEvent(message: { cmd: string } & Record<string, unknown>) {
        if (message.cmd === 'add') {
            await this.runOverlay(message.pid as number);
        }
    }
}
