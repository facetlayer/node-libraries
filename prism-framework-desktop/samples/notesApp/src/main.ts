/**
 * Electron entry point for the sample.
 *
 * Builds the shared PrismApp (see `createApp.ts`) and hands it to
 * `desktopLaunch`, which wires the main-process IPC handler and loads the
 * static HTML UI from `../web/index.html`.
 */

import { desktopLaunch } from '@facetlayer/prism-framework-desktop';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { createApp } from './createApp.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const uiPath = resolve(__dirname, '../web/index.html');

desktopLaunch({
    app: createApp(),
    appName: 'Prism Notes Sample',
    uiBuildPath: uiPath,
    windowWidth: 900,
    windowHeight: 700,
    onWindowCreated: (window) => {
        window.webContents.openDevTools({ mode: 'detach' });
    },
}).catch((err) => {
    console.error('Failed to launch desktop app:', err);
    process.exit(1);
});
