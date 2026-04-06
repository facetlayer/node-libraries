import type { PrismApp, Authorization } from '@facetlayer/prism-framework/core';
import { createExpoFetch, type ApiRequestOptions } from './expoFetch.js';
import { ExpoSqliteDatabase, type ExpoSQLiteSyncDatabase } from './ExpoSqliteDatabase.js';

export interface ExpoLaunchDatabaseConfig {
    /**
     * The expo-sqlite module. Pass the result of `import * as SQLite from 'expo-sqlite'`.
     */
    expoSQLite: { openDatabaseSync: (name: string) => ExpoSQLiteSyncDatabase };

    /**
     * Filename for the SQLite database (default: "{databaseName}.db")
     */
    filename?: string;
}

export interface ExpoLaunchOptions {
    /**
     * The PrismApp instance with registered services.
     */
    app: PrismApp;

    /**
     * Database configurations, keyed by the database name used in service definitions.
     *
     * Each value can be either:
     * - An ExpoLaunchDatabaseConfig to create a new database
     * - An existing ExpoSqliteDatabase instance (schema initialization will still run)
     *
     * When using databases in endpoint handlers, create the ExpoSqliteDatabase first
     * and pass the instance here so endpoints can close over the same reference:
     *
     *   const db = ExpoSqliteDatabase.open(SQLite, 'main.db');
     *   // define endpoints that use `db`...
     *   const { fetch } = await expoLaunch({ app, databases: { main: db } });
     */
    databases?: Record<string, ExpoLaunchDatabaseConfig | ExpoSqliteDatabase>;

    /**
     * Optional function that returns an Authorization object for each request.
     * On mobile, auth typically comes from stored tokens rather than cookies.
     * This is the equivalent of Express auth middleware for in-process calls.
     */
    getAuth?: () => Authorization;

    /**
     * How to handle database schema initialization.
     *
     * - 'simple' (default): Runs all statements every time. Works well when
     *   statements are idempotent (CREATE TABLE IF NOT EXISTS).
     * - 'migrate': Tracks applied statements in a _prism_migrations table.
     *   Only runs new statements. Safer for app updates.
     */
    migrationMode?: 'simple' | 'migrate';
}

export interface ExpoLaunchResult {
    /**
     * In-process fetch function matching the webFetch signature.
     * Pass to setFetchImplementation() from prism-framework-ui.
     */
    fetch: (endpoint: string, options?: ApiRequestOptions) => Promise<any>;

    /**
     * Initialized database instances, keyed by database name.
     */
    databases: Record<string, ExpoSqliteDatabase>;

    /**
     * Shut down the app cleanly: closes all databases and runs any
     * registered cleanup callbacks. Call this when the app is unmounting
     * or going to background.
     */
    shutdown: () => void;
}

/**
 * Launch a Prism Framework app in an Expo/React Native environment.
 *
 * This function:
 * 1. Initializes databases using expo-sqlite for each configured database
 * 2. Runs schema statements from service definitions
 * 3. Creates an in-process fetch function bound to the app
 * 4. Runs startJobs for each service (if defined)
 *
 * Usage (with pre-created database for endpoint access):
 *   import * as SQLite from 'expo-sqlite';
 *   import { App } from '@facetlayer/prism-framework/core';
 *   import { expoLaunch, ExpoSqliteDatabase } from '@facetlayer/prism-framework-expo';
 *   import { setFetchImplementation } from '@facetlayer/prism-framework-ui';
 *
 *   const db = ExpoSqliteDatabase.open(SQLite, 'main.db');
 *   // ... define services that close over `db` ...
 *   const app = new App({ services: [myService] });
 *   const { fetch } = await expoLaunch({ app, databases: { main: db } });
 *   setFetchImplementation(fetch);
 */
export async function expoLaunch(options: ExpoLaunchOptions): Promise<ExpoLaunchResult> {
    const { app } = options;

    // Initialize databases
    const databases: Record<string, ExpoSqliteDatabase> = {};

    if (options.databases) {
        for (const [dbName, dbEntry] of Object.entries(options.databases)) {
            let db: ExpoSqliteDatabase;

            if (dbEntry instanceof ExpoSqliteDatabase) {
                // Pre-created database instance — use as-is
                db = dbEntry;
            } else {
                // Config object — create a new database
                const filename = dbEntry.filename || `${dbName}.db`;
                db = ExpoSqliteDatabase.open(dbEntry.expoSQLite, filename);
            }

            if (options.migrationMode === 'migrate') {
                db.migrateSchema(dbName, app.getAllServices());
            } else {
                db.initializeSchema(dbName, app.getAllServices());
            }
            databases[dbName] = db;
        }
    }

    // Warn about services with middleware (not applicable on mobile)
    for (const service of app.getAllServices()) {
        if (service.middleware && service.middleware.length > 0) {
            console.warn(
                `[prism-framework-expo] Service "${service.name}" has middleware defined. ` +
                `Middleware is transport-specific and will be ignored on mobile.`
            );
        }
    }

    // Create in-process fetch with auth support
    const fetch = createExpoFetch(app, {
        getAuth: options.getAuth,
    });

    // Start background jobs
    for (const service of app.getAllServices()) {
        if (service.startJobs) {
            await service.startJobs();
        }
    }

    // Build shutdown function
    const shutdown = () => {
        for (const db of Object.values(databases)) {
            try {
                db.close();
            } catch {
                // Database may already be closed
            }
        }
    };

    return { fetch, databases, shutdown };
}
