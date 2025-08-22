import { Overlay, defaultDllDir, length } from '@asdf-overlay/core';
import {
    ElectronOverlayInput,
    ElectronOverlaySurface
} from '@asdf-overlay/electron';
import { BrowserWindow } from 'electron';
import EventEmitter from 'node:events';
import path from 'node:path';

import { Keybind } from './keybind';

export type OverlayEventEmitter = EventEmitter<{
    destroyed: [];
}>;

export class OverlayProcess {
    readonly event: OverlayEventEmitter = new EventEmitter();
    keybind = new Keybind([]);

    private readonly surface: ElectronOverlaySurface;
    private input: ElectronOverlayInput | null = null;

    private constructor(
        readonly pid: number,
        private readonly windowId: number,
        readonly overlay: Overlay,
        readonly window: BrowserWindow
    ) {
        overlay.event.once('disconnected', () => {
            this.window.destroy();
            this.event.emit('destroyed');
        });

        overlay.event.on('resized', (hwnd, width, height) => {
            if (hwnd !== this.windowId) {
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

        let configurationEnabled = false;
        overlay.event.on('input_blocking_ended', () => {
            this.closeConfiguration();
            this.input?.disconnect();
            configurationEnabled = false;
        });

        overlay.event.on('keyboard_input', (_, input) => {
            if (
                input.kind === 'Key' &&
                this.keybind.update(input.key, input.state)
            ) {
                configurationEnabled = !configurationEnabled;

                overlay.blockInput(windowId, configurationEnabled);
                if (configurationEnabled) {
                    this.input = ElectronOverlayInput.connect(
                        { id: windowId, overlay },
                        window.webContents
                    );
                    this.input.forwardInput = true;
                    this.openConfiguration();
                }
            }
        });

        this.surface = ElectronOverlaySurface.connect(
            { id: windowId, overlay },
            window.webContents
        );
    }

    private openConfiguration() {
        this.window.webContents.send('inputCaptureStart');
        this.window.focusOnWebView();
    }

    private closeConfiguration() {
        this.window.webContents.send('inputCaptureEnd');
        this.window.blurWebView();
    }

    destroy() {
        this.input?.disconnect();
        this.surface.disconnect();
        this.overlay.destroy();
    }

    static async initialize(pid: number): Promise<OverlayProcess> {
        const overlay = await Overlay.attach(
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

        await overlay.setPosition(hwnd, length(0), length(0));
        await overlay.setAnchor(hwnd, length(0), length(0));
        await overlay.setMargin(
            hwnd,
            length(0),
            length(0),
            length(0),
            length(0)
        );
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
