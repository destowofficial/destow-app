import client from 'prom-client';
import { sql } from 'drizzle-orm';
import { db, pool } from '../../db/connection.js';
import {
  bookings,
  drivers,
  refreshTokens,
  serviceProviders,
  sessions,
  vehicles,
} from '../../db/schema.js';

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

export const dbQueriesTotal = new client.Counter({
  name: 'destow_db_queries_total',
  help: 'Total database operations observed by the API',
  labelNames: ['operation', 'table', 'result'] as const,
  registers: [registry],
});

export const dbQueryDuration = new client.Histogram({
  name: 'destow_db_query_duration_seconds',
  help: 'Database operation duration in seconds',
  labelNames: ['operation', 'table', 'result'] as const,
  buckets: [0.0025, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5],
  registers: [registry],
});

export const redisCommandsTotal = new client.Counter({
  name: 'destow_redis_commands_total',
  help: 'Total Redis commands observed by the API',
  labelNames: ['command', 'result'] as const,
  registers: [registry],
});

export const redisCommandDuration = new client.Histogram({
  name: 'destow_redis_command_duration_seconds',
  help: 'Redis command duration in seconds',
  labelNames: ['command', 'result'] as const,
  buckets: [0.001, 0.0025, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
  registers: [registry],
});

export const externalRequestsTotal = new client.Counter({
  name: 'destow_external_requests_total',
  help: 'Total external provider calls made by the API',
  labelNames: ['provider', 'operation', 'result'] as const,
  registers: [registry],
});

export const externalRequestDuration = new client.Histogram({
  name: 'destow_external_request_duration_seconds',
  help: 'External provider call duration in seconds',
  labelNames: ['provider', 'operation', 'result'] as const,
  buckets: [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [registry],
});

export const authEventsTotal = new client.Counter({
  name: 'destow_auth_events_total',
  help: 'Total authentication events by result and reason',
  labelNames: ['event', 'result', 'reason'] as const,
  registers: [registry],
});

export const rateLimitEventsTotal = new client.Counter({
  name: 'destow_rate_limit_events_total',
  help: 'Total rate-limit decisions by limiter and result',
  labelNames: ['limiter', 'result'] as const,
  registers: [registry],
});

export const paymentEventsTotal = new client.Counter({
  name: 'destow_payment_events_total',
  help: 'Total payment events by provider, method, and result',
  labelNames: ['provider', 'method', 'result'] as const,
  registers: [registry],
});

export const bookingEventsTotal = new client.Counter({
  name: 'destow_booking_events_total',
  help: 'Total booking lifecycle events by event, status, and trip type',
  labelNames: ['event', 'status', 'trip_type'] as const,
  registers: [registry],
});

export const providerAssignmentEventsTotal = new client.Counter({
  name: 'destow_provider_assignment_events_total',
  help: 'Total provider/driver assignment events by result and reason',
  labelNames: ['result', 'reason'] as const,
  registers: [registry],
});

const postgresPoolConnections = new client.Gauge({
  name: 'destow_postgres_pool_connections',
  help: 'Postgres pool connection count by state',
  labelNames: ['state'] as const,
  registers: [registry],
  collect() {
    this.set({ state: 'total' }, pool.totalCount);
    this.set({ state: 'idle' }, pool.idleCount);
    this.set({ state: 'waiting' }, pool.waitingCount);
  },
});
void postgresPoolConnections;

const originalPoolQuery = pool.query.bind(pool) as (...args: unknown[]) => Promise<unknown>;
(pool as unknown as { query: (...args: unknown[]) => Promise<unknown> }).query = (...args: unknown[]) => {
  const start = process.hrtime.bigint();
  const queryText = typeof args[0] === 'string' ? args[0] : 'statement';
  const operation = queryText.trim().split(/\s+/, 1)[0]?.toLowerCase() || 'statement';
  const table = 'unknown';
  return originalPoolQuery(...args).then(
    (value) => {
      const labels = { operation, table, result: 'success' };
      dbQueriesTotal.inc(labels);
      dbQueryDuration.observe(labels, Number(process.hrtime.bigint() - start) / 1e9);
      return value;
    },
    (err) => {
      const labels = { operation, table, result: 'error' };
      dbQueriesTotal.inc(labels);
      dbQueryDuration.observe(labels, Number(process.hrtime.bigint() - start) / 1e9);
      throw err;
    },
  );
};

const bookingsTotal = new client.Gauge({
  name: 'destow_bookings_total',
  help: 'Current booking count by booking status, payment status, and trip type',
  labelNames: ['status', 'payment_status', 'trip_type'] as const,
  registers: [registry],
});

const bookingFarePaise = new client.Gauge({
  name: 'destow_booking_total_fare_paise',
  help: 'Current total fare value in paise by booking status and payment status',
  labelNames: ['status', 'payment_status'] as const,
  registers: [registry],
});

const bookingCommissionPaise = new client.Gauge({
  name: 'destow_booking_commission_paise',
  help: 'Current platform commission value in paise by booking status and payment status',
  labelNames: ['status', 'payment_status'] as const,
  registers: [registry],
});

const providersTotal = new client.Gauge({
  name: 'destow_providers_total',
  help: 'Current service provider count by status',
  labelNames: ['status'] as const,
  registers: [registry],
});

const vehiclesTotal = new client.Gauge({
  name: 'destow_vehicles_total',
  help: 'Current vehicle count by status and active flag',
  labelNames: ['status', 'active'] as const,
  registers: [registry],
});

const driversTotal = new client.Gauge({
  name: 'destow_drivers_total',
  help: 'Current driver count by status',
  labelNames: ['status'] as const,
  registers: [registry],
});

const sessionsTotal = new client.Gauge({
  name: 'destow_sessions_total',
  help: 'Current session count by state',
  labelNames: ['state'] as const,
  registers: [registry],
});

const refreshTokensTotal = new client.Gauge({
  name: 'destow_refresh_tokens_total',
  help: 'Current refresh token count by state',
  labelNames: ['state'] as const,
  registers: [registry],
});

const domainCollectors = [
  bookingsTotal,
  bookingFarePaise,
  bookingCommissionPaise,
  providersTotal,
  vehiclesTotal,
  driversTotal,
  sessionsTotal,
  refreshTokensTotal,
];

let lastDomainCollect = 0;
let domainCollectInFlight: Promise<void> | null = null;
const DOMAIN_COLLECT_INTERVAL_MS = 10_000;

async function collectDomainGauges(): Promise<void> {
  const now = Date.now();
  if (domainCollectInFlight) return domainCollectInFlight;
  if (now - lastDomainCollect < DOMAIN_COLLECT_INTERVAL_MS) return;

  domainCollectInFlight = (async () => {
    lastDomainCollect = now;
    for (const gauge of domainCollectors) gauge.reset();

    const [
      bookingRows,
      revenueRows,
      providerRows,
      vehicleRows,
      driverRows,
      sessionRows,
      tokenRows,
    ] = await Promise.all([
      db
        .select({
          status: bookings.status,
          paymentStatus: bookings.paymentStatus,
          tripType: bookings.tripType,
          count: sql<number>`count(*)::int`,
        })
        .from(bookings)
        .groupBy(bookings.status, bookings.paymentStatus, bookings.tripType),
      db
        .select({
          status: bookings.status,
          paymentStatus: bookings.paymentStatus,
          farePaise: sql<number>`coalesce(sum(${bookings.totalFarePaise}), 0)::bigint`,
          commissionPaise: sql<number>`coalesce(sum(${bookings.commissionPaise}), 0)::bigint`,
        })
        .from(bookings)
        .groupBy(bookings.status, bookings.paymentStatus),
      db
        .select({ status: serviceProviders.status, count: sql<number>`count(*)::int` })
        .from(serviceProviders)
        .groupBy(serviceProviders.status),
      db
        .select({
          status: vehicles.status,
          active: vehicles.isActive,
          count: sql<number>`count(*)::int`,
        })
        .from(vehicles)
        .groupBy(vehicles.status, vehicles.isActive),
      db
        .select({ status: drivers.status, count: sql<number>`count(*)::int` })
        .from(drivers)
        .groupBy(drivers.status),
      db
        .select({
          state: sql<string>`case when ${sessions.revokedAt} is null and ${sessions.expiresAt} > now() then 'active' else 'inactive' end`,
          count: sql<number>`count(*)::int`,
        })
        .from(sessions)
        .groupBy(sql`case when ${sessions.revokedAt} is null and ${sessions.expiresAt} > now() then 'active' else 'inactive' end`),
      db
        .select({
          state: sql<string>`case when ${refreshTokens.usedAt} is null and ${refreshTokens.expiresAt} > now() then 'active' else 'inactive' end`,
          count: sql<number>`count(*)::int`,
        })
        .from(refreshTokens)
        .groupBy(sql`case when ${refreshTokens.usedAt} is null and ${refreshTokens.expiresAt} > now() then 'active' else 'inactive' end`),
    ]);

    for (const row of bookingRows) {
      bookingsTotal.set(
        { status: row.status, payment_status: row.paymentStatus, trip_type: row.tripType },
        Number(row.count),
      );
    }
    for (const row of revenueRows) {
      const labels = { status: row.status, payment_status: row.paymentStatus };
      bookingFarePaise.set(labels, Number(row.farePaise));
      bookingCommissionPaise.set(labels, Number(row.commissionPaise));
    }
    for (const row of providerRows) providersTotal.set({ status: row.status }, Number(row.count));
    for (const row of vehicleRows) {
      vehiclesTotal.set({ status: row.status, active: String(row.active) }, Number(row.count));
    }
    for (const row of driverRows) driversTotal.set({ status: row.status }, Number(row.count));
    for (const row of sessionRows) sessionsTotal.set({ state: row.state }, Number(row.count));
    for (const row of tokenRows) refreshTokensTotal.set({ state: row.state }, Number(row.count));
  })().finally(() => {
    domainCollectInFlight = null;
  });

  return domainCollectInFlight;
}

(bookingsTotal as unknown as { collect: () => Promise<void> }).collect = async function collect() {
  await collectDomainGauges().catch((err) => {
    console.error('[metrics] failed to collect domain gauges:', (err as Error).message);
  });
};

type MetricLabels = Record<string, string>;

export async function observeAsync<T>(
  histogram: client.Histogram<string>,
  counter: client.Counter<string>,
  labels: MetricLabels,
  fn: () => Promise<T>,
): Promise<T> {
  const start = process.hrtime.bigint();
  let result = 'success';
  try {
    return await fn();
  } catch (err) {
    result = 'error';
    throw err;
  } finally {
    const durationS = Number(process.hrtime.bigint() - start) / 1e9;
    const finalLabels = { ...labels, result };
    counter.inc(finalLabels);
    histogram.observe(finalLabels, durationS);
  }
}

export function recordAuthEvent(event: string, result: string, reason = 'none'): void {
  authEventsTotal.inc({ event, result, reason });
}

export function recordRateLimitEvent(limiter: string, result: string): void {
  rateLimitEventsTotal.inc({ limiter, result });
}

export function recordBookingEvent(event: string, status: string, tripType: string): void {
  bookingEventsTotal.inc({ event, status, trip_type: tripType });
}

export function recordPaymentEvent(provider: string, method: string, result: string): void {
  paymentEventsTotal.inc({ provider, method, result });
}

export function recordProviderAssignmentEvent(result: string, reason = 'none'): void {
  providerAssignmentEventsTotal.inc({ result, reason });
}

export async function metricsText(): Promise<string> {
  return registry.metrics();
}

export function metricsContentType(): string {
  return registry.contentType;
}
