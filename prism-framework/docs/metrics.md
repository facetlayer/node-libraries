# Metrics

Prism Framework includes built-in Prometheus metrics via `prom-client`. When configured, your app automatically tracks HTTP request counts and durations, plus Node.js runtime metrics.

## Architecture

```
Your Prism App (:port/api/metrics)
        │
        ▼
   vmagent (scrapes every 15s)
        │
        ▼
   VictoriaMetrics (stores 30 days)
        │
        ▼
   Grafana (dashboards at grafana.apf1.dev)
```

## Enabling Metrics

Add `metricsConfig` to your `startServer` call:

```ts
import { startServer } from '@facetlayer/prism-framework';

await startServer({
  app,
  metricsConfig: { appName: 'myapp' },
  // ...other config
});
```

The `appName` is added as a default `app` label on all metrics, so you can filter by app in Grafana.

## Built-in Metrics

These are recorded automatically for every endpoint:

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `http_requests_total` | Counter | `method`, `endpoint` | Total HTTP requests |
| `http_request_duration_seconds` | Histogram | `method`, `endpoint`, `status_code` | Request duration |

Plus all default Node.js metrics from `prom-client` (memory, CPU, event loop, GC, etc.).

## Custom Metrics

Use the helper functions to create app-specific metrics:

```ts
import { createCounter, createGauge, createHistogram } from '@facetlayer/prism-framework';

// Count business events
const signups = createCounter({
  name: 'user_signups_total',
  help: 'Total user signups',
  labelNames: ['plan'],
});
signups.inc({ plan: 'free' });

// Track current state
const activeJobs = createGauge({
  name: 'active_jobs',
  help: 'Number of jobs currently running',
});
activeJobs.inc();
activeJobs.dec();

// Measure durations/sizes
const queryDuration = createHistogram({
  name: 'db_query_duration_seconds',
  help: 'Database query duration',
  labelNames: ['query'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1],
});
queryDuration.observe({ query: 'get_user' }, 0.042);
```

The `app` label is automatically applied to all custom metrics.

For advanced use cases, `PromClient` (the `prom-client` library) is also exported directly.

## Metrics Endpoint

The `/api/metrics` endpoint is automatically available and restricted to localhost. vmagent scrapes this endpoint to collect metrics.

## Infrastructure Setup

To add a new app to the metrics pipeline, add a scrape target in `/opt/scrape_config.yml` on the do2 server:

```yaml
- job_name: 'myapp'
  static_configs:
    - targets: ['localhost:PORT']
  metrics_path: '/api/metrics'
```

Then restart vmagent:

```bash
ssh-do2 "systemctl restart vmagent"
```

Verify the target appears at `http://localhost:8429/targets`.

## Grafana Dashboards

Grafana is available at `grafana.apf1.dev`. Useful queries:

```promql
# Request rate by endpoint
rate(http_requests_total{app="myapp"}[5m])

# 95th percentile latency
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket{app="myapp"}[5m]))

# Error rate
rate(http_requests_total{app="myapp", status_code=~"5.."}[5m])
```
