/**
 * Sample bootstrap for an Expo app using Prism Framework.
 *
 * This file shows the recommended pattern:
 * 1. Create database instance
 * 2. Define services (endpoints close over the database)
 * 3. Create the PrismApp
 * 4. Call expoLaunch with the pre-created database
 * 5. Wire up the UI fetch layer
 *
 * In a real app, this would run in your _layout.tsx or App.tsx.
 */

import { App } from '@facetlayer/prism-framework/core';
import { expoLaunch, ExpoSqliteDatabase } from '@facetlayer/prism-framework-expo';
// import { setFetchImplementation } from '@facetlayer/prism-framework-ui';
// import * as SQLite from 'expo-sqlite';

import { createNotesService } from './services.js';

export async function bootstrap() {
    // In a real Expo app, you'd use:
    //   import * as SQLite from 'expo-sqlite';
    //   const db = ExpoSqliteDatabase.open(SQLite, 'notes.db');
    //
    // For this sample we show the pattern without actually importing expo-sqlite.
    const db = ExpoSqliteDatabase.open(
        { openDatabaseSync: (name: string) => { throw new Error(`Requires expo-sqlite to open: ${name}`); } },
        'notes.db',
    );

    // Create service with database access via closure
    const notesService = createNotesService(db);

    // Create the app
    const app = new App({
        name: 'NotesApp',
        services: [notesService],
    });

    // Launch — pass the pre-created db so schema initialization runs on the same instance
    const { fetch } = await expoLaunch({
        app,
        databases: { main: db },
    });

    // Wire up UI fetch layer (uncomment in real app)
    // setFetchImplementation(fetch);

    return { fetch, db };
}
