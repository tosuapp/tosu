import { BrowserWindow, app } from 'electron';

import { loadMainPage, preloadPath } from './page';
import { registerTosuProtocol } from './protocol';

(async () => {
    console.debug('Loading dev window');
    await app.whenReady();

    registerTosuProtocol();

    const devWindow = new BrowserWindow({
        webPreferences: {
            preload: preloadPath
        }
    });

    await loadMainPage(devWindow.webContents);
    devWindow.webContents.openDevTools();
    console.debug('Dev window prepared.');

    // Always enable configuration mode
    devWindow.webContents.send('inputCaptureStart');
})();
