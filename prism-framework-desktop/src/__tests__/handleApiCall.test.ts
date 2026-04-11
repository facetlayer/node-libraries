import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
    PrismApp,
    createEndpoint,
    NotFoundError,
    Authorization,
    getCurrentRequestContext,
} from '@facetlayer/prism-framework/core';
import { createApiCallHandler } from '../handleApiCall.js';

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

    const notFound = createEndpoint({
        method: 'GET',
        path: '/missing',
        handler: async () => {
            throw new NotFoundError('gone');
        },
    });

    const whoami = createEndpoint({
        method: 'GET',
        path: '/whoami',
        handler: async () => {
            const ctx = getCurrentRequestContext();
            return { auth: ctx?.auth ? 'present' : 'absent' };
        },
    });

    return new PrismApp({
        name: 'test-app',
        services: [
            {
                name: 'items',
                endpoints: [listItems, getItem, createItem, notFound, whoami],
            },
        ],
    });
}

describe('createApiCallHandler', () => {
    it('routes GET requests to the matching endpoint', async () => {
        const handler = createApiCallHandler(createTestApp());
        const result = await handler('GET', '/items', {});
        expect(result).toEqual([{ id: '1', name: 'Item 1' }]);
    });

    it('substitutes :params from the payload', async () => {
        const handler = createApiCallHandler(createTestApp());
        const result = await handler('GET', '/items/:id', { params: { id: '42' } });
        expect(result).toEqual({ id: '42', name: 'Item 42' });
    });

    it('passes body params to POST endpoints', async () => {
        const handler = createApiCallHandler(createTestApp());
        const result = await handler('POST', '/items', { params: { name: 'new' } });
        expect(result).toEqual({ id: '2', name: 'new' });
    });

    it('lower-case methods still route', async () => {
        const handler = createApiCallHandler(createTestApp());
        const result = await handler('get', '/items', {});
        expect(Array.isArray(result)).toBe(true);
    });

    it('normalizes HttpError into a serializable error', async () => {
        const handler = createApiCallHandler(createTestApp());
        await expect(handler('GET', '/missing', {})).rejects.toThrow(/"statusCode":404/);
    });

    it('wraps calls in a request context with auth', async () => {
        const auth = new Authorization();
        const handler = createApiCallHandler(createTestApp(), { getAuth: () => auth });
        const result = await handler('GET', '/whoami', {});
        expect(result).toEqual({ auth: 'present' });
    });

    it('throws when the endpoint is not registered', async () => {
        const handler = createApiCallHandler(createTestApp());
        await expect(handler('GET', '/nonexistent', {})).rejects.toThrow(/Endpoint not found/);
    });
});
