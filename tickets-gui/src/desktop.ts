/**
 * Electron entry point for Tickets Manager.
 *
 * Starts an Express server on an OS-assigned port (port 0), reads the actual
 * port back, and hands the resulting URL to `desktopLaunch`. Using port 0
 * means multiple instances can run concurrently without port conflicts —
 * each one grabs whatever's free.
 *
 * The existing React UI uses `webFetch` directly and relies on same-origin
 * relative paths, so no renderer-side changes are needed: the BrowserWindow
 * simply loads the local Express server and the UI calls `/api/*` back to
 * the same origin.
 */

import { startServer } from '@facetlayer/prism-framework';
import { desktopLaunch } from '@facetlayer/prism-framework-desktop';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import type { AddressInfo } from 'net';
import { createApp } from './createApp.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const webDir = join(__dirname, '..', 'web');

// Force static serving mode — the build has no Vite middleware at runtime.
process.env.NODE_ENV = process.env.NODE_ENV ?? 'production';

const app = createApp();

// Start Express on an OS-assigned port so multiple desktop instances don't
// collide. `server.address().port` returns the actual port once listening.
const server = await startServer({
    port: 0,
    app,
    web: { dir: webDir },
});

const address = server.address() as AddressInfo;
const port = address.port;
const devServerUrl = `http://localhost:${port}`;
console.log(`[tickets-gui] Express bound to ${devServerUrl}`);

await desktopLaunch({
    app,
    appName: 'Tickets Manager',
    devServerUrl,
    windowWidth: 1200,
    windowHeight: 800,
});
