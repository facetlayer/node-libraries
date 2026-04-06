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
