import { Overlay, defaultDllDir, length } from 'asdf-overlay-node';
import { BrowserWindow } from 'electron';
import EventEmitter from 'node:events';

export type OverlayEventEmitter = EventEmitter<{
    destroyed: [];
}>;

export class OverlayProcess {
    readonly event: OverlayEventEmitter = new EventEmitter();

    private constructor(
        readonly pid: number,
        private readonly hwnd: number,
        readonly overlay: Overlay,
        readonly window: BrowserWindow
    ) {
        overlay.event.once('disconnected', () => {
            this.destroy();
        });

        overlay.event.on('resized', (hwnd, width, height) => {
            if (hwnd !== this.hwnd) {
                return;
            }

            console.debug(
                'window resized hwnd:',
                hwnd,
                'width:',
                width,
                'height:',
                height
            );
            this.window.setSize(width, height);
        });

        window.webContents.on('paint', (e) => {
            if (!e.texture) {
                return;
            }

            const texture = e.texture;
            (async () => {
                try {
                    await overlay.updateShtex(
                        texture.textureInfo.sharedTextureHandle
                    );
                } catch (e) {
                    console.error(
                        `error while updating overlay pid: ${pid.toString()}, err:`,
                        e
                    );
                    this.destroy();
                } finally {
                    texture.release();
                }
            })();
        });
    }

    destroy() {
        this.overlay.destroy();
        this.window.destroy();
        this.event.emit('destroyed');
    }

    static async initialize(pid: number): Promise<OverlayProcess> {
        const overlay = await Overlay.attach(
            'tosu-ingame-overlay',
            defaultDllDir().replaceAll('app.asar', 'app.asar.unpacked'),
            pid,
            5000
        );
        const hwnd = await new Promise<number>((resolve) =>
            overlay.event.once('added', resolve)
        );
        console.debug('found hwnd:', hwnd, 'for pid:', pid);

        await overlay.setPosition(length(0), length(0));
        await overlay.setAnchor(length(0), length(0));
        await overlay.setMargin(length(0), length(0), length(0), length(0));

        const window = new BrowserWindow({
            webPreferences: {
                offscreen: {
                    useSharedTexture: true
                },
                transparent: true
            },
            show: false
        });
        const size = await overlay.getSize(hwnd);
        if (size) {
            window.setSize(size[0], size[1], false);
        }

        return new OverlayProcess(pid, hwnd, overlay, window);
    }
}
