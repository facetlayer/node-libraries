/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { usePrismApp } from '../usePrismApp.js';
import { PrismApp, createEndpoint } from '@facetlayer/prism-framework/core';
import { z } from 'zod';

function createTestApp() {
    const listEndpoint = createEndpoint({
        method: 'GET',
        path: '/items',
        responseSchema: z.array(z.string()),
        handler: async () => ['a', 'b'],
    });

    return new PrismApp({
        name: 'hook-test',
        services: [{ name: 'test', endpoints: [listEndpoint] }],
    });
}

describe('usePrismApp', () => {
    it('starts in loading state', () => {
        const app = createTestApp();
        const { result } = renderHook(() => usePrismApp(() => ({ app })));

        expect(result.current.isLoading).toBe(true);
        expect(result.current.result).toBeNull();
        expect(result.current.error).toBeNull();
    });

    it('resolves with the launch result', async () => {
        const app = createTestApp();
        const { result } = renderHook(() => usePrismApp(() => ({ app })));

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.result).not.toBeNull();
        expect(typeof result.current.result!.fetch).toBe('function');
        expect(result.current.error).toBeNull();
    });

    it('the returned fetch function works', async () => {
        const app = createTestApp();
        const { result } = renderHook(() => usePrismApp(() => ({ app })));

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        const items = await result.current.result!.fetch('GET /items');
        expect(items).toEqual(['a', 'b']);
    });

    it('captures launch errors', async () => {
        // Create a PrismApp with a startJobs that throws
        const endpoint = createEndpoint({
            method: 'GET',
            path: '/test',
            handler: async () => ({}),
        });

        const app = new PrismApp({
            name: 'error-test',
            services: [{
                name: 'broken',
                endpoints: [endpoint],
                startJobs: async () => { throw new Error('startup failed'); },
            }],
        });

        const { result } = renderHook(() => usePrismApp(() => ({ app })));

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.error).not.toBeNull();
        expect(result.current.error!.message).toBe('startup failed');
        expect(result.current.result).toBeNull();
    });
});
