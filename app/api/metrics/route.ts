import { NextRequest, NextResponse } from 'next/server';
import { Counter, Gauge, Histogram, collectDefaultMetrics, register } from 'prom-client';

/**
 * Production Prometheus Metrics Collection
 * Comprehensive monitoring and alerting metrics
 * 
 * Usage:
 * - GET /api/metrics - Returns Prometheus-formatted metrics for scraping
 * - Automatic collection starts in production environment
 * - Use MetricsCollector class methods to record custom metrics throughout the app
 * 
 * Examples:
 * - MetricsCollector.recordHttpRequest('GET', '/api/users', 200, 150)
 * - MetricsCollector.recordPayment('stripe', 2500, 'EUR', 'success')
 * - MetricsCollector.recordSecurityEvent('rate_limit_exceeded', 'high')
 */

// Initialize default metrics collection with custom prefix
collectDefaultMetrics({
  prefix: 'billetterie_',
  gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5]
});

// HTTP Request metrics
const httpRequestsTotal = new Counter({
  name: 'billetterie_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

const httpRequestDuration = new Histogram({
  name: 'billetterie_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
});

// Database metrics
const databaseConnections = new Gauge({
  name: 'billetterie_database_connections_active',
  help: 'Number of active database connections',
});

const databaseQueryDuration = new Histogram({
  name: 'billetterie_database_query_duration_seconds',
  help: 'Database query duration in seconds',
  labelNames: ['operation', 'table'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5]
});

const databaseErrors = new Counter({
  name: 'billetterie_database_errors_total',
  help: 'Total number of database errors',
  labelNames: ['type', 'table']
});

// Business metrics
const usersTotal = new Gauge({
  name: 'billetterie_users_total',
  help: 'Total number of registered users'
});

const eventsTotal = new Gauge({
  name: 'billetterie_events_total',
  help: 'Total number of events'
});

const ticketsCreated = new Counter({
  name: 'billetterie_tickets_created_total',
  help: 'Total number of tickets created',
  labelNames: ['event_type'],
});

const ticketsSold = new Counter({
  name: 'billetterie_tickets_sold_total',
  help: 'Total number of tickets sold',
  labelNames: ['event_type']
});

const revenue = new Counter({
  name: 'billetterie_revenue_total',
  help: 'Total revenue in cents',
  labelNames: ['currency']
});

const ordersTotal = new Counter({
  name: 'billetterie_orders_total',
  help: 'Total number of orders',
  labelNames: ['status', 'payment_method'],
});

// Authentication metrics
const authAttempts = new Counter({
  name: 'billetterie_auth_attempts_total',
  help: 'Total number of authentication attempts',
  labelNames: ['method', 'status']
});

const activeUserSessions = new Gauge({
  name: 'billetterie_active_user_sessions',
  help: 'Number of active user sessions'
});

// Payment metrics
const paymentsTotal = new Counter({
  name: 'billetterie_payments_total',
  help: 'Total number of payment attempts',
  labelNames: ['provider', 'status']
});

const paymentAmount = new Histogram({
  name: 'billetterie_payment_amount',
  help: 'Payment amounts in cents',
  labelNames: ['currency', 'status'],
  buckets: [100, 500, 1000, 2000, 5000, 10000, 20000, 50000, 100000]
});

const paymentErrors = new Counter({
  name: 'billetterie_payment_errors_total',
  help: 'Total number of payment errors',
  labelNames: ['error_type', 'payment_provider'],
});

// Security metrics
const securityEvents = new Counter({
  name: 'billetterie_security_events_total',
  help: 'Total number of security events',
  labelNames: ['event_type', 'severity'],
});

const rateLimitHits = new Counter({
  name: 'billetterie_rate_limit_hits_total',
  help: 'Total number of rate limit hits',
  labelNames: ['endpoint', 'ip_type'],
});

const rateLimitExceeded = new Counter({
  name: 'billetterie_rate_limit_exceeded_total',
  help: 'Total number of rate limit exceeded events',
  labelNames: ['endpoint', 'ip']
});

// Performance metrics
const cacheHits = new Counter({
  name: 'billetterie_cache_hits_total',
  help: 'Total number of cache hits',
  labelNames: ['cache_type'],
});

const cacheMisses = new Counter({
  name: 'billetterie_cache_misses_total',
  help: 'Total number of cache misses',
  labelNames: ['cache_type'],
});

// QR Code metrics
const qrCodesGenerated = new Counter({
  name: 'billetterie_qr_codes_generated_total',
  help: 'Total number of QR codes generated'
});

const qrCodesValidated = new Counter({
  name: 'billetterie_qr_codes_validated_total',
  help: 'Total number of QR code validations',
  labelNames: ['status']
});

// Email metrics
const emailsSent = new Counter({
  name: 'billetterie_emails_sent_total',
  help: 'Total number of emails sent',
  labelNames: ['template', 'status']
});

// Health check metrics
const healthCheckStatus = new Gauge({
  name: 'billetterie_health_check_status',
  help: 'Health check status (1 = healthy, 0 = unhealthy)',
  labelNames: ['service']
});

// Application health
const appHealth = new Gauge({
  name: 'billetterie_app_health_status',
  help: 'Application health status (1 = healthy, 0 = unhealthy)',
});

// Resource usage
const memoryUsage = new Gauge({
  name: 'billetterie_memory_usage_bytes',
  help: 'Memory usage in bytes'
});

const cpuUsage = new Gauge({
  name: 'billetterie_cpu_usage_percent',
  help: 'CPU usage percentage'
});

// Error tracking
const errorsTotal = new Counter({
  name: 'billetterie_errors_total',
  help: 'Total number of errors',
  labelNames: ['type', 'severity']
});

/**
 * Production Metrics Collection Class
 */
export class MetricsCollector {
  static recordHttpRequest(method: string, route: string, statusCode: number, duration: number) {
    httpRequestsTotal.inc({ method, route, status_code: statusCode.toString() });
    httpRequestDuration.observe({ method, route, status_code: statusCode.toString() }, duration / 1000);
  }

  static recordDatabaseOperation(operation: string, table: string, duration: number, success: boolean = true) {
    databaseQueryDuration.observe({ operation, table }, duration / 1000);
    if (!success) {
      databaseErrors.inc({ type: 'query_error', table });
    }
  }

  static recordAuthAttempt(method: string, success: boolean) {
    authAttempts.inc({ method, status: success ? 'success' : 'failure' });
  }

  static recordPayment(provider: string, amount: number, currency: string, status: 'success' | 'failure' | 'pending') {
    paymentsTotal.inc({ provider, status });
    paymentAmount.observe({ currency, status }, amount);
    
    if (status === 'success') {
      revenue.inc({ currency }, amount);
    }
  }

  static recordTicketCreated(eventType: string) {
    ticketsCreated.inc({ event_type: eventType });
  }

  static recordTicketSale(eventType: string, quantity: number = 1) {
    ticketsSold.inc({ event_type: eventType }, quantity);
  }

  static recordOrder(status: string, paymentMethod: string) {
    ordersTotal.inc({ status, payment_method: paymentMethod });
  }

  static recordPaymentError(errorType: string, provider: string) {
    paymentErrors.inc({ error_type: errorType, payment_provider: provider });
  }

  static recordSecurityEvent(eventType: string, severity: 'low' | 'medium' | 'high' | 'critical') {
    securityEvents.inc({ event_type: eventType, severity });
  }

  static recordRateLimitHit(endpoint: string, ipType: 'internal' | 'external') {
    rateLimitHits.inc({ endpoint, ip_type: ipType });
  }

  static recordRateLimitExceeded(endpoint: string, ip: string) {
    rateLimitExceeded.inc({ endpoint, ip });
  }

  static recordCacheHit(cacheType: string) {
    cacheHits.inc({ cache_type: cacheType });
  }

  static recordCacheMiss(cacheType: string) {
    cacheMisses.inc({ cache_type: cacheType });
  }

  static recordQRCodeGenerated() {
    qrCodesGenerated.inc();
  }

  static recordQRCodeValidation(status: 'valid' | 'invalid' | 'expired') {
    qrCodesValidated.inc({ status });
  }

  static recordEmailSent(template: string, success: boolean) {
    emailsSent.inc({ template, status: success ? 'success' : 'failure' });
  }

  static recordError(type: string, severity: 'low' | 'medium' | 'high' | 'critical') {
    errorsTotal.inc({ type, severity });
  }

  static updateHealthCheckStatus(service: string, healthy: boolean) {
    healthCheckStatus.set({ service }, healthy ? 1 : 0);
  }

  static setDatabaseConnections(count: number) {
    databaseConnections.set(count);
  }

  static setAppHealth(isHealthy: boolean) {
    appHealth.set(isHealthy ? 1 : 0);
  }

  static updateResourceUsage() {
    const memUsage = process.memoryUsage();
    memoryUsage.set(memUsage.heapUsed);

    const cpuUsageData = process.cpuUsage();
    const cpuPercent = (cpuUsageData.user + cpuUsageData.system) / 1000000; // Convert to milliseconds
    cpuUsage.set(cpuPercent);
  }

  static async updateBusinessMetrics() {
    try {
      const { default: prisma } = await import('../../../src/lib/prisma');

      // Update user count
      const userCount = await prisma.user.count();
      usersTotal.set(userCount);

      // Update event count
      const eventCount = await prisma.event.count();
      eventsTotal.set(eventCount);

      // Update active sessions
      const activeSessionCount = await prisma.userSession.count({
        where: {
          expiresAt: { gt: new Date() },
          isActive: true
        }
      });
      activeUserSessions.set(activeSessionCount);

    } catch (error) {
      console.error('Failed to update business metrics:', error);
      this.recordError('metrics_update', 'medium');
    }
  }

  static async getMetrics(): Promise<string> {
    // Update latest metrics before serving
    this.updateResourceUsage();
    return register.metrics();
  }
}

/**
 * Metrics middleware for HTTP requests (conceptual - to be used in middleware.ts)
 */
export function createMetricsMiddleware() {
  return (req: NextRequest) => {
    const startTime = Date.now();
    const method = req.method || 'GET';
    const route = new URL(req.url).pathname;

    // This would be handled in the actual middleware or API routes
    return {
      recordResponse: (statusCode: number) => {
        const duration = Date.now() - startTime;
        MetricsCollector.recordHttpRequest(method, route, statusCode, duration);
      }
    };
  };
}

/**
 * Periodic metrics collection
 */
let metricsInterval: NodeJS.Timeout | null = null;

export function startMetricsCollection() {
  if (metricsInterval) {
    return; // Already started
  }

  // Update resource usage every 30 seconds
  metricsInterval = setInterval(() => {
    MetricsCollector.updateResourceUsage();
  }, 30000);

  // Update business metrics every 5 minutes
  setInterval(() => {
    MetricsCollector.updateBusinessMetrics();
  }, 300000);

  console.log('Metrics collection started');
}

export function stopMetricsCollection() {
  if (metricsInterval) {
    clearInterval(metricsInterval);
    metricsInterval = null;
    console.log('Metrics collection stopped');
  }
}

/**
 * API endpoint for Prometheus scraping
 */
export async function GET() {
  try {
    const metrics = await MetricsCollector.getMetrics();
    return new NextResponse(metrics, {
      headers: {
        'Content-Type': register.contentType,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      },
    });
  } catch (error) {
    console.error('Error generating metrics:', error);
    return NextResponse.json(
      { error: 'Failed to collect metrics' },
      { status: 500 }
    );
  }
}

// Start metrics collection automatically in production
if (typeof window === 'undefined' && process.env.NODE_ENV === 'production') {
  startMetricsCollection();
}

export { register };
export default MetricsCollector;
