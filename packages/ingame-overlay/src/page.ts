import { type WebContents } from 'electron';
import path from 'node:path';

/**
 * Load ingame configuration page
 */
export async function loadMainPage(webContents: WebContents) {
    if (import.meta.env.DEV && process.env.ELECTRON_RENDERER_URL) {
        await webContents.loadURL(process.env.ELECTRON_RENDERER_URL);
    } else {
        await webContents.loadFile(
            path.join(__dirname, '../renderer/index.html')
        );
    }
}

/**
 * Path to preload script
 */
export const preloadPath = path.join(__dirname, '../preload/index.js');
