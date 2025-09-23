import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '../lib/logger';
import prisma from '../lib/prisma';

const execAsync = promisify(exec);

/**
 * Unified Monitoring and Metrics Service
 * Collects and reports application metrics, includes health checks
 */

export interface MetricData {
  name: string;
  value: number;
  unit?: string;
  timestamp?: Date;
  tags?: Record<string, string>;
}

export interface PerformanceMetrics {
  requests: {
    total: number;
    successful: number;
    failed: number;
    avgResponseTime: number;
  };
  database: {
    connections: number;
    avgQueryTime: number;
    slowQueries: number;
  };
  cache: {
    hits: number;
    misses: number;
    hitRate: number;
  };
  business: {
    totalUsers: number;
    activeUsers: number;
    totalEvents: number;
    totalTickets: number;
    revenue: number;
  };
}

class MetricsCollector {
  private metrics: Map<string, MetricData[]> = new Map();
  private readonly maxMetricsPerName = 1000; // Prevent memory leaks

  /**
   * Record a metric
   */
  record(name: string, value: number, unit?: string, tags?: Record<string, string>) {
    const metric: MetricData = {
      name,
      value,
      unit,
      timestamp: new Date(),
      tags
    };

    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const metricsList = this.metrics.get(name)!;
    metricsList.push(metric);

    // Limit memory usage
    if (metricsList.length > this.maxMetricsPerName) {
      metricsList.shift(); // Remove oldest metric
    }
  }

  /**
   * Increment a counter
   */
  increment(name: string, value: number = 1, tags?: Record<string, string>) {
    const existing = this.getLatest(name);
    const newValue = existing ? existing.value + value : value;
    this.record(name, newValue, 'count', tags);
  }

  /**
   * Record timing
   */
  timing(name: string, startTime: number, tags?: Record<string, string>) {
    const duration = Date.now() - startTime;
    this.record(name, duration, 'ms', tags);
  }

  /**
   * Record gauge (current value)
   */
  gauge(name: string, value: number, unit?: string, tags?: Record<string, string>) {
    this.record(name, value, unit, tags);
  }

  /**
   * Get latest metric
   */
  getLatest(name: string): MetricData | null {
    const metricsList = this.metrics.get(name);
    return metricsList && metricsList.length > 0 
      ? metricsList[metricsList.length - 1] 
      : null;
  }

  /**
   * Get all metrics for a name
   */
  getMetrics(name: string): MetricData[] {
    return this.metrics.get(name) || [];
  }

  /**
   * Get summary statistics
   */
  getSummary(name: string): {
    count: number;
    min: number;
    max: number;
    avg: number;
    sum: number;
  } | null {
    const metricsList = this.metrics.get(name);
    if (!metricsList || metricsList.length === 0) {
      return null;
    }

    const values = metricsList.map(m => m.value);
    const sum = values.reduce((a, b) => a + b, 0);
    
    return {
      count: values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      avg: sum / values.length,
      sum
    };
  }

  /**
   * Clear all metrics
   */
  clear() {
    this.metrics.clear();
  }

  /**
   * Get all metric names
   */
  getMetricNames(): string[] {
    return Array.from(this.metrics.keys());
  }
}

class MonitoringService {
  private metricsCollector = new MetricsCollector();
  private requestStats = {
    total: 0,
    successful: 0,
    failed: 0,
    responseTimes: [] as number[]
  };

  /**
   * Record request metric
   */
  recordRequest(responseTime: number, statusCode: number, path: string, method: string) {
    this.requestStats.total++;
    this.requestStats.responseTimes.push(responseTime);
    
    // Keep only last 1000 response times
    if (this.requestStats.responseTimes.length > 1000) {
      this.requestStats.responseTimes.shift();
    }

    if (statusCode >= 200 && statusCode < 400) {
      this.requestStats.successful++;
      this.metricsCollector.increment('requests.successful', 1, { 
        path, 
        method, 
        status: statusCode.toString() 
      });
    } else {
      this.requestStats.failed++;
      this.metricsCollector.increment('requests.failed', 1, { 
        path, 
        method, 
        status: statusCode.toString() 
      });
    }

    this.metricsCollector.timing('request.response_time', Date.now() - responseTime, {
      path,
      method
    });
  }

  /**
   * Record database query metric
   */
  recordDatabaseQuery(queryTime: number, query: string, success: boolean) {
    this.metricsCollector.timing('database.query_time', Date.now() - queryTime, {
      query: query.substring(0, 50), // Truncate for privacy
      success: success.toString()
    });

    if (queryTime > 1000) { // Slow query threshold: 1s
      this.metricsCollector.increment('database.slow_queries', 1, {
        query: query.substring(0, 50)
      });
    }
  }

  /**
   * Record cache metric
   */
  recordCacheHit(key: string, hit: boolean) {
    if (hit) {
      this.metricsCollector.increment('cache.hits', 1, { key: key.substring(0, 50) });
    } else {
      this.metricsCollector.increment('cache.misses', 1, { key: key.substring(0, 50) });
    }
  }

  /**
   * Record business metric
   */
  recordBusinessEvent(event: string, value: number = 1, metadata?: Record<string, any>) {
    this.metricsCollector.increment(`business.${event}`, value, {
      ...metadata,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Get comprehensive performance metrics
   */
  async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    // Calculate request metrics
    const avgResponseTime = this.requestStats.responseTimes.length > 0
      ? this.requestStats.responseTimes.reduce((a, b) => a + b, 0) / this.requestStats.responseTimes.length
      : 0;

    // Get cache metrics
    const cacheHits = this.metricsCollector.getLatest('cache.hits')?.value || 0;
    const cacheMisses = this.metricsCollector.getLatest('cache.misses')?.value || 0;
    const hitRate = cacheHits + cacheMisses > 0 ? (cacheHits / (cacheHits + cacheMisses)) * 100 : 0;

    // Get business metrics from database
    const [usersCount, activeUsersCount, eventsCount, ticketsCount, revenueSum] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({
        where: {
          lastLogin: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
          }
        }
      }),
      prisma.event.count(),
      prisma.ticket.count(),
      prisma.order.aggregate({
        _sum: { totalPrice: true },
        where: { status: 'paid' }
      })
    ]);

    return {
      requests: {
        total: this.requestStats.total,
        successful: this.requestStats.successful,
        failed: this.requestStats.failed,
        avgResponseTime: Math.round(avgResponseTime)
      },
      database: {
        connections: 1, // Would need actual pool monitoring
        avgQueryTime: this.metricsCollector.getSummary('database.query_time')?.avg || 0,
        slowQueries: this.metricsCollector.getLatest('database.slow_queries')?.value || 0
      },
      cache: {
        hits: cacheHits,
        misses: cacheMisses,
        hitRate: Math.round(hitRate * 100) / 100
      },
      business: {
        totalUsers: usersCount,
        activeUsers: activeUsersCount,
        totalEvents: eventsCount,
        totalTickets: ticketsCount,
        revenue: revenueSum._sum.totalPrice || 0
      }
    };
  }

  /**
   * Get system health metrics
   */
  getSystemMetrics() {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    return {
      memory: {
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
        external: Math.round(memUsage.external / 1024 / 1024), // MB
        rss: Math.round(memUsage.rss / 1024 / 1024) // MB
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system
      },
      uptime: Math.round(process.uptime()),
      version: process.version,
      platform: process.platform,
      arch: process.arch
    };
  }

  /**
   * Export metrics in Prometheus format
   */
  exportPrometheusMetrics(): string {
    const lines: string[] = [];
    
    // Add help and type comments
    const metricNames = this.metricsCollector.getMetricNames();
    
    for (const metricName of metricNames) {
      const summary = this.metricsCollector.getSummary(metricName);
      if (!summary) continue;

      const safeName = metricName.replace(/[^a-zA-Z0-9_]/g, '_');
      
      lines.push(`# HELP ${safeName} ${metricName} metric`);
      lines.push(`# TYPE ${safeName} gauge`);
      lines.push(`${safeName}{} ${summary.avg}`);
      lines.push(`${safeName}_total{} ${summary.sum}`);
      lines.push(`${safeName}_count{} ${summary.count}`);
    }

    // Add system metrics
    const systemMetrics = this.getSystemMetrics();
    lines.push(`# HELP nodejs_memory_heap_used_bytes Node.js memory heap used`);
    lines.push(`# TYPE nodejs_memory_heap_used_bytes gauge`);
    lines.push(`nodejs_memory_heap_used_bytes ${systemMetrics.memory.heapUsed * 1024 * 1024}`);
    
    lines.push(`# HELP nodejs_memory_heap_total_bytes Node.js memory heap total`);
    lines.push(`# TYPE nodejs_memory_heap_total_bytes gauge`);
    lines.push(`nodejs_memory_heap_total_bytes ${systemMetrics.memory.heapTotal * 1024 * 1024}`);
    
    lines.push(`# HELP nodejs_process_uptime_seconds Node.js uptime`);
    lines.push(`# TYPE nodejs_process_uptime_seconds gauge`);
    lines.push(`nodejs_process_uptime_seconds ${systemMetrics.uptime}`);

    return lines.join('\n');
  }

  /**
   * Start collecting system metrics
   */
  startSystemMetricsCollection() {
    // Collect system metrics every 30 seconds
    setInterval(() => {
      const systemMetrics = this.getSystemMetrics();
      
      this.metricsCollector.gauge('system.memory.heap_used', systemMetrics.memory.heapUsed);
      this.metricsCollector.gauge('system.memory.heap_total', systemMetrics.memory.heapTotal);
      this.metricsCollector.gauge('system.uptime', systemMetrics.uptime);
      
    }, 30000);
  }

  /**
   * Record error metric
   */
  recordError(error: Error, context?: Record<string, any>) {
    this.metricsCollector.increment('errors.total', 1, {
      name: error.name,
      message: error.message.substring(0, 100),
      ...context
    });
    
    logger.error('Error recorded in metrics', {
      error: error.message,
      stack: error.stack,
      context
    });
  }

  /**
   * Get custom metrics
   */
  getCustomMetrics() {
    return {
      metricsCollected: this.metricsCollector.getMetricNames().length,
      totalDataPoints: this.metricsCollector.getMetricNames()
        .reduce((total, name) => total + this.metricsCollector.getMetrics(name).length, 0)
    };
  }

  /**
   * Reset metrics (useful for testing)
   */
  reset() {
    this.metricsCollector.clear();
    this.requestStats = {
      total: 0,
      successful: 0,
      failed: 0,
      responseTimes: []
    };
  }

  /**
   * Check system health (merged from backup service)
   */
  async checkSystemHealth() {
    const checks = await Promise.allSettled([
      this.checkDatabaseConnection(),
      this.checkRedisConnection(),
      this.checkDiskSpace(),
      this.checkMemoryUsage(),
      this.checkRecentErrors(),
    ]);
    
    return {
      status: checks.every(check => check.status === 'fulfilled') ? 'healthy' : 'unhealthy',
      checks: checks.map((check, index) => ({
        name: ['database', 'redis', 'disk', 'memory', 'errors'][index],
        status: check.status,
        ...(check.status === 'fulfilled' ? { result: check.value } : { error: check.reason?.toString() })
      })),
      timestamp: new Date().toISOString(),
    };
  }

  private async checkDatabaseConnection() {
    try {
      const startTime = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      const responseTime = Date.now() - startTime;
      return { status: 'ok', response_time: responseTime };
    } catch (error) {
      throw new Error(`Database connection failed: ${error}`);
    }
  }

  private async checkRedisConnection() {
    // Implement Redis health check if using Redis
    return { status: 'ok', message: 'Redis not configured' };
  }

  private async checkDiskSpace() {
    try {
      const { stdout } = await execAsync('df -h .');
      return { status: 'ok', output: stdout };
    } catch (error) {
      throw new Error(`Disk space check failed: ${error}`);
    }
  }

  private async checkMemoryUsage() {
    const memUsage = process.memoryUsage();
    const totalMem = require('os').totalmem();
    const freeMem = require('os').freemem();
    
    return {
      status: 'ok',
      usage: {
        process: memUsage,
        system: {
          total: totalMem,
          free: freeMem,
          used: totalMem - freeMem,
          usage_percent: ((totalMem - freeMem) / totalMem * 100).toFixed(2)
        }
      }
    };
  }

  private async checkRecentErrors() {
    try {
      const recentErrors = await prisma.securityLog.count({
        where: {
          type: 'error',
          timestamp: { gte: new Date(Date.now() - 60 * 60 * 1000) } // Last hour
        }
      });
      
      return {
        status: recentErrors > 100 ? 'warning' : 'ok',
        error_count: recentErrors,
      };
    } catch (error) {
      // Fallback if securityLog table doesn't exist or has different structure
      return { status: 'ok', recent_errors: 0, note: 'Security log not available' };
    }
  }
}

// Export singleton instance
export const monitoringService = new MonitoringService();

// Start system metrics collection if monitoring is enabled
if (process.env.MONITORING_ENABLED === 'true') {
  monitoringService.startSystemMetricsCollection();
  logger.info('System metrics collection started');
}

export default monitoringService;
