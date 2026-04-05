import { describe, it, expect, vi } from 'vitest';
import { createExpoFetch } from '../expoFetch.js';
import { PrismApp, createEndpoint, BadRequestError, NotFoundError, Authorization, getCurrentRequestContext } from '@facetlayer/prism-framework/core';
import { z } from 'zod';

function createTestApp() {
    const listItems = createEndpoint({
        method: 'GET',
        path: '/items',
        responseSchema: z.array(z.object({ id: z.string(), name: z.string() })),
        handler: async () => [{ id: '1', name: 'Item 1' }],
    });

    const getItem = createEndpoint({
        method: 'GET',
        path: '/items/:id',
        requestSchema: z.object({ id: z.string() }),
        responseSchema: z.object({ id: z.string(), name: z.string() }),
        handler: async (input) => ({ id: input.id, name: `Item ${input.id}` }),
    });

    const createItem = createEndpoint({
        method: 'POST',
        path: '/items',
        requestSchema: z.object({ name: z.string() }),
        responseSchema: z.object({ id: z.string(), name: z.string() }),
        handler: async (input) => ({ id: '2', name: input.name }),
    });

    const app = new PrismApp({
        name: 'test-app',
        services: [{
            name: 'items',
            endpoints: [listItems, getItem, createItem],
        }],
    });

    return app;
}

describe('createExpoFetch', () => {
    it('calls a GET endpoint', async () => {
        const app = createTestApp();
        const fetch = createExpoFetch(app);

        const result = await fetch('GET /items');
        expect(result).toEqual([{ id: '1', name: 'Item 1' }]);
    });

    it('defaults to GET when no method is specified', async () => {
        const app = createTestApp();
        const fetch = createExpoFetch(app);

        const result = await fetch('/items');
        expect(result).toEqual([{ id: '1', name: 'Item 1' }]);
    });

    it('substitutes path parameters from params', async () => {
        const app = createTestApp();
        const fetch = createExpoFetch(app);

        const result = await fetch('GET /items/:id', { params: { id: '42' } });
        expect(result).toEqual({ id: '42', name: 'Item 42' });
    });

    it('passes remaining params as input for POST', async () => {
        const app = createTestApp();
        const fetch = createExpoFetch(app);

        const result = await fetch('POST /items', { params: { name: 'New Item' } });
        expect(result).toEqual({ id: '2', name: 'New Item' });
    });

    it('separates path params from body params', async () => {
        const app = createTestApp();
        const fetch = createExpoFetch(app);

        // id goes into path, rest would be input
        const result = await fetch('GET /items/:id', { params: { id: '5' } });
        expect(result).toEqual({ id: '5', name: 'Item 5' });
    });

    it('throws for non-existent endpoints', async () => {
        const app = createTestApp();
        const fetch = createExpoFetch(app);

        await expect(fetch('GET /nonexistent')).rejects.toThrow('Endpoint not found');
    });

    it('handles case-insensitive method', async () => {
        const app = createTestApp();
        const fetch = createExpoFetch(app);

        const result = await fetch('get /items');
        expect(result).toEqual([{ id: '1', name: 'Item 1' }]);
    });

    it('normalizes HttpError to match webFetch error format', async () => {
        const throwingEndpoint = createEndpoint({
            method: 'GET',
            path: '/fail',
            handler: async () => { throw new NotFoundError('thing not found'); },
        });

        const app = new PrismApp({
            name: 'error-test',
            services: [{ name: 'errors', endpoints: [throwingEndpoint] }],
        });

        const fetch = createExpoFetch(app);
        await expect(fetch('GET /fail')).rejects.toThrow('Fetch error, status: 404');
    });

    it('normalizes validation errors to match webFetch error format', async () => {
        const app = createTestApp();
        const fetch = createExpoFetch(app);

        // POST /items expects { name: string }, send wrong data
        await expect(fetch('POST /items', { params: { wrong: 'data' } }))
            .rejects.toThrow('Fetch error, status: 422');
    });

    it('lets non-HttpError errors propagate unchanged', async () => {
        const throwingEndpoint = createEndpoint({
            method: 'GET',
            path: '/crash',
            handler: async () => { throw new TypeError('something broke'); },
        });

        const app = new PrismApp({
            name: 'error-test',
            services: [{ name: 'errors', endpoints: [throwingEndpoint] }],
        });

        const fetch = createExpoFetch(app);
        await expect(fetch('GET /crash')).rejects.toThrow('something broke');
    });

    it('warns when host option is passed', async () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const app = createTestApp();
        const fetch = createExpoFetch(app);

        await fetch('GET /items', { host: 'http://localhost:3000' });

        expect(warnSpy).toHaveBeenCalledWith(
            expect.stringContaining('host')
        );
        warnSpy.mockRestore();
    });

    it('provides RequestContext with auth to endpoint handlers', async () => {
        let capturedUserId: string | undefined;

        const authEndpoint = createEndpoint({
            method: 'GET',
            path: '/whoami',
            handler: async () => {
                const ctx = getCurrentRequestContext();
                capturedUserId = ctx?.auth.getUserPermissions()?.userId;
                return { userId: capturedUserId };
            },
        });

        const app = new PrismApp({
            name: 'auth-test',
            services: [{ name: 'auth', endpoints: [authEndpoint] }],
        });

        const auth = new Authorization();
        auth.setUserPermissions({ userId: 'user-42', permissions: ['read'] });

        const fetch = createExpoFetch(app, {
            getAuth: () => auth,
        });

        const result = await fetch('GET /whoami');
        expect(result).toEqual({ userId: 'user-42' });
        expect(capturedUserId).toBe('user-42');
    });

    it('provides empty Authorization when no getAuth is configured', async () => {
        let hasAuth = false;

        const checkEndpoint = createEndpoint({
            method: 'GET',
            path: '/check-auth',
            handler: async () => {
                const ctx = getCurrentRequestContext();
                hasAuth = ctx?.auth !== undefined;
                return { hasAuth };
            },
        });

        const app = new PrismApp({
            name: 'auth-test',
            services: [{ name: 'auth', endpoints: [checkEndpoint] }],
        });

        const fetch = createExpoFetch(app);
        await fetch('GET /check-auth');
        expect(hasAuth).toBe(true);
    });
});
