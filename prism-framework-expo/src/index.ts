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
export type { ApiRequestOptions } from './expoFetch.js';

export { ExpoSqliteDatabase } from './ExpoSqliteDatabase.js';
