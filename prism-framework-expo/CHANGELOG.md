# Unreleased
 - `expoLaunch()` now accepts pre-created `ExpoSqliteDatabase` instances (fixes database injection for endpoint handlers)
 - Error handling parity with webFetch: `HttpError` from callEndpoint is normalized to `"Fetch error, status: N"` for cross-platform UI consistency
 - Auth context support: `createExpoFetch` and `expoLaunch` accept a `getAuth` option to provide `Authorization` per request via `RequestContext`
 - `ExpoEventEmitter` for in-process event broadcasting (mobile equivalent of SSE `ConnectionManager`)
 - `usePrismApp()` React hook for managing async `expoLaunch` initialization in components
 - Database migration tracking via `migrateSchema()` and `migrationMode: 'migrate'` launch option
 - `shutdown()` on `ExpoLaunchResult` for clean database closing
 - Dev warning when `host` option is passed to expoFetch (ignored on mobile)
 - Updated dependency to require `@facetlayer/prism-framework ^0.6.0` (needed for `/core` subpath export)
 - Added 48 tests: unit tests, integration tests with real SQLite, and React hook tests
 - Added sample Expo app with full project structure

# 0.1.0
 - Initial release
 - In-process endpoint calling via `createExpoFetch` (replaces HTTP-based webFetch)
 - `ExpoSqliteDatabase` adapter wrapping expo-sqlite for the PrismDatabase interface
 - `expoLaunch()` for bootstrapping a Prism app in an Expo environment
