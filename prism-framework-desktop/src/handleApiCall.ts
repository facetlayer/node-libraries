/**
 * Main-process handler that forwards IPC "apiCall" messages to a PrismApp.
 *
 * Extracted from desktopLaunch so it can be unit-tested without loading the
 * Electron runtime.
 */

import type { PrismApp } from '@facetlayer/prism-framework/core';
import { Authorization, isHttpError, withRequestContext } from '@facetlayer/prism-framework/core';

export interface HandleApiCallOptions {
    /**
     * Optional function invoked for each request to supply an Authorization
     * object. Desktop apps typically run as a single user, so the default is
     * an empty Authorization — override this if your endpoints need user
     * context from the main process (e.g. a stored session token).
     */
    getAuth?: () => Authorization;
}

export interface IpcApiCallPayload {
    params?: any;
    headers?: Record<string, string>;
}

/**
 * Normalized error shape used internally when forwarding HttpErrors across
 * IPC. Electron's ipcRenderer.invoke serializes thrown errors poorly, so we
 * stringify a tagged payload into the Error message. Not part of the public
 * API — the renderer currently surfaces it as-is.
 */
interface IpcApiCallError {
    __prismError: true;
    statusCode: number;
    message: string;
}

/**
 * Build an IPC handler function that routes requests to `app.callEndpoint`.
 * The returned function has the shape expected by `ipcMain.handle`.
 */
export function createApiCallHandler(app: PrismApp, options: HandleApiCallOptions = {}) {
    return async function apiCallHandler(
        method: string,
        path: string,
        payload: IpcApiCallPayload = {}
    ): Promise<any> {
        const { path: finalPath, consumedKeys } = substitutePathParams(path, payload.params);

        const remainingParams = payload.params
            ? Object.fromEntries(
                  Object.entries(payload.params).filter(([key]) => !consumedKeys.has(key))
              )
            : {};

        const auth = options.getAuth?.() ?? new Authorization();
        const context = {
            requestId: globalThis.crypto.randomUUID(),
            startTime: Date.now(),
            auth,
        };

        try {
            return await withRequestContext(context, () =>
                app.callEndpoint({
                    method: method.toUpperCase(),
                    path: finalPath,
                    input: Object.keys(remainingParams).length > 0 ? remainingParams : undefined,
                })
            );
        } catch (error) {
            if (isHttpError(error)) {
                const normalized: IpcApiCallError = {
                    __prismError: true,
                    statusCode: error.statusCode,
                    message: error.message,
                };
                throw new Error(JSON.stringify(normalized));
            }
            throw error;
        }
    };
}

/**
 * Replace `:name` segments in `path` with values from `params`, returning the
 * substituted path and the set of param keys that were consumed. Keys that
 * don't appear in the path are left in `params` for the caller to forward as
 * body/query input.
 */
function substitutePathParams(
    path: string,
    params: Record<string, unknown> | undefined
): { path: string; consumedKeys: Set<string> } {
    const consumedKeys = new Set<string>();
    if (!params) return { path, consumedKeys };

    const segments = path.split('/').map((segment) => {
        if (!segment.startsWith(':')) return segment;
        const name = segment.slice(1);
        if (!(name in params)) return segment;
        consumedKeys.add(name);
        return String(params[name]);
    });

    return { path: segments.join('/'), consumedKeys };
}
