import { ipcRenderer } from 'electron';

ipcRenderer.on('inputCaptureStart', () => {
    window.postMessage('editingStarted');
});

ipcRenderer.on('inputCaptureEnd', () => {
    window.postMessage('editingEnded');
});
