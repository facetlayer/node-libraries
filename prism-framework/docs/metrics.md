# Metrics

Prism Framework supports Prometheus metrics via dependency injection. Your app owns `prom-client` and passes it to the framework, which uses it to track HTTP request counts and durations, plus Node.js runtime metrics.

## Architecture

```
Your Prism App (:port/api/metrics)
        |
        v
   vmagent (scrapes every 15s)
        |
        v
   VictoriaMetrics (stores 30 days)
        |
        v
   Grafana (dashboards at grafana.apf1.dev)
```

## Enabling Metrics

Install `prom-client` in your app, then pass it to `startServer`:

```ts
import { startServer } from '@facetlayer/prism-framework';
import PromClient from 'prom-client';

await startServer({
  app,
  metricsConfig: {
    appName: 'myapp',
    client: PromClient,
  },
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

Use `prom-client` directly to create app-specific metrics:

```ts
import PromClient from 'prom-client';

// Count business events
const signups = new PromClient.Counter({
  name: 'user_signups_total',
  help: 'Total user signups',
  labelNames: ['plan'],
});
signups.inc({ plan: 'free' });

// Track current state
const activeJobs = new PromClient.Gauge({
  name: 'active_jobs',
  help: 'Number of jobs currently running',
});
activeJobs.inc();
activeJobs.dec();

// Measure durations/sizes
const queryDuration = new PromClient.Histogram({
  name: 'db_query_duration_seconds',
  help: 'Database query duration',
  labelNames: ['query'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1],
});
queryDuration.observe({ query: 'get_user' }, 0.042);
```

The `app` label is automatically applied to all custom metrics (set by the framework via `register.setDefaultLabels`).

Since your app owns `prom-client`, custom metrics share the same registry as the framework's built-in metrics — no initialization timing issues.

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
