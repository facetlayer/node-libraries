/**
 * Electron main process entry point for Prism Framework desktop applications.
 *
 * This file is responsible for:
 * 1. Importing Electron dependencies
 * 2. Loading the application bundle (built from src/_main/desktop-main.ts)
 * 3. Passing Electron dependencies to the application via dependency injection
 * 4. Handling development vs release mode configurations
 *
 * This is the ONLY file in the project that directly imports from 'electron'.
 *
 * ## Development Modes
 *
 * ### Local Development Mode (NODE_ENV=development)
 * - API server runs as HTTP server
 * - UI runs in Next.js dev server with hot reload
 * - Electron window loads the dev server URL (default: http://localhost:4000)
 *
 * ### Release Mode (production)
 * - API server uses IPC for communication
 * - UI is pre-built as static files
 * - Electron window loads static files from filesystem
 */

import { app, BrowserWindow, ipcMain } from 'electron';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Types for the desktop-main module
export interface ElectronDependencies {
  BrowserWindow: any;
  ipcMain: any;
  app: any;
}

export interface DesktopMainConfig {
  databasePath: string;
  windowWidth?: number;
  windowHeight?: number;
  preloadJsPath: string;
  initialUrl: string;
  isDevelopment: boolean;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  try {
    // Load the application bundle
    // This bundle is built from src/_main/desktop-main.ts
    const bundlePath = resolve(__dirname, '../../dist/_main/desktop-main.js');
    console.log('Loading application bundle from:', bundlePath);

    const appModule = await import(bundlePath);

    // Create the dependency injection container
    const electron: ElectronDependencies = {
      app,
      BrowserWindow,
      ipcMain,
    };

    // Configuration for the desktop app
    const isDev = process.env.NODE_ENV === 'development';
    const uiPath = resolve(__dirname, '../../ui/out/index.html');

    const config: DesktopMainConfig = {
      databasePath: process.env.DATABASE_PATH || resolve(__dirname, '../../.data'),
      windowWidth: parseInt(process.env.WINDOW_WIDTH || '1200'),
      windowHeight: parseInt(process.env.WINDOW_HEIGHT || '800'),
      preloadJsPath: resolve(__dirname, 'preload.js'),
      initialUrl: process.env.INITIAL_URL || (isDev ? 'http://localhost:4000' : `file://${uiPath}`),
      isDevelopment: isDev,
    };

    console.log(`Starting in ${isDev ? 'development' : 'release'} mode`);
    console.log(`Initial URL: ${config.initialUrl}`);

    // Start the application
    await appModule.main(electron, config);
  } catch (error) {
    console.error('Failed to start application:', error);
    process.exit(1);
  }
}

main();
