const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('bettermd', {
  onFileLoaded: (callback) => ipcRenderer.on('file-loaded', (_, data) => callback(data)),
  onFileUpdated: (callback) => ipcRenderer.on('file-updated', (_, data) => callback(data)),
  onToggleView: (callback) => ipcRenderer.on('toggle-view', () => callback()),
  onToggleEdit: (callback) => ipcRenderer.on('toggle-edit', () => callback()),
  onSaveFile: (callback) => ipcRenderer.on('save-file', () => callback()),
  onSaveAsPdf: (callback) => ipcRenderer.on('save-as-pdf', () => callback()),
  onThemeChanged: (callback) => ipcRenderer.on('theme-changed', (_, theme) => callback(theme)),
  onRecentsUpdated: (callback) => ipcRenderer.on('recents-updated', (_, recents) => callback(recents)),
  openRecent: (filePath) => ipcRenderer.send('open-recent', filePath),
  showInFinder: () => ipcRenderer.send('show-in-finder'),
  shareFile: () => ipcRenderer.send('share-file'),
  printToPdf: () => ipcRenderer.invoke('print-to-pdf'),
  saveToFile: (data) => ipcRenderer.invoke('save-to-file', data),
  watchFile: (filePath) => ipcRenderer.send('watch-file', filePath),
});
