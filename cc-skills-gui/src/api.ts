/**
 * Web-only entry point — runs the Prism app as an Express server on a fixed
 * port. Useful for browser-only development and for driving the UI with
 * playwright-cli.
 *
 * For the actual desktop app, see `desktop.ts`.
 */

import { startServer, startStdinServer } from '@facetlayer/prism-framework';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createApp } from './createApp.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PRISM_API_PORT || '4013', 10);

if (process.argv.includes('--stdin')) {
    startStdinServer({ app: createApp() });
} else {
    await startServer({
        port: PORT,
        app: createApp(),
        corsConfig: { allowLocalhost: true },
        web: { dir: join(__dirname, '..', 'web') },
    });

    console.log(`cc-skills-gui (web mode) running at http://localhost:${PORT}`);
}
