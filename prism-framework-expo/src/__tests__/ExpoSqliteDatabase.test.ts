import { describe, it, expect } from 'vitest';
import { ExpoSqliteDatabase } from '../ExpoSqliteDatabase.js';
import { createMockExpoSQLite } from './mockExpoSQLite.js';

describe('ExpoSqliteDatabase', () => {
    it('opens a database', () => {
        const mockSQLite = createMockExpoSQLite();
        const db = ExpoSqliteDatabase.open(mockSQLite, 'test.db');
        expect(db).toBeInstanceOf(ExpoSqliteDatabase);
    });

    it('implements get()', () => {
        const mockSQLite = createMockExpoSQLite();
        const db = ExpoSqliteDatabase.open(mockSQLite, 'test.db');
        const result = db.get('SELECT * FROM items WHERE id = ?', [1]);
        // Shared mock returns null for getFirstSync
        expect(result).toBeNull();
    });

    it('implements list()', () => {
        const mockSQLite = createMockExpoSQLite();
        const db = ExpoSqliteDatabase.open(mockSQLite, 'test.db');
        const result = db.list('SELECT * FROM items');
        // Shared mock returns [] for getAllSync
        expect(result).toEqual([]);
    });

    it('implements run() with correct return shape', () => {
        const mockSQLite = createMockExpoSQLite();
        const db = ExpoSqliteDatabase.open(mockSQLite, 'test.db');
        const result = db.run('INSERT INTO items (name) VALUES (?)', ['test']);
        expect(result).toHaveProperty('changes');
        expect(result).toHaveProperty('lastInsertRowid');
        expect(result.changes).toBe(1);
    });

    it('implements close()', () => {
        const mockSQLite = createMockExpoSQLite();
        const db = ExpoSqliteDatabase.open(mockSQLite, 'test.db');
        // Should not throw
        db.close();
    });

    it('initializes schema from service definitions', () => {
        const mockSQLite = createMockExpoSQLite();
        const db = ExpoSqliteDatabase.open(mockSQLite, 'test.db');

        const services = [
            {
                name: 'items',
                databases: {
                    main: {
                        statements: [
                            'CREATE TABLE IF NOT EXISTS items (id TEXT PRIMARY KEY, name TEXT NOT NULL)',
                        ],
                    },
                },
            },
            {
                name: 'users',
                databases: {
                    main: {
                        statements: [
                            'CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT NOT NULL)',
                        ],
                    },
                },
            },
        ];

        db.initializeSchema('main', services);

        // Verify tables were created via our mock tracking
        expect(mockSQLite._mockDb._tables).toHaveProperty('items');
        expect(mockSQLite._mockDb._tables).toHaveProperty('users');
    });

    it('skips services without database config for the given name', () => {
        const mockSQLite = createMockExpoSQLite();
        const db = ExpoSqliteDatabase.open(mockSQLite, 'test.db');

        const services = [
            {
                name: 'no-db-service',
                endpoints: [],
            },
            {
                name: 'other-db-service',
                databases: {
                    other: {
                        statements: ['CREATE TABLE IF NOT EXISTS other (id TEXT PRIMARY KEY)'],
                    },
                },
            },
        ];

        // Should not throw
        db.initializeSchema('main', services);
    });
});
