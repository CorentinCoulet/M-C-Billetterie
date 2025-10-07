import { Counter, Gauge, Histogram, Registry } from 'prom-client';

// Create a Registry for custom metrics
const register = new Registry();

// ============================================================================
// HTTP METRICS
// ============================================================================

export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
  registers: [register],
});

// ============================================================================
// BUSINESS METRICS
// ============================================================================

export const ticketsSoldTotal = new Counter({
  name: 'tickets_sold_total',
  help: 'Total tickets sold',
  labelNames: ['event_id', 'event_type'],
  registers: [register],
});

export const revenueTotal = new Counter({
  name: 'revenue_total_euros',
  help: 'Total revenue in euros',
  labelNames: ['event_id'],
  registers: [register],
});

export const ordersCreatedTotal = new Counter({
  name: 'orders_created_total',
  help: 'Total orders created',
  labelNames: ['status'],
  registers: [register],
});

export const activeUsersGauge = new Gauge({
  name: 'active_users_current',
  help: 'Currently active users',
  registers: [register],
});

export const eventsPublishedTotal = new Counter({
  name: 'events_published_total',
  help: 'Total events published',
  labelNames: ['category'],
  registers: [register],
});

// ============================================================================
// DATABASE METRICS
// ============================================================================

export const databaseQueriesTotal = new Counter({
  name: 'database_queries_total',
  help: 'Total database queries',
  labelNames: ['operation', 'table'],
  registers: [register],
});

export const databaseQueryDuration = new Histogram({
  name: 'database_query_duration_seconds',
  help: 'Database query duration in seconds',
  labelNames: ['operation', 'table'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
  registers: [register],
});

export const databaseConnectionsActive = new Gauge({
  name: 'database_connections_active',
  help: 'Number of active database connections',
  registers: [register],
});

// ============================================================================
// CACHE METRICS
// ============================================================================

export const cacheHitsTotal = new Counter({
  name: 'cache_hits_total',
  help: 'Total cache hits',
  labelNames: ['cache_key_prefix'],
  registers: [register],
});

export const cacheMissesTotal = new Counter({
  name: 'cache_misses_total',
  help: 'Total cache misses',
  labelNames: ['cache_key_prefix'],
  registers: [register],
});

export const cacheOperationDuration = new Histogram({
  name: 'cache_operation_duration_seconds',
  help: 'Cache operation duration in seconds',
  labelNames: ['operation'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1],
  registers: [register],
});

// ============================================================================
// PAYMENT METRICS
// ============================================================================

export const paymentProcessedTotal = new Counter({
  name: 'payments_processed_total',
  help: 'Total payments processed',
  labelNames: ['status', 'payment_method'],
  registers: [register],
});

export const paymentAmountTotal = new Counter({
  name: 'payments_amount_total_euros',
  help: 'Total payment amount in euros',
  labelNames: ['payment_method'],
  registers: [register],
});

export const refundsTotal = new Counter({
  name: 'refunds_total',
  help: 'Total refunds processed',
  registers: [register],
});

// ============================================================================
// ERROR METRICS
// ============================================================================

export const errorsTotal = new Counter({
  name: 'errors_total',
  help: 'Total application errors',
  labelNames: ['error_type', 'severity'],
  registers: [register],
});

// ============================================================================
// QR CODE METRICS
// ============================================================================

export const qrCodesGeneratedTotal = new Counter({
  name: 'qr_codes_generated_total',
  help: 'Total QR codes generated',
  registers: [register],
});

export const qrCodesValidatedTotal = new Counter({
  name: 'qr_codes_validated_total',
  help: 'Total QR codes validated',
  labelNames: ['validation_status'],
  registers: [register],
});

// ============================================================================
// EXPORT METRICS ENDPOINT
// ============================================================================

/**
 * Get metrics in Prometheus format
 * Use this in your API route: GET /api/metrics
 */
export async function getMetrics(): Promise<string> {
  return register.metrics();
}

/**
 * Get content type for Prometheus metrics
 */
export function getMetricsContentType(): string {
  return register.contentType;
}

/**
 * Reset all metrics (useful for testing)
 */
export function resetMetrics(): void {
  register.resetMetrics();
}

export { register };
