/**
 * Preload script for Prism Framework desktop apps.
 *
 * Authored as CommonJS (.cjs) so Electron's preload loader can require it
 * regardless of whether the consuming app is ESM or CJS. Copied to `dist/`
 * verbatim by the build script — no TypeScript compilation involved.
 *
 * Exposes `window.electron.apiCall` in the renderer, which forwards to the
 * `prism:apiCall` IPC handler registered by `desktopLaunch`.
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    apiCall: (method, path, options) => {
        return ipcRenderer.invoke('prism:apiCall', method, path, options);
    },
});
