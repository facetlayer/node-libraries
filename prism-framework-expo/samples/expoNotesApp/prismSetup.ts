/**
 * Prism Framework setup for the Expo app.
 *
 * This file creates the PrismApp, database, and services.
 * It's imported by _layout.tsx which uses the usePrismApp hook.
 *
 * In a real Expo app, replace the mock SQLite import with:
 *   import * as SQLite from 'expo-sqlite';
 */

import { App, Authorization } from '@facetlayer/prism-framework/core';
import { ExpoSqliteDatabase, type ExpoLaunchOptions } from '@facetlayer/prism-framework-expo';
import { createNotesService } from './services/notesService.js';

// In a real app: import * as SQLite from 'expo-sqlite';
// For this sample, we provide a type-only placeholder:
declare const SQLite: { openDatabaseSync: (name: string) => any };

/**
 * Create the database and app. This is called once on startup.
 */
export function createLaunchOptions(): ExpoLaunchOptions {
    const db = ExpoSqliteDatabase.open(SQLite, 'notes.db');
    const notesService = createNotesService(db);

    const app = new App({
        name: 'NotesApp',
        description: 'A simple notes app built with Prism Framework on Expo',
        services: [notesService],
    });

    return {
        app,
        databases: { main: db },
        migrationMode: 'migrate',
        getAuth: () => {
            // In a real app, read auth tokens from secure storage:
            //   const token = await SecureStore.getItemAsync('authToken');
            //   const auth = new Authorization();
            //   auth.setUserPermissions({ userId: 'current-user', permissions: ['read', 'write'] });
            //   return auth;
            return new Authorization();
        },
    };
}
