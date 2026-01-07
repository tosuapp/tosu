import {
    type GpuLuid,
    Overlay,
    defaultDllDir,
    length
} from '@asdf-overlay/core';
import { ElectronOverlayInput } from '@asdf-overlay/electron/input';
import { ElectronOverlaySurface } from '@asdf-overlay/electron/surface';
import { BrowserWindow } from 'electron';
import EventEmitter from 'node:events';

import { Keybind } from './keybind';
import { preloadPath } from './page';

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
        readonly window: BrowserWindow,
        private readonly luid: GpuLuid
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
                    this.openConfiguration();
                }
            }
        });

        this.surface = ElectronOverlaySurface.connect(
            { id: windowId, overlay },
            luid,
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
        const [hwnd, width, height, luid] = await new Promise<
            [number, number, number, GpuLuid]
        >((resolve) =>
            overlay.event.once('added', (hwnd, width, height, luid) =>
                resolve([hwnd, width, height, luid])
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
                backgroundThrottling: false,
                preload: preloadPath
            },
            show: false
        });
        window.setSize(width, height, false);

        return new OverlayProcess(pid, hwnd, overlay, window, luid);
    }
}
