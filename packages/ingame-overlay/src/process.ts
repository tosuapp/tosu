import { Overlay, defaultDllDir, key, length } from 'asdf-overlay-node';
import { BrowserWindow, TextureInfo } from 'electron';
import EventEmitter from 'node:events';
import path from 'node:path';

import { Keybind, toCursor, toKeyboardEvent, toMouseEvent } from './input';

export type OverlayEventEmitter = EventEmitter<{
    destroyed: [];
}>;

export class OverlayProcess {
    readonly event: OverlayEventEmitter = new EventEmitter();
    keybind = new Keybind([
        key(0x11), // Left Control
        key(0x10), // Left Shift
        key(0x20) // Space
    ]);

    private constructor(
        readonly pid: number,
        private readonly hwnd: number,
        readonly overlay: Overlay,
        readonly window: BrowserWindow
    ) {
        overlay.event.once('disconnected', () => {
            this.window.destroy();
            this.event.emit('destroyed');
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

        overlay.event.on('cursor_input', (_, input) => {
            const event = toMouseEvent(input);
            if (event) {
                window.webContents.sendInputEvent(event);
            }
        });

        window.webContents.on('cursor-changed', (_, type) => {
            overlay.setBlockingCursor(hwnd, toCursor(type));
        });

        let configurationEnabled = false;

        overlay.event.on('input_blocking_ended', () => {
            this.closeConfiguration();
            configurationEnabled = false;
        });

        overlay.event.on('keyboard_input', (_, input) => {
            if (
                input.kind === 'Key' &&
                this.keybind.update(input.key, input.state)
            ) {
                configurationEnabled = !configurationEnabled;

                overlay.blockInput(hwnd, configurationEnabled);
                if (configurationEnabled) {
                    this.openConfiguration();
                }
            }

            if (configurationEnabled) {
                const event = toKeyboardEvent(input);
                if (event) {
                    window.webContents.sendInputEvent(event);
                }
            }
        });

        window.webContents.on('paint', async (e) => {
            if (!e.texture) {
                return;
            }

            try {
                await this.updateSurface(e.texture.textureInfo);
            } catch (e) {
                console.error(
                    `error while updating overlay pid: ${pid.toString()}, err:`,
                    e
                );
                this.destroy();
            } finally {
                e.texture.release();
            }
        });
    }

    private openConfiguration() {
        this.window.webContents.send('inputCaptureStart');
        this.window.focusOnWebView();
    }

    private closeConfiguration() {
        this.window.webContents.send('inputCaptureEnd');
        this.window.blurWebView();
    }

    private async updateSurface(info: TextureInfo) {
        const rect = info.metadata.captureUpdateRect ?? info.contentRect;
        await this.overlay.updateShtex(
            info.codedSize.width,
            info.codedSize.height,
            info.sharedTextureHandle,
            {
                dstX: rect.x,
                dstY: rect.y,
                src: rect
            }
        );
    }

    destroy() {
        this.overlay.destroy();
    }

    static async initialize(pid: number): Promise<OverlayProcess> {
        const overlay = await Overlay.attach(
            'tosu-ingame-overlay',
            defaultDllDir().replaceAll('app.asar', 'app.asar.unpacked'),
            pid,
            5000
        );
        const [hwnd, width, height] = await new Promise<
            [number, number, number]
        >((resolve) =>
            overlay.event.once('added', (hwnd, width, height) =>
                resolve([hwnd, width, height])
            )
        );
        console.debug('found hwnd:', hwnd, 'for pid:', pid);

        await overlay.setPosition(length(0), length(0));
        await overlay.setAnchor(length(0), length(0));
        await overlay.setMargin(length(0), length(0), length(0), length(0));
        // Listen for keyboard events
        await overlay.listenInput(hwnd, false, true);

        const window = new BrowserWindow({
            webPreferences: {
                offscreen: {
                    useSharedTexture: true
                },
                transparent: true,
                preload: path.join(__dirname, '../preload/preload.js')
            },
            show: false
        });
        window.setSize(width, height, false);

        return new OverlayProcess(pid, hwnd, overlay, window);
    }
}
