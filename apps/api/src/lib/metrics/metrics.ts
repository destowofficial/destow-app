import client from 'prom-client';

// Prometheus metrics registry. Default process/runtime metrics (CPU, heap, event
// loop lag, ...) plus the HTTP request counters below. Scraped at GET /metrics.
export const registry = new client.Registry();
client.collectDefaultMetrics({ register: registry, prefix: 'destow_' });

export const httpRequestsTotal = new client.Counter({
  name: 'destow_http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status'] as const,
  registers: [registry],
});

export const httpRequestDuration = new client.Histogram({
  name: 'destow_http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status'] as const,
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [registry],
});

export async function metricsText(): Promise<string> {
  return registry.metrics();
}

export function metricsContentType(): string {
  return registry.contentType;
}
