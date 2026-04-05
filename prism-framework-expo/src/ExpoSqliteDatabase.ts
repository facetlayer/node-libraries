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
     *
     * This is the simple approach — all statements run every time. Works well
     * when statements are idempotent (e.g. CREATE TABLE IF NOT EXISTS).
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

    /**
     * Migration-aware schema initialization.
     *
     * Tracks which statements have been applied in a `_prism_migrations` table.
     * Only runs new statements that haven't been executed before. This is safer
     * for app updates where the schema may have changed.
     *
     * Each statement is identified by a hash of its content. If the set of
     * statements changes between app versions, only the new ones run.
     *
     * Returns the number of new statements that were applied.
     */
    migrateSchema(databaseName: string, services: ServiceDefinition[]): number {
        // Ensure migration tracking table exists
        this.db.runSync(
            `CREATE TABLE IF NOT EXISTS _prism_migrations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                database_name TEXT NOT NULL,
                service_name TEXT NOT NULL,
                statement_hash TEXT NOT NULL,
                applied_at TEXT NOT NULL DEFAULT (datetime('now')),
                UNIQUE(database_name, statement_hash)
            )`
        );

        let applied = 0;

        for (const service of services) {
            const dbConfig = service.databases?.[databaseName];
            if (!dbConfig?.statements) continue;

            for (const statement of dbConfig.statements) {
                const hash = this.hashStatement(statement);

                // Check if already applied
                const existing = this.db.getFirstSync(
                    'SELECT id FROM _prism_migrations WHERE database_name = ? AND statement_hash = ?',
                    [databaseName, hash],
                );

                if (!existing) {
                    this.db.runSync(statement);
                    this.db.runSync(
                        'INSERT INTO _prism_migrations (database_name, service_name, statement_hash) VALUES (?, ?, ?)',
                        [databaseName, service.name, hash],
                    );
                    applied++;
                }
            }
        }

        return applied;
    }

    /**
     * Simple string hash for migration tracking.
     * Normalizes whitespace so formatting changes don't trigger re-runs.
     */
    private hashStatement(sql: string): string {
        const normalized = sql.trim().replace(/\s+/g, ' ');
        let hash = 0;
        for (let i = 0; i < normalized.length; i++) {
            const char = normalized.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash |= 0; // Convert to 32bit integer
        }
        return hash.toString(36);
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
