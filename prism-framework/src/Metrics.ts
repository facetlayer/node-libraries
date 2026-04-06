/**
 * Metrics support via dependency injection.
 *
 * The app owns prom-client (or any compatible library) and passes it in
 * via `metricsConfig.client`. The framework uses it to record built-in
 * HTTP metrics and serve the /api/metrics endpoint.
 */

export interface MetricsClient {
  Counter: new (config: { name: string; help: string; labelNames: string[] }) => {
    inc(labels?: Record<string, string | number>): void;
  };
  Histogram: new (config: {
    name: string;
    help: string;
    labelNames: string[];
    buckets?: number[];
  }) => {
    observe(labels: Record<string, string | number>, value: number): void;
  };
  collectDefaultMetrics: () => void;
  register: {
    setDefaultLabels(labels: Record<string, string>): void;
    metrics(): Promise<string>;
  };
}

export interface MetricsConfig {
  appName: string;
  client: MetricsClient;
}

let _client: MetricsClient | undefined;
let _initialized = false;
let httpRequests: { inc(labels?: Record<string, string | number>): void };
let httpRequestDuration: {
  observe(labels: Record<string, string | number>, value: number): void;
};

export function configureMetrics(config: MetricsConfig): void {
  _client = config.client;

  _client.register.setDefaultLabels({ app: config.appName });
  _client.collectDefaultMetrics();

  httpRequests = new _client.Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'endpoint'],
  });

  httpRequestDuration = new _client.Histogram({
    name: 'http_request_duration_seconds',
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'endpoint', 'status_code'],
    buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  });

  _initialized = true;
}

export function recordHttpRequest(method: string, endpoint: string): void {
  if (!_initialized) return;
  httpRequests.inc({ method, endpoint });
}

export function recordHttpResponse(
  method: string,
  endpoint: string,
  statusCode: number,
  durationMs: number,
): void {
  if (!_initialized) return;
  httpRequestDuration.observe(
    { method, endpoint, status_code: statusCode.toString() },
    durationMs / 1000,
  );
}

export function getMetrics(): Promise<string> {
  if (!_client) return Promise.resolve('');
  return _client.register.metrics();
}
