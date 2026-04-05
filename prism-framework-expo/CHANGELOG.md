# Unreleased
 - `expoLaunch()` now accepts pre-created `ExpoSqliteDatabase` instances (fixes database injection for endpoint handlers)
 - Updated dependency to require `@facetlayer/prism-framework ^0.6.0` (needed for `/core` subpath export)
 - Added unit tests for `createExpoFetch`, `ExpoSqliteDatabase`, and `expoLaunch`
 - Added sample app demonstrating the recommended bootstrap pattern

# 0.1.0
 - Initial release
 - In-process endpoint calling via `createExpoFetch` (replaces HTTP-based webFetch)
 - `ExpoSqliteDatabase` adapter wrapping expo-sqlite for the PrismDatabase interface
 - `expoLaunch()` for bootstrapping a Prism app in an Expo environment
