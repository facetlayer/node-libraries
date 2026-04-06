/**
 * Mock expo-sqlite module for testing.
 *
 * Simulates the synchronous API surface (runSync, getFirstSync, getAllSync, closeSync)
 * with a simple in-memory store. Useful for unit tests that don't need real SQLite.
 */
export function createMockExpoSQLite() {
    const tables: Record<string, any[]> = {};
    let lastInsertRowid = 0;

    const mockDb = {
        runSync(sql: string, _params?: any) {
            const createMatch = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/i);
            if (createMatch) {
                const tableName = createMatch[1];
                if (!tables[tableName]) {
                    tables[tableName] = [];
                }
                return { changes: 0, lastInsertRowid: 0 };
            }

            if (sql.startsWith('INSERT')) {
                lastInsertRowid++;
                return { changes: 1, lastInsertRowid };
            }

            return { changes: 0, lastInsertRowid };
        },

        getFirstSync(_sql: string, _params?: any) {
            return null;
        },

        getAllSync(_sql: string, _params?: any) {
            return [];
        },

        closeSync() {},

        _tables: tables,
    };

    return {
        openDatabaseSync(_name: string) {
            return mockDb;
        },
        _mockDb: mockDb,
    };
}
