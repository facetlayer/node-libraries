import { describe, it, expect } from 'vitest';
import { createExpoFetch } from '../expoFetch.js';
import { PrismApp, createEndpoint } from '@facetlayer/prism-framework/core';
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
});
