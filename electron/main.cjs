const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

// Ensure Electron uses a writable userData path and a custom disk cache directory.
// This avoids "Unable to move the cache: Access is denied" errors when the
// app is installed in protected locations (e.g. Program Files) or when an
// antivirus/locker prevents default cache operations.
try {
  const safeUserData = path.join(app.getPath('appData'), 'POS App');
  app.setPath('userData', safeUserData);
  const cacheDir = path.join(safeUserData, 'Cache');
  fs.mkdirSync(cacheDir, { recursive: true });
  app.commandLine.appendSwitch('disk-cache-dir', cacheDir);
} catch (e) {
  console.warn('Could not set custom cache/userData path:', e);
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(__dirname, '..', 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs')
    }
  });

  // Support passing a URL via CLI arg (--url=http://...) for dev mode
  const urlArg = process.argv.find(a => a.startsWith('--url='));
  const startUrl = (urlArg && urlArg.split('=')[1]) || process.env.ELECTRON_START_URL || `file://${path.join(__dirname, '..', 'dist', 'index.html')}`;
  win.loadURL(startUrl);
  // Only open DevTools when explicitly requested via the `--dev` CLI flag.
  // This prevents developer tools from appearing in production builds.
  if (process.argv.includes('--dev')) {
    win.webContents.openDevTools({ mode: 'undocked' });
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// Graceful handling of uncaught errors
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception in Electron Main:', err);
});
