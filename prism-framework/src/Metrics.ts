import PromClient from 'prom-client';

export { PromClient };

export interface MetricsConfig {
  appName: string;
}

let _config: MetricsConfig | undefined;
let _hasSetupMetrics = false;
let httpRequests: PromClient.Counter;
let httpRequestDuration: PromClient.Histogram;

export function configureMetrics(config: MetricsConfig): void {
  _config = config;

  // Apply app label as a default label on all metrics
  PromClient.register.setDefaultLabels({ app: config.appName });

  // Re-initialize if metrics were already set up (unlikely but safe)
  if (_hasSetupMetrics) {
    PromClient.register.clear();
    _hasSetupMetrics = false;
    setupMetrics();
  }
}

export function setupMetrics(): void {
  if (_hasSetupMetrics) return;
  _hasSetupMetrics = true;

  PromClient.collectDefaultMetrics();

  httpRequests = new PromClient.Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'endpoint'],
  });

  httpRequestDuration = new PromClient.Histogram({
    name: 'http_request_duration_seconds',
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'endpoint', 'status_code'],
    buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  });
}

export function recordHttpRequest(method: string, endpoint: string): void {
  if (!_hasSetupMetrics) setupMetrics();
  httpRequests.inc({ method, endpoint });
}

export function recordHttpResponse(
  method: string,
  endpoint: string,
  statusCode: number,
  durationMs: number
): void {
  if (!_hasSetupMetrics) setupMetrics();
  httpRequestDuration.observe(
    { method, endpoint, status_code: statusCode.toString() },
    durationMs / 1000
  );
}

export function getMetrics(): Promise<string> {
  if (!_hasSetupMetrics) setupMetrics();
  return PromClient.register.metrics();
}

// Helpers that create metrics with the app's default labels already applied

export function createCounter(config: {
  name: string;
  help: string;
  labelNames?: string[];
}): PromClient.Counter {
  if (!_hasSetupMetrics) setupMetrics();
  return new PromClient.Counter({
    name: config.name,
    help: config.help,
    labelNames: config.labelNames ?? [],
  });
}

export function createHistogram(config: {
  name: string;
  help: string;
  labelNames?: string[];
  buckets?: number[];
}): PromClient.Histogram {
  if (!_hasSetupMetrics) setupMetrics();
  return new PromClient.Histogram({
    name: config.name,
    help: config.help,
    labelNames: config.labelNames ?? [],
    buckets: config.buckets,
  });
}

export function createGauge(config: {
  name: string;
  help: string;
  labelNames?: string[];
}): PromClient.Gauge {
  if (!_hasSetupMetrics) setupMetrics();
  return new PromClient.Gauge({
    name: config.name,
    help: config.help,
    labelNames: config.labelNames ?? [],
  });
}
