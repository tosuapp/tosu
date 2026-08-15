import {
    Overlay,
    type SurfaceInfo,
    type TracingMetadata,
    defaultDllDir
} from '@asdf-overlay/core';
import type { OverlaySurface } from '@asdf-overlay/electron';
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

    private surfaceInterop: ElectronOverlaySurface;
    private inputs: ElectronOverlayInput[] = [];

    private constructor(
        private surface: OverlaySurface,
        readonly window: BrowserWindow
    ) {
        const { overlay } = surface;

        overlay.event.on('tracing_event', (metadata, message) =>
            this.onOverlayLog(metadata, message)
        );

        overlay.event.once('disconnected', () => this.onDisconnected());

        overlay.event.on('surface_resized', (id, width, height) => {
            if (id !== this.surface.id) {
                return;
            }

            console.debug(
                'surface resized id:',
                this.surface.id,
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
            this.resetInputs();
            configurationEnabled = false;
        });

        overlay.event.on('window_keyboard_input', (id, input) => {
            if (
                input.type === 'Key' &&
                this.keybind.update(input.key, input.state)
            ) {
                configurationEnabled = !configurationEnabled;

                overlay.blockInput(configurationEnabled);
                if (configurationEnabled) {
                    this.inputs.push(
                        ElectronOverlayInput.connect(
                            { id, overlay },
                            window.webContents
                        )
                    );

                    const mainWindowId = this.surface.info.ty.windowId;
                    // If the main window is not the same as the window that triggered the keybind, connect to it as well
                    if (mainWindowId && mainWindowId !== id) {
                        this.inputs.push(
                            ElectronOverlayInput.connect(
                                { id: mainWindowId, overlay },
                                window.webContents
                            )
                        );
                    }

                    this.openConfiguration();
                }
            }
        });

        this.surfaceInterop = ElectronOverlaySurface.connect(
            this.surface,
            window.webContents
        );

        this.surfaceInterop.events.on('error', (error: unknown) =>
            this.onSurfaceError(error)
        );
    }

    private resetInputs() {
        for (const input of this.inputs) {
            input.disconnect();
        }
        this.inputs = [];
    }

    private onOverlayLog(metadata: TracingMetadata, message?: string): void {
        const formatted = `${metadata.modulePath ?? '<unknown>'}:${metadata.line ?? '<unknown>'} ${message}`;

        if (metadata.level === 'Error') {
            console.error(formatted);
            return;
        }
        console.log(formatted);
    }

    private onDisconnected() {
        this.window.destroy();
        this.event.emit('destroyed');
    }

    private onSurfaceError(error: unknown) {
        console.error(error);
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
        this.resetInputs();
        this.surfaceInterop.disconnect();
        this.surface.overlay.detach();
    }

    static async initialize(pid: number): Promise<OverlayProcess> {
        const overlay = await Overlay.attach(
            defaultDllDir().replaceAll('app.asar', 'app.asar.unpacked'),
            pid,
            5000
        );

        overlay.event.on('window_added', async (id) => {
            // Listen for keyboard events
            await overlay.listenInput(id, false, true);
        });

        const [surface, width, height] = await getMainWindowSurface(overlay);
        console.debug(
            'found id:',
            surface.id,
            'info:',
            surface.info,
            'for pid:',
            pid
        );

        const window = new BrowserWindow({
            webPreferences: {
                offscreen: {
                    useSharedTexture: true,
                    // NOTE: Disable unsupported hdr texture format.
                    // Remove when hdr support is added.
                    sharedTexturePixelFormat: 'argb'
                },
                transparent: true,
                backgroundThrottling: false,
                preload: preloadPath
            },
            show: false
        });
        window.setSize(width, height, false);

        return new OverlayProcess(surface, window);
    }
}

/**
 * Find first found surface bound to a window.
 */
function getMainWindowSurface(
    overlay: Overlay
): Promise<[surface: OverlaySurface, width: number, height: number]> {
    return new Promise<[OverlaySurface, number, number]>((resolve) => {
        const handler = (
            id: bigint,
            width: number,
            height: number,
            info: SurfaceInfo
        ) => {
            if (info.ty.windowId == null) {
                return;
            }

            resolve([{ id, overlay, info }, width, height]);
            overlay.event.off('surface_added', handler);
        };

        overlay.event.on('surface_added', handler);
    });
}
