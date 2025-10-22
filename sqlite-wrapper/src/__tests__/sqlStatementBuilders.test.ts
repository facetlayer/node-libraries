import { describe, it, expect } from 'vitest';
import { prepareInsertStatement, prepareUpdateStatement } from '../statementBuilders';

describe('SQL Statement Builders', () => {
    describe('prepareInsertStatement', () => {
        it('should create correct insert statement with single field', () => {
            const result = prepareInsertStatement('users', { name: 'John' });
            expect(result.sql).toBe('INSERT INTO users (name) VALUES (?)');
            expect(result.values).toEqual(['John']);
        });

        it('should create correct insert statement with multiple fields', () => {
            const result = prepareInsertStatement('users', {
                name: 'John',
                age: 30,
                email: 'john@example.com'
            });
            expect(result.sql).toBe('INSERT INTO users (name, age, email) VALUES (?, ?, ?)');
            expect(result.values).toEqual(['John', 30, 'john@example.com']);
        });
    });

    describe('prepareUpdateStatement', () => {
        it('should create correct update statement with single where condition', () => {
            const result = prepareUpdateStatement(
                'users',
                { id: 1 },
                { name: 'John' }
            );
            expect(result.sql).toBe('UPDATE users SET name = ? WHERE id = ?');
            expect(result.values).toEqual(['John', 1]);
        });

        it('should create correct update statement with multiple where conditions', () => {
            const result = prepareUpdateStatement(
                'users',
                { id: 1, status: 'pending' },
                { name: 'John', age: 30 }
            );
            expect(result.sql).toBe('UPDATE users SET name = ?, age = ? WHERE id = ? AND status = ?');
            expect(result.values).toEqual(['John', 30, 1, 'pending']);
        });

        it('should handle empty where object by creating update without where clause', () => {
            const result = prepareUpdateStatement(
                'users',
                {},
                { name: 'John', age: 30 }
            );
            expect(result.sql).toBe('UPDATE users SET name = ?, age = ?');
            expect(result.values).toEqual(['John', 30]);
        });
    });
});
