import { ipcRenderer } from 'electron';

ipcRenderer.on('inputCaptureStart', () => {
    console.debug('editing started');
    window.postMessage('editingStarted');
});

ipcRenderer.on('inputCaptureEnd', () => {
    console.debug('editing ended');
    window.postMessage('editingEnded');
});
