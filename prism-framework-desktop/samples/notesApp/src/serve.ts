/**
 * Web-mode entry point for the sample.
 *
 * Runs the same PrismApp (with `notesService`) as an Express server so the
 * UI can be exercised with `playwright-cli` or any other standard browser
 * tooling. The Electron entry point (`main.ts`) and this file share
 * `createApp()`, so any bug found in web mode reproduces in Electron mode
 * too.
 *
 * Endpoints are mounted at `/api/*` (Prism's default) and `web/index.html`
 * is served at `/`. Port defaults to 4800 and can be overridden with
 * `PRISM_API_PORT`.
 */

import { startServer } from '@facetlayer/prism-framework';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { createApp } from './createApp.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const webDir = resolve(__dirname, '../web');

// Force static mode — the sample has no Vite installed.
process.env.NODE_ENV = process.env.NODE_ENV ?? 'production';

const port = process.env.PRISM_API_PORT ? parseInt(process.env.PRISM_API_PORT, 10) : 4810;

await startServer({
    app: createApp(),
    port,
    web: { dir: webDir },
});

console.log(`Prism Notes Sample (web mode) listening on http://localhost:${port}`);
console.log(`  UI:  http://localhost:${port}/`);
console.log(`  API: http://localhost:${port}/api/notes`);
