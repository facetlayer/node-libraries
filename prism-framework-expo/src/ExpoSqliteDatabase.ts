import type { PrismDatabase } from '@facetlayer/prism-framework/core';
import type { ServiceDefinition } from '@facetlayer/prism-framework/core';

/**
 * SQLite database adapter for Expo/React Native using expo-sqlite.
 *
 * Wraps the expo-sqlite synchronous API (SDK 51+) to match the PrismDatabase
 * interface, allowing the same service database code to work on both
 * Node.js (via better-sqlite3) and mobile (via expo-sqlite).
 */
export class ExpoSqliteDatabase implements PrismDatabase {
    private db: any;

    constructor(db: any) {
        this.db = db;
    }

    /**
     * Open a database using expo-sqlite's openDatabaseSync.
     *
     * Usage:
     *   import * as SQLite from 'expo-sqlite';
     *   const db = ExpoSqliteDatabase.open(SQLite, 'myapp.db');
     */
    static open(expoSQLite: { openDatabaseSync: (name: string) => any }, name: string): ExpoSqliteDatabase {
        const db = expoSQLite.openDatabaseSync(name);
        return new ExpoSqliteDatabase(db);
    }

    /**
     * Initialize the database schema from service definitions.
     * Runs each service's database statements (typically CREATE TABLE IF NOT EXISTS).
     */
    initializeSchema(databaseName: string, services: ServiceDefinition[]): void {
        for (const service of services) {
            const dbConfig = service.databases?.[databaseName];
            if (dbConfig?.statements) {
                for (const statement of dbConfig.statements) {
                    this.db.runSync(statement);
                }
            }
        }
    }

    get(sql: string, params?: any): any {
        return this.db.getFirstSync(sql, params);
    }

    list(sql: string, params?: any): any[] {
        return this.db.getAllSync(sql, params);
    }

    run(sql: string, params?: any): { changes: number; lastInsertRowid: number | bigint } {
        const result = this.db.runSync(sql, params);
        return {
            changes: result.changes,
            lastInsertRowid: result.lastInsertRowid,
        };
    }

    close(): void {
        this.db.closeSync();
    }
}
