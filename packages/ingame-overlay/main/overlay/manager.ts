import { OverlayProcess } from './process';

export class OverlayManager {
    private readonly map: Map<number, OverlayProcess> = new Map();

    // Run overlay in provided process
    async runOverlay(pid: number) {
        try {
            console.debug('initializing ingame overlay pid:', pid);
            const overlay = await OverlayProcess.initialize(pid);
            try {
                await overlay.window.loadURL(
                    'http://localhost:24050/api/ingame'
                );
            } catch (e) {
                console.warn('cannot connect to ingame overlay. err: ', e);
            }

            this.map.set(pid, overlay);
            return new Promise<void>((resolve) =>
                overlay.event.once('destroyed', () => {
                    this.map.delete(pid);
                    resolve();
                })
            );
        } catch (e) {
            console.warn('overlay injection failed err:', e);
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
}
