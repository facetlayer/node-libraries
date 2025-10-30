import PromClient from 'prom-client';

PromClient.collectDefaultMetrics({
  // prefix: ...
  // labels: ...
});

// HTTP request counter metric
export const httpRequests = new PromClient.Counter({
  name: 'http_request_counter',
  help: 'HTTP requests',
  labelNames: ['method', 'endpoint'],
});

export const httpResponses = new PromClient.Counter({
  name: 'http_response_counter',
  help: 'HTTP responses',
  labelNames: ['method', 'endpoint', 'status_code', 'duration'],
});

// Function to record an HTTP request
export function metricHttpRequest(method: string, endpoint: string): void {
  httpRequests.inc({ method, endpoint });
}

export function metricHttpResponse(
  method: string,
  endpoint: string,
  statusCode: number,
  duration: number
): void {
  httpResponses.inc({ method, endpoint, status_code: statusCode.toString(), duration });
}

// Function to get metrics in Prometheus format
export function getMetrics(): Promise<string> {
  return PromClient.register.metrics();
}
