const { app, BrowserWindow, Menu, dialog, ipcMain, shell, nativeTheme } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;
let currentFilePath = null;

function createWindow(filePath) {
  const win = new BrowserWindow({
    width: 860,
    height: 1000,
    minWidth: 400,
    minHeight: 300,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 18 },
    backgroundColor: '#ffffff',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadFile('index.html');

  win.webContents.on('did-finish-load', () => {
    if (filePath) {
      loadFile(win, filePath);
    }
  });

  // Open links in default browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow = win;
  return win;
}

function loadFile(win, filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    currentFilePath = filePath;
    win.setTitle(path.basename(filePath));
    win.setRepresentedFilename(filePath);
    win.webContents.send('file-loaded', { content, filePath });
  } catch (err) {
    dialog.showErrorBox('Error', `Could not open file:\n${err.message}`);
  }
}

async function openFile(win) {
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    properties: ['openFile'],
    filters: [
      { name: 'Markdown', extensions: ['md', 'markdown', 'mdown', 'mkd', 'txt'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  });
  if (!canceled && filePaths.length > 0) {
    loadFile(win, filePaths[0]);
  }
}

function buildMenu() {
  const template = [
    {
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'File',
      submenu: [
        {
          label: 'Open…',
          accelerator: 'CmdOrCtrl+O',
          click: () => {
            if (mainWindow) openFile(mainWindow);
          },
        },
        { type: 'separator' },
        {
          label: 'Save as PDF…',
          accelerator: 'CmdOrCtrl+Shift+E',
          click: () => {
            if (mainWindow) mainWindow.webContents.send('save-as-pdf');
          },
        },
        { type: 'separator' },
        { role: 'close' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'copy' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Toggle Raw/Rendered',
          accelerator: 'CmdOrCtrl+Shift+R',
          click: () => {
            if (mainWindow) mainWindow.webContents.send('toggle-view');
          },
        },
        { type: 'separator' },
        {
          label: 'Light Mode',
          type: 'radio',
          checked: nativeTheme.themeSource === 'light',
          click: () => {
            nativeTheme.themeSource = 'light';
            if (mainWindow) mainWindow.webContents.send('theme-changed', 'light');
          },
        },
        {
          label: 'Dark Mode',
          type: 'radio',
          checked: nativeTheme.themeSource === 'dark',
          click: () => {
            nativeTheme.themeSource = 'dark';
            if (mainWindow) mainWindow.webContents.send('theme-changed', 'dark');
          },
        },
        {
          label: 'System',
          type: 'radio',
          checked: nativeTheme.themeSource === 'system',
          click: () => {
            nativeTheme.themeSource = 'system';
            if (mainWindow) mainWindow.webContents.send('theme-changed', 'system');
          },
        },
        { type: 'separator' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { role: 'resetZoom' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { type: 'separator' },
        { role: 'front' },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// Handle save-as-pdf from renderer
ipcMain.handle('print-to-pdf', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const defaultName = currentFilePath
    ? path.basename(currentFilePath, path.extname(currentFilePath)) + '.pdf'
    : 'document.pdf';

  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    defaultPath: defaultName,
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
  });

  if (canceled || !filePath) return { success: false };

  try {
    const pdfData = await win.webContents.printToPDF({
      pageSize: 'A4',
      printBackground: true,
      margins: { top: 0.4, bottom: 0.4, left: 0.4, right: 0.4 },
    });
    fs.writeFileSync(filePath, pdfData);
    shell.showItemInFinder(filePath);
    return { success: true };
  } catch (err) {
    dialog.showErrorBox('PDF Error', err.message);
    return { success: false, error: err.message };
  }
});

// Watch for file changes
ipcMain.on('watch-file', (event, filePath) => {
  if (!filePath) return;
  try {
    fs.watch(filePath, { persistent: false }, (eventType) => {
      if (eventType === 'change') {
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          event.sender.send('file-updated', { content, filePath });
        } catch {
          // File might be temporarily unavailable during write
        }
      }
    });
  } catch {
    // File watch not supported or file doesn't exist
  }
});

app.whenReady().then(() => {
  buildMenu();

  // Check if a file was passed as argument (double-click to open)
  const filePath = process.argv.find((arg, i) => i > 0 && !arg.startsWith('-') && (arg.endsWith('.md') || arg.endsWith('.markdown')));
  createWindow(filePath);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Handle file open events (macOS drag-to-dock, open-with)
app.on('open-file', (event, filePath) => {
  event.preventDefault();
  if (mainWindow) {
    loadFile(mainWindow, filePath);
  } else {
    app.whenReady().then(() => createWindow(filePath));
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
