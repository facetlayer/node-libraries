import { packageDesktopApp } from '@facetlayer/prism-framework-desktop/packaging';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const { appPath } = await packageDesktopApp({
    projectDir,
    appId: 'com.facetlayer.tickets-gui',
    productName: 'Tickets Manager',
    main: 'dist/desktop.js',
});

console.log(`[tickets-gui] Packaged desktop app at: ${appPath}`);
console.log(`[tickets-gui] Launch with: open "${appPath}"`);
