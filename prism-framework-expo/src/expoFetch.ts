import type { PrismApp } from '@facetlayer/prism-framework/core';

export interface ApiRequestOptions {
    params?: any;
    headers?: Record<string, string>;
}

/**
 * Creates an in-process fetch function that calls PrismApp.callEndpoint() directly.
 * This replaces HTTP-based webFetch for Expo/React Native apps where the "server"
 * runs in the same process as the UI.
 *
 * The returned function matches the webFetch signature so UI code is transport-agnostic.
 */
export function createExpoFetch(app: PrismApp) {
    return async function expoFetch(endpoint: string, options: ApiRequestOptions = {}): Promise<any> {
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

        // Call the endpoint directly in-process
        return app.callEndpoint({
            method,
            path: finalPath,
            input: Object.keys(remainingParams).length > 0 ? remainingParams : undefined,
        });
    };
}
