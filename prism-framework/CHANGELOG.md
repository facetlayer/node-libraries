# Unreleased
 - Documentation pass across the Prism libraries:
   - Clarified that HTTP callers (including `prism call`) must use the `/api/` prefix, while `createEndpoint({ path })` should not; fixed the examples in README, `endpoint-tools`, and `source-directory-organization` accordingly.
   - Fixed the `creating-mobile-apps` cross-platform comparison table (desktop auth uses the `getAuth` option, not Express middleware).
   - Fixed the `MigrationBehavior` values listed in `launch-configuration` and `database-setup` (the real values are `strict` / `safe-upgrades` / `full-destructive-updates` / `ignore`).
   - Updated `authorization` to handle the `getCurrentRequestContext() === undefined` case and to describe what `requires: ['authenticated-user']` actually does.
   - Corrected the `generate-api-clients-config` doc to reference `/api/openapi.json` and the `port-assignment`-based port resolution instead of a legacy `.env` lookup.
   - Expanded `overview` and the README's doc list to include previously unreferenced docs (`creating-mobile-apps`, `cors-setup`, `error-handling`, `generate-api-clients-config`, `metrics`, `source-directory-organization`).

# 0.7.0
 - Added `configureMetrics({ appName })` to label all metrics with an `app` identifier
 - Added `metricsConfig` option to `ServerSetupConfig` for easy setup
 - Replaced response counter with `http_request_duration_seconds` histogram
 - Renamed request counter to `http_requests_total` (Prometheus convention)
 - Added `createCounter()`, `createHistogram()`, `createGauge()` helpers for custom metrics
 - Exported `PromClient` for advanced metric use cases
 - Added `docs/metrics.md` documentation

# 0.6.0
 - Initial changelog entry.
