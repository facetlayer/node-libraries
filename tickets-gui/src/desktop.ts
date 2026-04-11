/**
 * Electron entry point for Tickets Manager.
 *
 * Starts an Express server on an OS-assigned port (port 0), reads the actual
 * port back, and hands the resulting URL to `desktopLaunch`. Using port 0
 * means multiple instances can run concurrently without port conflicts —
 * each one grabs whatever's free.
 *
 * Important: this module must not use top-level `await`. Electron's main
 * process fires its `ready` event only after the main module finishes
 * synchronous evaluation, so `await app.whenReady()` at module top-level
 * deadlocks. Wrap async work in a regular function and kick it off with
 * `.catch()` — never `await` at the top of an Electron main module.
 */

import { startServer } from '@facetlayer/prism-framework';
import { desktopLaunch } from '@facetlayer/prism-framework-desktop';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import type { AddressInfo } from 'net';
import { createApp } from './createApp.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const webDir = join(__dirname, '..', 'web');
const iconPath = join(__dirname, '..', 'assets', 'icon.png');

// Force static serving mode — the build has no Vite middleware at runtime.
process.env.NODE_ENV = process.env.NODE_ENV ?? 'production';

async function main() {
    const app = createApp();

    // Start Express on an OS-assigned port so multiple desktop instances
    // don't collide. `server.address().port` returns the actual port once
    // listening.
    const server = await startServer({
        port: 0,
        app,
        web: { dir: webDir },
    });

    const { port } = server.address() as AddressInfo;
    const devServerUrl = `http://localhost:${port}`;
    console.log(`[tickets-gui] Express bound to ${devServerUrl}`);

    await desktopLaunch({
        app,
        appName: 'Tickets Manager',
        title: 'Tickets Manager',
        iconPath,
        devServerUrl,
        windowWidth: 1200,
        windowHeight: 800,
    });
}

main().catch((err) => {
    console.error('[tickets-gui] Failed to launch desktop app:', err);
    process.exit(1);
});
