/**
 * High-level launcher for Prism Framework desktop apps.
 *
 * Wires a PrismApp into Electron: starts the app, creates a BrowserWindow,
 * loads the UI (dev server URL or static file), and registers the IPC
 * handler that forwards `window.electron.apiCall` invocations to the app's
 * endpoints via `callEndpoint`.
 */

import { app, BrowserWindow, ipcMain, nativeImage } from 'electron';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import type { PrismApp } from '@facetlayer/prism-framework/core';
import type { Authorization } from '@facetlayer/prism-framework/core';
import { createApiCallHandler } from './handleApiCall.js';

/**
 * Absolute path to the compiled preload script shipped with this package.
 * Pass this to `new BrowserWindow({ webPreferences: { preload } })` so the
 * renderer gets the `window.electron` bridge.
 */
export function getFrameworkPreloadPath(): string {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    return resolve(__dirname, './preload.cjs');
}

export interface DesktopLaunchOptions {
    /**
     * The PrismApp instance with registered services. IPC calls from the
     * renderer are routed to `app.callEndpoint`.
     */
    app: PrismApp;

    /**
     * Application name shown in the dock/taskbar.
     */
    appName?: string;

    /**
     * Window width in pixels (default: 1200)
     */
    windowWidth?: number;

    /**
     * Window height in pixels (default: 800)
     */
    windowHeight?: number;

    /**
     * Dev server URL to load (e.g. `http://localhost:4000`). If omitted,
     * `uiBuildPath` is used instead.
     */
    devServerUrl?: string;

    /**
     * Absolute path to the built `index.html` for the UI. Used when
     * `devServerUrl` is not provided.
     */
    uiBuildPath?: string;

    /**
     * Initial path appended to the dev server URL (default: '/').
     */
    initialPath?: string;

    /**
     * Override the path to the preload script. Defaults to the preload
     * shipped with this package via `getFrameworkPreloadPath()`.
     */
    preloadPath?: string;

    /**
     * Absolute path to a PNG icon. Applied to the BrowserWindow (taskbar /
     * title bar on Windows / Linux) and, on macOS, to the dock via
     * `app.dock.setIcon`. For packaged apps you should still ship a platform
     * icon through `electron-builder`; this option is primarily for dev
     * runs.
     */
    iconPath?: string;

    /**
     * Initial window title. Note that an HTML `<title>` tag in the loaded
     * page will override this once the page loads — most desktop apps are
     * fine leaving this unset and letting the HTML drive the title.
     */
    title?: string;

    /**
     * Supply an Authorization object for each IPC call. Use this if your
     * endpoints check user permissions — the default is an empty
     * Authorization, which is fine for single-user desktop apps.
     */
    getAuth?: () => Authorization;

    /**
     * Called after the main window is created. Useful for opening devtools,
     * registering extra IPC handlers, or customizing window behavior.
     */
    onWindowCreated?: (window: BrowserWindow) => void;
}

export interface DesktopLaunchResult {
    /**
     * The main BrowserWindow, once created.
     */
    getMainWindow: () => BrowserWindow | null;
}

/**
 * Launch the Electron desktop application and bind it to a PrismApp.
 */
export async function desktopLaunch(options: DesktopLaunchOptions): Promise<DesktopLaunchResult> {
    const {
        app: prismApp,
        appName,
        windowWidth = 1200,
        windowHeight = 800,
        devServerUrl,
        uiBuildPath,
        initialPath = '/',
        preloadPath,
        iconPath,
        title,
        getAuth,
        onWindowCreated,
    } = options;

    if (!prismApp) {
        throw new Error('[prism-framework-desktop] desktopLaunch requires an `app` option');
    }

    if (!devServerUrl && !uiBuildPath) {
        throw new Error(
            '[prism-framework-desktop] desktopLaunch requires either `devServerUrl` or `uiBuildPath`'
        );
    }

    if (appName) {
        app.setName(appName);
    }

    const resolvedPreloadPath = preloadPath || getFrameworkPreloadPath();

    // Load the icon once so BrowserWindow and the macOS dock can share it.
    const iconImage = iconPath ? nativeImage.createFromPath(iconPath) : null;
    if (iconImage && iconImage.isEmpty()) {
        console.warn(`[prism-framework-desktop] Could not load icon at ${iconPath}`);
    }

    let initialUrl: string;
    if (devServerUrl) {
        initialUrl = `${devServerUrl}${initialPath}`;
    } else {
        initialUrl = `file://${uiBuildPath}`;
    }

    // Register the IPC handler that routes apiCall messages into the PrismApp.
    const apiCallHandler = createApiCallHandler(prismApp, { getAuth });
    ipcMain.handle('prism:apiCall', async (_event, method: string, path: string, payload: any) => {
        return apiCallHandler(method, path, payload);
    });

    // Run service startup jobs if any.
    for (const service of prismApp.getAllServices()) {
        if (service.startJobs) {
            await service.startJobs();
        }
    }

    let mainWindow: BrowserWindow | null = null;

    function createWindow() {
        mainWindow = new BrowserWindow({
            width: windowWidth,
            height: windowHeight,
            title,
            icon: iconImage && !iconImage.isEmpty() ? iconImage : undefined,
            webPreferences: {
                preload: resolvedPreloadPath,
                nodeIntegration: false,
                contextIsolation: true,
            },
        });

        mainWindow.loadURL(initialUrl);

        mainWindow.on('closed', () => {
            mainWindow = null;
        });

        onWindowCreated?.(mainWindow);
    }

    await app.whenReady();

    // macOS: BrowserWindow.icon is ignored — the dock uses app.dock.setIcon().
    if (iconImage && !iconImage.isEmpty() && process.platform === 'darwin' && app.dock) {
        app.dock.setIcon(iconImage);
    }

    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });

    app.on('window-all-closed', () => {
        if (process.platform !== 'darwin') {
            app.quit();
        }
    });

    return {
        getMainWindow: () => mainWindow,
    };
}
