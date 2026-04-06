import type { PrismApp } from '@facetlayer/prism-framework/core';
import { isHttpError, Authorization, withRequestContext } from '@facetlayer/prism-framework/core';

export interface ApiRequestOptions {
    params?: any;
    host?: string;
    headers?: Record<string, string>;
}

export interface ExpoFetchOptions {
    /**
     * Optional function that returns an Authorization object for each request.
     * On mobile, auth typically comes from stored tokens rather than cookies,
     * so this provides the equivalent of Express auth middleware.
     *
     * Example:
     *   createExpoFetch(app, {
     *     getAuth: () => {
     *       const auth = new Authorization();
     *       auth.setUserPermissions({ userId: currentUser.id, permissions: ['read', 'write'] });
     *       return auth;
     *     }
     *   })
     */
    getAuth?: () => Authorization;
}

/**
 * Creates an in-process fetch function that calls PrismApp.callEndpoint() directly.
 * This replaces HTTP-based webFetch for Expo/React Native apps where the "server"
 * runs in the same process as the UI.
 *
 * The returned function matches the webFetch signature so UI code is transport-agnostic.
 *
 * Each call is wrapped in a RequestContext so endpoints can use getCurrentRequestContext()
 * for auth checks. Pass a getAuth function to provide authorization data.
 *
 * Error handling matches webFetch: HttpErrors are re-thrown as plain Errors with
 * `"Fetch error, status: <code>"` so UI error handling works identically across platforms.
 */
export function createExpoFetch(app: PrismApp, fetchOptions: ExpoFetchOptions = {}) {
    return async function expoFetch(endpoint: string, options: ApiRequestOptions = {}): Promise<any> {
        if (options.host) {
            console.warn(
                `[prism-framework-expo] "host" option was passed to expoFetch but is ignored ` +
                `because endpoints run in-process on mobile. Remove the "host" option to silence this warning.`
            );
        }

        // Parse the endpoint string to extract method and path
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

        // Replace path parameters with values from params object
        const usedParamKeys = new Set<string>();
        const pathSegments = path.split('/');

        for (let i = 0; i < pathSegments.length; i++) {
            const segment = pathSegments[i];
            if (segment.startsWith(':')) {
                const paramName = segment.slice(1);
                if (options.params && paramName in options.params) {
                    pathSegments[i] = String(options.params[paramName]);
                    usedParamKeys.add(paramName);
                }
            }
        }

        const finalPath = pathSegments.join('/');

        // Filter out used path params from remaining params
        const remainingParams = options.params
            ? Object.fromEntries(
                Object.entries(options.params).filter(([key]) => !usedParamKeys.has(key))
            )
            : {};

        // Build request context with auth (equivalent of Express middleware on web)
        const auth = fetchOptions.getAuth?.() ?? new Authorization();
        const context = {
            requestId: globalThis.crypto.randomUUID(),
            startTime: Date.now(),
            auth,
        };

        try {
            // Call the endpoint within a request context so handlers
            // can use getCurrentRequestContext() for auth checks
            return await withRequestContext(context, () =>
                app.callEndpoint({
                    method,
                    path: finalPath,
                    input: Object.keys(remainingParams).length > 0 ? remainingParams : undefined,
                })
            );
        } catch (error) {
            // Normalize errors to match webFetch error shape so UI code works cross-platform
            if (isHttpError(error)) {
                throw new Error(`Fetch error, status: ${error.statusCode}`);
            }
            throw error;
        }
    };
}
