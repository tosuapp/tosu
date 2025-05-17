import { Overlay, defaultDllDir, key, length } from 'asdf-overlay-node';
import { BrowserWindow } from 'electron';
import EventEmitter from 'node:events';
import path from 'node:path';

import { toCursor, toKeyboardEvent, toMouseEvent } from './input';

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

        overlay.event.on('input_capture_start', () => {
            window.webContents.send('inputCaptureStart');
            window.focusOnWebView();
        });

        overlay.event.on('input_capture_end', () => {
            window.webContents.send('inputCaptureEnd');
            window.blurWebView();
        });

        overlay.event.on('cursor_input', (_, input) => {
            const event = toMouseEvent(input);
            if (event) {
                window.webContents.sendInputEvent(event);
            }
        });

        window.webContents.on('cursor-changed', (_, type) => {
            overlay.setCaptureCursor(hwnd, toCursor(type));
        });

        overlay.event.on('keyboard_input', (_, input) => {
            const event = toKeyboardEvent(input);
            if (event) {
                window.webContents.sendInputEvent(event);
            }
        });

        window.webContents.on('paint', async (e) => {
            if (!e.texture) {
                return;
            }
            const info = e.texture.textureInfo;
            const rect = info.metadata.captureUpdateRect ?? info.contentRect;

            try {
                await overlay.updateShtex(
                    info.codedSize.width,
                    info.codedSize.height,
                    info.sharedTextureHandle,
                    {
                        dstX: rect.x,
                        dstY: rect.y,
                        src: rect
                    }
                );
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
        const hwnd = await new Promise<number>((resolve) =>
            overlay.event.once('added', resolve)
        );
        console.debug('found hwnd:', hwnd, 'for pid:', pid);

        await overlay.setPosition(length(0), length(0));
        await overlay.setAnchor(length(0), length(0));
        await overlay.setMargin(length(0), length(0), length(0), length(0));

        // TODO:: configurable input key bind
        await overlay.setInputCaptureKeybind(hwnd, [
            key(0x11), // Left Control
            key(0x10), // Left Shift
            key(0x20) // Space
        ]);

        const window = new BrowserWindow({
            webPreferences: {
                offscreen: {
                    useSharedTexture: true
                },
                transparent: true,
                preload: path.join(__dirname, '../preload/index.js')
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
