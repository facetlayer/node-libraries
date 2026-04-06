/**
 * @facetlayer/prism-framework-expo
 *
 * Expo/React Native integration for Prism Framework applications.
 *
 * This library allows running a Prism Framework app on mobile devices
 * using Expo. Services and endpoints run in-process — no HTTP server needed.
 */

export { expoLaunch } from './expoLaunch.js';
export type { ExpoLaunchOptions, ExpoLaunchResult, ExpoLaunchDatabaseConfig } from './expoLaunch.js';

export { createExpoFetch } from './expoFetch.js';
export type { ApiRequestOptions, ExpoFetchOptions } from './expoFetch.js';

export { ExpoSqliteDatabase } from './ExpoSqliteDatabase.js';
export type { ExpoSQLiteSyncDatabase } from './ExpoSqliteDatabase.js';

export { ExpoEventEmitter } from './ExpoEventEmitter.js';

export { usePrismApp } from './usePrismApp.js';
export type { UsePrismAppResult } from './usePrismApp.js';
