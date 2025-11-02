/**
 * Simplified desktop launch function for Prism Framework applications.
 *
 * This function provides a high-level API for launching an Electron desktop app
 * without needing to manually configure all the Electron dependencies.
 */

import { app, BrowserWindow, ipcMain } from 'electron';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

export interface DesktopLaunchOptions {
  /**
   * Initial path in the application to navigate to (e.g., '/', '/dashboard')
   */
  initialPath?: string;

  /**
   * Window width in pixels (default: 1200)
   */
  windowWidth?: number;

  /**
   * Window height in pixels (default: 800)
   */
  windowHeight?: number;

  /**
   * Development server URL (default: http://localhost:4000)
   */
  devServerUrl?: string;

  /**
   * Path to the UI build output (default: ../ui/out/index.html)
   */
  uiBuildPath?: string;

  /**
   * Path to the preload script (default: ./preload.js)
   */
  preloadPath?: string;
}

/**
 * Launch the Electron desktop application.
 *
 * This function handles:
 * - Waiting for Electron app to be ready
 * - Creating the main browser window
 * - Loading the appropriate URL (dev server or static files)
 * - Handling window lifecycle events
 */
export async function desktopLaunch(options: DesktopLaunchOptions = {}): Promise<void> {
  const {
    initialPath = '/',
    windowWidth = 1200,
    windowHeight = 800,
    devServerUrl,
    uiBuildPath,
    preloadPath,
  } = options;

  // Determine current file location
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);

  // Resolve paths
  const resolvedPreloadPath = preloadPath || resolve(__dirname, '../preload.js');
  const resolvedUiPath = uiBuildPath || resolve(__dirname, '../../ui/out/index.html');

  // Build the initial URL
  let initialUrl: string;
  if (devServerUrl) {
    // In development, use the dev server
    initialUrl = `${devServerUrl}${initialPath}`;
  } else {
    // In production, use the static files
    initialUrl = `file://${resolvedUiPath}${initialPath === '/' ? '' : initialPath}`;
  }

  console.log(`Starting app with initial URL: ${initialUrl}`);

  // Store the main window reference
  let mainWindow: BrowserWindow | null = null;

  /**
   * Create the main browser window
   */
  function createWindow() {
    mainWindow = new BrowserWindow({
      width: windowWidth,
      height: windowHeight,
      webPreferences: {
        preload: resolvedPreloadPath,
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    // Load the initial URL
    mainWindow.loadURL(initialUrl);

    // Open DevTools in development mode
    /*
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
    */

    // Handle window close
    mainWindow.on('closed', () => {
      mainWindow = null;
    });
  }

  // Wait for Electron to be ready
  await app.whenReady();

  // Create the window
  createWindow();

  // Handle app activation (macOS specific)
  app.on('activate', () => {
    // On macOS it's common to re-create a window when the dock icon is clicked
    // and there are no other windows open
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  // Quit when all windows are closed (except on macOS)
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  console.log('Electron app launched successfully');
}
