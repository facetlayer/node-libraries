import PromClient from 'prom-client';

let _hasSetupMetrics = false;
let httpRequests: PromClient.Counter;
let httpResponses: PromClient.Counter;

export function setupMetrics(): void {
  _hasSetupMetrics = true;

  PromClient.collectDefaultMetrics({
    // prefix: ...
    // labels: ...
  });

  httpRequests = new PromClient.Counter({
    name: 'http_request_counter',
    help: 'HTTP requests',
    labelNames: ['method', 'endpoint'],
  });
  httpResponses = new PromClient.Counter({
    name: 'http_response_counter',
    help: 'HTTP responses',
    labelNames: ['method', 'endpoint', 'status_code', 'duration'],
  });
}

// Function to record an HTTP request
export function recordHttpRequest(method: string, endpoint: string): void {
  if (!_hasSetupMetrics) {
    setupMetrics();
  }
  httpRequests.inc({ method, endpoint });
}

export function recordHttpResponse(
  method: string,
  endpoint: string,
  statusCode: number,
  duration: number
): void {
  if (!_hasSetupMetrics) {
    setupMetrics();
  }
  httpResponses.inc({ method, endpoint, status_code: statusCode.toString(), duration });
}

// Function to get metrics in Prometheus format
export function getMetrics(): Promise<string> {
  if (!_hasSetupMetrics) {
    setupMetrics();
  }
  return PromClient.register.metrics();
}
