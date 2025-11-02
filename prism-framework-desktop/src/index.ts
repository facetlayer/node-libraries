/**
 * @facetlayer/prism-framework-desktop
 *
 * Electron desktop integration library for Prism Framework applications.
 *
 * This library provides the necessary components to run a Prism Framework
 * application as an Electron desktop app, with support for both development
 * and release modes.
 */

// Export types from main.ts
export type { ElectronDependencies, DesktopMainConfig } from './main.js';

// Export types from preload.ts
export type { ElectronAPI } from './preload.js';

// Export the simplified launch function
export { desktopLaunch } from './desktopLaunch.js';
export type { DesktopLaunchOptions } from './desktopLaunch.js';
