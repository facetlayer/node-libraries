/**
 * @facetlayer/prism-framework-desktop
 *
 * Electron integration for Prism Framework applications. Wires a PrismApp
 * into an Electron main process and provides an IPC bridge that the renderer
 * can use as a drop-in replacement for HTTP fetch.
 */

// Main-process launcher (imports electron — only usable from the main process)
export { desktopLaunch, getFrameworkPreloadPath } from './desktopLaunch.js';
export type { DesktopLaunchOptions, DesktopLaunchResult } from './desktopLaunch.js';

// Main-process IPC handler (electron-free, safe to import anywhere)
export { createApiCallHandler } from './handleApiCall.js';
export type { HandleApiCallOptions, IpcApiCallPayload } from './handleApiCall.js';

// Renderer-side fetch bridge
export { createDesktopFetch } from './desktopFetch.js';
export type { ApiRequestOptions, CreateDesktopFetchOptions } from './desktopFetch.js';

// Preload API type — shape of the bridge installed on `window.electron`.
export type { ElectronAPI } from './ElectronAPI.js';
