/**
 * Renderer-side fetch bridge that routes API calls over Electron IPC
 * to the Prism app running in the main process.
 *
 * Usage (in the renderer):
 *   import { setFetchImplementation } from '@facetlayer/prism-framework-ui';
 *   import { createDesktopFetch } from '@facetlayer/prism-framework-desktop/renderer';
 *
 *   setFetchImplementation(createDesktopFetch());
 */

import type { ElectronAPI } from './ElectronAPI.js';

export interface ApiRequestOptions {
    params?: any;
    host?: string;
    headers?: Record<string, string>;
}

export interface CreateDesktopFetchOptions {
    /**
     * Override the bridge lookup. Defaults to `window.electron` which is
     * installed by the framework preload script.
     */
    bridge?: ElectronAPI;
}

function resolveBridge(options: CreateDesktopFetchOptions): ElectronAPI {
    if (options.bridge) return options.bridge;
    const w = (globalThis as any).window;
    if (!w || !w.electron || typeof w.electron.apiCall !== 'function') {
        throw new Error(
            '[prism-framework-desktop] window.electron.apiCall is not available. ' +
            'Make sure the preload script from prism-framework-desktop is wired into BrowserWindow.'
        );
    }
    return w.electron as ElectronAPI;
}

/**
 * Creates a fetch function that forwards API calls through the Electron
 * IPC bridge installed by the preload script. The returned function matches
 * the signature used by `apiFetch`/`webFetch` in prism-framework-ui so UI code
 * stays transport-agnostic.
 */
export function createDesktopFetch(options: CreateDesktopFetchOptions = {}) {
    const bridge = resolveBridge(options);

    return async function desktopFetch(
        endpoint: string,
        requestOptions: ApiRequestOptions = {}
    ): Promise<any> {
        if (requestOptions.host) {
            console.warn(
                `[prism-framework-desktop] "host" option was passed to desktopFetch but is ignored ` +
                `because endpoints run in-process over Electron IPC.`
            );
        }

        const parts = endpoint.trim().split(/\s+/);
        let method: string;
        let path: string;

        if (parts.length === 1) {
            method = 'GET';
            path = parts[0];
        } else {
            method = parts[0].toUpperCase();
            path = parts.slice(1).join(' ');
        }

        return bridge.apiCall(method, path, {
            params: requestOptions.params,
            headers: requestOptions.headers,
        });
    };
}
