import { describe, it, expect, vi } from 'vitest';
import { expoLaunch } from '../expoLaunch.js';
import { ExpoSqliteDatabase } from '../ExpoSqliteDatabase.js';
import { PrismApp, createEndpoint } from '@facetlayer/prism-framework/core';
import { createMockExpoSQLite } from './mockExpoSQLite.js';
import { z } from 'zod';

function createTestApp(options?: { withMiddleware?: boolean; withStartJobs?: () => Promise<void> }) {
    const listEndpoint = createEndpoint({
        method: 'GET',
        path: '/items',
        responseSchema: z.array(z.string()),
        handler: async () => [],
    });

    const service: any = {
        name: 'test-service',
        endpoints: [listEndpoint],
    };

    if (options?.withMiddleware) {
        service.middleware = [() => {}];
    }

    if (options?.withStartJobs) {
        service.startJobs = options.withStartJobs;
    }

    return new PrismApp({
        name: 'test',
        services: [service],
    });
}

describe('expoLaunch', () => {
    it('returns fetch and databases', async () => {
        const app = createTestApp();
        const result = await expoLaunch({ app });

        expect(result).toHaveProperty('fetch');
        expect(result).toHaveProperty('databases');
        expect(typeof result.fetch).toBe('function');
    });

    it('creates databases from config objects', async () => {
        const app = createTestApp();
        const mockSQLite = createMockExpoSQLite();

        const result = await expoLaunch({
            app,
            databases: {
                main: { expoSQLite: mockSQLite },
            },
        });

        expect(result.databases.main).toBeInstanceOf(ExpoSqliteDatabase);
    });

    it('accepts pre-created ExpoSqliteDatabase instances', async () => {
        const app = createTestApp();
        const mockSQLite = createMockExpoSQLite();
        const preCreatedDb = ExpoSqliteDatabase.open(mockSQLite, 'test.db');

        const result = await expoLaunch({
            app,
            databases: {
                main: preCreatedDb,
            },
        });

        // Should be the exact same instance
        expect(result.databases.main).toBe(preCreatedDb);
    });

    it('the returned fetch function works', async () => {
        const app = createTestApp();
        const result = await expoLaunch({ app });

        const items = await result.fetch('GET /items');
        expect(items).toEqual([]);
    });

    it('warns about middleware on mobile', async () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const app = createTestApp({ withMiddleware: true });

        await expoLaunch({ app });

        expect(warnSpy).toHaveBeenCalledWith(
            expect.stringContaining('middleware')
        );
        warnSpy.mockRestore();
    });

    it('calls startJobs for each service', async () => {
        const startJobs = vi.fn().mockResolvedValue(undefined);
        const app = createTestApp({ withStartJobs: startJobs });

        await expoLaunch({ app });

        expect(startJobs).toHaveBeenCalledOnce();
    });

    it('works with no databases configured', async () => {
        const app = createTestApp();
        const result = await expoLaunch({ app });

        expect(result.databases).toEqual({});
    });

    it('uses custom filename for database', async () => {
        const app = createTestApp();
        const openSpy = vi.fn().mockReturnValue({
            runSync: () => ({ changes: 0, lastInsertRowid: 0 }),
            getFirstSync: () => null,
            getAllSync: () => [],
            closeSync: () => {},
        });

        await expoLaunch({
            app,
            databases: {
                main: {
                    expoSQLite: { openDatabaseSync: openSpy },
                    filename: 'custom.db',
                },
            },
        });

        expect(openSpy).toHaveBeenCalledWith('custom.db');
    });

    it('shutdown closes databases', async () => {
        const app = createTestApp();
        const closeSpy = vi.fn();
        const mockSQLite = {
            openDatabaseSync: () => ({
                runSync: () => ({ changes: 0, lastInsertRowid: 0 }),
                getFirstSync: () => null,
                getAllSync: () => [],
                closeSync: closeSpy,
            }),
        };

        const result = await expoLaunch({
            app,
            databases: {
                main: { expoSQLite: mockSQLite },
            },
        });

        result.shutdown();
        expect(closeSpy).toHaveBeenCalledOnce();
    });

    it('shutdown is safe to call multiple times', async () => {
        const app = createTestApp();
        let callCount = 0;
        const mockSQLite = {
            openDatabaseSync: () => ({
                runSync: () => ({ changes: 0, lastInsertRowid: 0 }),
                getFirstSync: () => null,
                getAllSync: () => [],
                closeSync: () => {
                    callCount++;
                    if (callCount > 1) throw new Error('Already closed');
                },
            }),
        };

        const result = await expoLaunch({
            app,
            databases: { main: { expoSQLite: mockSQLite } },
        });

        // Should not throw on second call
        result.shutdown();
        result.shutdown();
    });
});
