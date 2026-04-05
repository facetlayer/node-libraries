import { describe, it, expect, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { ExpoSqliteDatabase } from '../ExpoSqliteDatabase.js';
import { expoLaunch } from '../expoLaunch.js';
import { PrismApp, createEndpoint, Authorization } from '@facetlayer/prism-framework/core';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';

const TEST_DIR = path.join(import.meta.dirname, '../../test/temp');

/**
 * Wraps better-sqlite3 to match the expo-sqlite synchronous API surface.
 * This lets us run real SQLite integration tests without needing expo-sqlite.
 */
function createExpoSQLiteMock(dbPath: string) {
    return {
        openDatabaseSync(name: string) {
            const fullPath = path.join(dbPath, name);
            const db = new Database(fullPath);

            return {
                runSync(sql: string, params?: any) {
                    const stmt = db.prepare(sql);
                    const normalizedParams = Array.isArray(params) ? params : (params ? [params] : []);
                    const result = stmt.run(...normalizedParams);
                    return { changes: result.changes, lastInsertRowid: result.lastInsertRowid };
                },
                getFirstSync(sql: string, params?: any) {
                    const stmt = db.prepare(sql);
                    const normalizedParams = Array.isArray(params) ? params : (params ? [params] : []);
                    return stmt.get(...normalizedParams) ?? null;
                },
                getAllSync(sql: string, params?: any) {
                    const stmt = db.prepare(sql);
                    const normalizedParams = Array.isArray(params) ? params : (params ? [params] : []);
                    return stmt.all(...normalizedParams);
                },
                closeSync() {
                    db.close();
                },
                _betterSqlite: db,
            };
        },
    };
}

function ensureTestDir() {
    fs.mkdirSync(TEST_DIR, { recursive: true });
}

function cleanTestDir() {
    if (fs.existsSync(TEST_DIR)) {
        fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
}

describe('Integration: full expoLaunch + expoFetch with real SQLite', () => {
    afterEach(() => {
        cleanTestDir();
    });

    it('creates tables, inserts data, and queries it via endpoints', async () => {
        ensureTestDir();
        const mockSQLite = createExpoSQLiteMock(TEST_DIR);

        // Create database before endpoints so handlers can close over it
        const db = ExpoSqliteDatabase.open(mockSQLite, 'notes.db');

        const listNotes = createEndpoint({
            method: 'GET',
            path: '/notes',
            responseSchema: z.array(z.object({ id: z.number(), title: z.string(), body: z.string() })),
            handler: async () => {
                return db.list('SELECT id, title, body FROM notes');
            },
        });

        const createNote = createEndpoint({
            method: 'POST',
            path: '/notes',
            requestSchema: z.object({ title: z.string(), body: z.string() }),
            responseSchema: z.object({ id: z.number(), title: z.string(), body: z.string() }),
            handler: async (input) => {
                const result = db.run(
                    'INSERT INTO notes (title, body) VALUES (?, ?)',
                    [input.title, input.body],
                );
                return { id: Number(result.lastInsertRowid), title: input.title, body: input.body };
            },
        });

        const getNote = createEndpoint({
            method: 'GET',
            path: '/notes/:id',
            requestSchema: z.object({ id: z.string() }),
            responseSchema: z.object({ id: z.number(), title: z.string(), body: z.string() }).nullable(),
            handler: async (input) => {
                return db.get('SELECT id, title, body FROM notes WHERE id = ?', [input.id]) ?? null;
            },
        });

        const deleteNote = createEndpoint({
            method: 'DELETE',
            path: '/notes/:id',
            requestSchema: z.object({ id: z.string() }),
            responseSchema: z.object({ deleted: z.boolean() }),
            handler: async (input) => {
                const result = db.run('DELETE FROM notes WHERE id = ?', [input.id]);
                return { deleted: result.changes > 0 };
            },
        });

        const app = new PrismApp({
            name: 'integration-test',
            services: [{
                name: 'notes',
                endpoints: [listNotes, createNote, getNote, deleteNote],
                databases: {
                    main: {
                        statements: [
                            'CREATE TABLE IF NOT EXISTS notes (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, body TEXT NOT NULL)',
                        ],
                    },
                },
            }],
        });

        // Launch with pre-created database
        const { fetch } = await expoLaunch({
            app,
            databases: { main: db },
        });

        // List — should be empty initially
        const emptyList = await fetch('GET /notes');
        expect(emptyList).toEqual([]);

        // Create two notes
        const note1 = await fetch('POST /notes', { params: { title: 'First', body: 'Body 1' } });
        expect(note1).toEqual({ id: 1, title: 'First', body: 'Body 1' });

        const note2 = await fetch('POST /notes', { params: { title: 'Second', body: 'Body 2' } });
        expect(note2).toEqual({ id: 2, title: 'Second', body: 'Body 2' });

        // List — should have two notes
        const fullList = await fetch('GET /notes');
        expect(fullList).toHaveLength(2);

        // Get by ID
        const fetched = await fetch('GET /notes/:id', { params: { id: '1' } });
        expect(fetched).toEqual({ id: 1, title: 'First', body: 'Body 1' });

        // Delete
        const deleted = await fetch('DELETE /notes/:id', { params: { id: '1' } });
        expect(deleted).toEqual({ deleted: true });

        // Verify deletion
        const afterDelete = await fetch('GET /notes');
        expect(afterDelete).toHaveLength(1);
        expect(afterDelete[0].id).toBe(2);

        // Clean up
        db.close();
    });

    it('auth context is available in endpoint handlers', async () => {
        ensureTestDir();

        const whoami = createEndpoint({
            method: 'GET',
            path: '/whoami',
            handler: async () => {
                const { getCurrentRequestContext } = await import('@facetlayer/prism-framework/core');
                const ctx = getCurrentRequestContext();
                const userId = ctx?.auth?.getUserPermissions()?.userId ?? 'anonymous';
                return { userId };
            },
        });

        const app = new PrismApp({
            name: 'auth-integration',
            services: [{ name: 'auth', endpoints: [whoami] }],
        });

        const auth = new Authorization();
        auth.setUserPermissions({ userId: 'mobile-user-1', permissions: ['read', 'write'] });

        const { fetch } = await expoLaunch({
            app,
            getAuth: () => auth,
        });

        const result = await fetch('GET /whoami');
        expect(result).toEqual({ userId: 'mobile-user-1' });
    });

    it('handles multiple databases', async () => {
        ensureTestDir();
        const mockSQLite = createExpoSQLiteMock(TEST_DIR);

        const usersDb = ExpoSqliteDatabase.open(mockSQLite, 'users.db');
        const logsDb = ExpoSqliteDatabase.open(mockSQLite, 'logs.db');

        const listUsers = createEndpoint({
            method: 'GET',
            path: '/users',
            handler: async () => usersDb.list('SELECT * FROM users'),
        });

        const listLogs = createEndpoint({
            method: 'GET',
            path: '/logs',
            handler: async () => logsDb.list('SELECT * FROM logs'),
        });

        const app = new PrismApp({
            name: 'multi-db-test',
            services: [
                {
                    name: 'users',
                    endpoints: [listUsers],
                    databases: {
                        users: {
                            statements: ['CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT)'],
                        },
                    },
                },
                {
                    name: 'logs',
                    endpoints: [listLogs],
                    databases: {
                        logs: {
                            statements: ['CREATE TABLE IF NOT EXISTS logs (id INTEGER PRIMARY KEY, message TEXT)'],
                        },
                    },
                },
            ],
        });

        const { fetch, databases } = await expoLaunch({
            app,
            databases: { users: usersDb, logs: logsDb },
        });

        expect(databases.users).toBe(usersDb);
        expect(databases.logs).toBe(logsDb);

        // Both tables should exist and be queryable
        const users = await fetch('GET /users');
        expect(users).toEqual([]);

        const logs = await fetch('GET /logs');
        expect(logs).toEqual([]);

        usersDb.close();
        logsDb.close();
    });
});

describe('Integration: migrateSchema with real SQLite', () => {
    afterEach(() => {
        cleanTestDir();
    });

    it('tracks applied statements and only runs new ones', () => {
        ensureTestDir();
        const mockSQLite = createExpoSQLiteMock(TEST_DIR);
        const db = ExpoSqliteDatabase.open(mockSQLite, 'migrate.db');

        const services = [{
            name: 'notes',
            endpoints: [],
            databases: {
                main: {
                    statements: [
                        'CREATE TABLE IF NOT EXISTS notes (id INTEGER PRIMARY KEY, title TEXT)',
                    ],
                },
            },
        }];

        // First run — should apply 1 statement
        const firstRun = db.migrateSchema('main', services);
        expect(firstRun).toBe(1);

        // Second run — same statements, should apply 0
        const secondRun = db.migrateSchema('main', services);
        expect(secondRun).toBe(0);

        // Third run — add a new statement
        services[0].databases.main.statements.push(
            'CREATE TABLE IF NOT EXISTS tags (id INTEGER PRIMARY KEY, name TEXT)'
        );
        const thirdRun = db.migrateSchema('main', services);
        expect(thirdRun).toBe(1);

        // Verify both tables exist
        const notes = db.list('SELECT name FROM sqlite_master WHERE type = ? AND name = ?', ['table', 'notes']);
        expect(notes).toHaveLength(1);

        const tags = db.list('SELECT name FROM sqlite_master WHERE type = ? AND name = ?', ['table', 'tags']);
        expect(tags).toHaveLength(1);

        db.close();
    });

    it('migration mode works via expoLaunch', async () => {
        ensureTestDir();
        const mockSQLite = createExpoSQLiteMock(TEST_DIR);
        const db = ExpoSqliteDatabase.open(mockSQLite, 'launch-migrate.db');

        const app = new PrismApp({
            name: 'migrate-test',
            services: [{
                name: 'items',
                endpoints: [],
                databases: {
                    main: {
                        statements: [
                            'CREATE TABLE IF NOT EXISTS items (id INTEGER PRIMARY KEY, name TEXT)',
                        ],
                    },
                },
            }],
        });

        await expoLaunch({
            app,
            databases: { main: db },
            migrationMode: 'migrate',
        });

        // Verify the migration tracking table exists
        const migrations = db.list('SELECT * FROM _prism_migrations');
        expect(migrations).toHaveLength(1);

        // Run again — no new migrations
        await expoLaunch({
            app,
            databases: { main: db },
            migrationMode: 'migrate',
        });

        const migrationsAfter = db.list('SELECT * FROM _prism_migrations');
        expect(migrationsAfter).toHaveLength(1);

        db.close();
    });
});
