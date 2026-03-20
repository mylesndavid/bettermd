const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('bettermd', {
  onFileLoaded: (callback) => ipcRenderer.on('file-loaded', (_, data) => callback(data)),
  onFileUpdated: (callback) => ipcRenderer.on('file-updated', (_, data) => callback(data)),
  onToggleView: (callback) => ipcRenderer.on('toggle-view', () => callback()),
  onSaveAsPdf: (callback) => ipcRenderer.on('save-as-pdf', () => callback()),
  onThemeChanged: (callback) => ipcRenderer.on('theme-changed', (_, theme) => callback(theme)),
  printToPdf: () => ipcRenderer.invoke('print-to-pdf'),
  watchFile: (filePath) => ipcRenderer.send('watch-file', filePath),
});
