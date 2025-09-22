import { describe, it, expect, beforeEach } from 'vitest';
import { SqliteDatabase } from '../SqliteDatabase';
import { DatabaseLoader } from '../DatabaseLoader';
import { runUpsert } from '../sqlOperations';
import { existsSync, unlinkSync } from 'fs';
import { Stream } from '@facetlayer/streams';

const TEST_DB_PATH = './test/upsert-test.db';

function cleanupTestDatabase() {
    if (existsSync(TEST_DB_PATH)) {
        unlinkSync(TEST_DB_PATH);
    }
}

describe('SQL Operations', () => {
    let db: SqliteDatabase;

    beforeEach(() => {
        cleanupTestDatabase();
        const loader = new DatabaseLoader({
            filename: TEST_DB_PATH,
            logs: Stream.newNullStream(),
            schema: {
                name: 'sqlOperations.test.ts',
                statements: [
                    `CREATE TABLE users (
                        id INTEGER PRIMARY KEY,
                        name TEXT NOT NULL,
                        email TEXT,
                        age INTEGER
                    )`
                ]
            }
        });
        db = loader.load();
    });

    describe('runUpsert', () => {
        it('should insert when no matching rows exist', () => {
            runUpsert(db, 'users', { email: 'john@example.com' }, { name: 'John', age: 30 });

            const users = db.list('SELECT * FROM users');
            expect(users).toHaveLength(1);
            expect(users[0].name).toBe('John');
            expect(users[0].email).toBe('john@example.com');
            expect(users[0].age).toBe(30);
        });

        it('should update when matching rows exist', () => {
            db.insert('users', { name: 'John', email: 'john@example.com', age: 25 });

            runUpsert(db, 'users', { email: 'john@example.com' }, { name: 'John Doe', age: 30 });

            const users = db.list('SELECT * FROM users');
            expect(users).toHaveLength(1);
            expect(users[0].name).toBe('John Doe');
            expect(users[0].email).toBe('john@example.com');
            expect(users[0].age).toBe(30);
        });

        it('should handle empty where object by updating all rows', () => {
            db.insert('users', { name: 'John', email: 'john@example.com', age: 25 });
            db.insert('users', { name: 'Jane', email: 'jane@example.com', age: 28 });

            runUpsert(db, 'users', {}, { age: 35 });

            const users = db.list('SELECT * FROM users ORDER BY name');
            expect(users).toHaveLength(2);
            expect(users[0].age).toBe(35);
            expect(users[1].age).toBe(35);
        });
    });
});