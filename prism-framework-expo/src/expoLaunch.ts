import type { PrismApp } from '@facetlayer/prism-framework/core';
import { createExpoFetch, type ApiRequestOptions } from './expoFetch.js';
import { ExpoSqliteDatabase } from './ExpoSqliteDatabase.js';

export interface ExpoLaunchDatabaseConfig {
    /**
     * The expo-sqlite module. Pass the result of `import * as SQLite from 'expo-sqlite'`.
     */
    expoSQLite: { openDatabaseSync: (name: string) => any };

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
     * If omitted, no databases are initialized.
     */
    databases?: Record<string, ExpoLaunchDatabaseConfig>;
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
 * Usage:
 *   import * as SQLite from 'expo-sqlite';
 *   import { App } from '@facetlayer/prism-framework/core';
 *   import { expoLaunch } from '@facetlayer/prism-framework-expo';
 *   import { setFetchImplementation } from '@facetlayer/prism-framework-ui';
 *
 *   const app = new App({ services: [myService] });
 *   const { fetch } = expoLaunch({
 *     app,
 *     databases: { main: { expoSQLite: SQLite } },
 *   });
 *   setFetchImplementation(fetch);
 */
export async function expoLaunch(options: ExpoLaunchOptions): Promise<ExpoLaunchResult> {
    const { app } = options;

    // Initialize databases
    const databases: Record<string, ExpoSqliteDatabase> = {};

    if (options.databases) {
        for (const [dbName, dbConfig] of Object.entries(options.databases)) {
            const filename = dbConfig.filename || `${dbName}.db`;
            const db = ExpoSqliteDatabase.open(dbConfig.expoSQLite, filename);
            db.initializeSchema(dbName, app.getAllServices());
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

    // Create in-process fetch
    const fetch = createExpoFetch(app);

    // Start background jobs
    for (const service of app.getAllServices()) {
        if (service.startJobs) {
            await service.startJobs();
        }
    }

    return { fetch, databases };
}
