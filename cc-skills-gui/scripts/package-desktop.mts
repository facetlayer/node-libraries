import { packageDesktopApp } from '@facetlayer/prism-framework-desktop/packaging';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const { appPath } = await packageDesktopApp({
    projectDir,
    appId: 'com.facetlayer.cc-skills-gui',
    productName: 'Claude Code Skills Editor',
    main: 'dist/desktop.js',
});

console.log(`[cc-skills-gui] Packaged desktop app at: ${appPath}`);
console.log(`[cc-skills-gui] Launch with: open "${appPath}"`);
