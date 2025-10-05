import { NextFunction, Request, Response } from 'express';
import { monitoringService } from '../lib/monitoring';

/**
 * Performance monitoring middleware
 * Tracks request metrics and performance
 */

declare global {
  namespace Express {
    interface Request {
      startTime?: number;
      requestId?: string;
    }
  }
}

/**
 * Performance monitoring middleware
 */
export const performanceMonitoring = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  req.startTime = startTime;

  // Track response
  const originalSend = res.send;
  res.send = function(data) {
    const responseTime = Date.now() - startTime;
    const statusCode = res.statusCode;
    const method = req.method;
    const path = req.route?.path || req.path;

    // Record metrics
    monitoringService.recordRequest(responseTime, statusCode, path, method);

    // Log slow requests
    if (responseTime > 1000) {
      console.warn(`Slow request detected: ${method} ${path} - ${responseTime}ms`);
    }

    return originalSend.call(this, data);
  };

  next();
};

/**
 * Database query monitoring middleware
 */
export const databaseMonitoring = {
  /**
   * Wrap Prisma client methods to monitor queries
   */
  wrapPrismaClient: (prisma: any) => {
    const originalQuery = prisma.$queryRaw;
    const originalExecuteRaw = prisma.$executeRaw;

    // Wrap $queryRaw
    prisma.$queryRaw = async (...args: any[]) => {
      const startTime = Date.now();
      try {
        const result = await originalQuery.apply(prisma, args);
        const queryTime = Date.now() - startTime;
        monitoringService.recordDatabaseQuery(queryTime, String(args[0]), true);
        return result;
      } catch (error) {
        const queryTime = Date.now() - startTime;
        monitoringService.recordDatabaseQuery(queryTime, String(args[0]), false);
        throw error;
      }
    };

    // Wrap $executeRaw
    prisma.$executeRaw = async (...args: any[]) => {
      const startTime = Date.now();
      try {
        const result = await originalExecuteRaw.apply(prisma, args);
        const queryTime = Date.now() - startTime;
        monitoringService.recordDatabaseQuery(queryTime, String(args[0]), true);
        return result;
      } catch (error) {
        const queryTime = Date.now() - startTime;
        monitoringService.recordDatabaseQuery(queryTime, String(args[0]), false);
        throw error;
      }
    };

    return prisma;
  }
};

/**
 * Cache monitoring helper
 */
export const cacheMonitoring = {
  /**
   * Record cache hit
   */
  recordHit: (key: string) => {
    monitoringService.recordCacheHit(key, true);
  },

  /**
   * Record cache miss
   */
  recordMiss: (key: string) => {
    monitoringService.recordCacheHit(key, false);
  }
};

/**
 * Business metrics tracking
 */
export const businessMetrics = {
  /**
   * Track user registration
   */
  userRegistered: (userId: string, method: string) => {
    monitoringService.recordBusinessEvent('user_registered', 1, { userId, method });
  },

  /**
   * Track user login
   */
  userLogin: (userId: string, method: string) => {
    monitoringService.recordBusinessEvent('user_login', 1, { userId, method });
  },

  /**
   * Track event creation
   */
  eventCreated: (eventId: string, userId: string) => {
    monitoringService.recordBusinessEvent('event_created', 1, { eventId, userId });
  },

  /**
   * Track ticket purchase
   */
  ticketPurchased: (ticketId: string, eventId: string, userId: string, price: number) => {
    monitoringService.recordBusinessEvent('ticket_purchased', 1, { 
      ticketId, 
      eventId, 
      userId, 
      price 
    });
    monitoringService.recordBusinessEvent('revenue_generated', price, { 
      source: 'ticket_sale' 
    });
  },

  /**
   * Track payment
   */
  paymentProcessed: (orderId: string, amount: number, method: string, success: boolean) => {
    monitoringService.recordBusinessEvent('payment_processed', 1, { 
      orderId, 
      amount, 
      method, 
      success 
    });
    
    if (success) {
      monitoringService.recordBusinessEvent('payment_success', 1, { method });
    } else {
      monitoringService.recordBusinessEvent('payment_failure', 1, { method });
    }
  },

  /**
   * Track QR code scan
   */
  qrCodeScanned: (ticketId: string, eventId: string, scannedBy: string) => {
    monitoringService.recordBusinessEvent('qr_code_scanned', 1, { 
      ticketId, 
      eventId, 
      scannedBy 
    });
  },

  /**
   * Track API usage
   */
  apiEndpointUsed: (endpoint: string, userId?: string) => {
    monitoringService.recordBusinessEvent('api_endpoint_used', 1, { 
      endpoint, 
      userId 
    });
  },

  /**
   * Track error
   */
  errorOccurred: (error: Error, context?: Record<string, any>) => {
    monitoringService.recordError(error, context);
  }
};

/**
 * Resource monitoring middleware
 */
export const resourceMonitoring = (req: Request, res: Response, next: NextFunction) => {
  // Monitor memory usage for heavy requests
  const memoryBefore = process.memoryUsage();
  
  res.on('finish', () => {
    const memoryAfter = process.memoryUsage();
    const memoryDiff = memoryAfter.heapUsed - memoryBefore.heapUsed;
    
    // Log if request caused significant memory increase (> 10MB)
    if (memoryDiff > 10 * 1024 * 1024) {
      console.warn(`High memory usage request: ${req.method} ${req.path} - ${Math.round(memoryDiff / 1024 / 1024)}MB`);
      monitoringService.recordBusinessEvent('high_memory_request', memoryDiff, {
        path: req.path,
        method: req.method
      });
    }
  });
  
  next();
};

/**
 * Alert thresholds
 */
export const AlertThresholds = {
  RESPONSE_TIME_SLOW: 1000,      // 1 second
  RESPONSE_TIME_CRITICAL: 5000,  // 5 seconds
  ERROR_RATE_WARNING: 0.05,      // 5%
  ERROR_RATE_CRITICAL: 0.10,     // 10%
  MEMORY_WARNING: 500,           // 500MB
  MEMORY_CRITICAL: 800,          // 800MB
  DATABASE_SLOW_QUERY: 1000,     // 1 second
  CACHE_HIT_RATE_LOW: 0.80       // 80%
};

/**
 * Health check functions
 */
export const healthChecks = {
  /**
   * Check if error rate is acceptable
   */
  checkErrorRate: async () => {
    const metrics = await monitoringService.getPerformanceMetrics();
    const errorRate = metrics.requests.total > 0 
      ? metrics.requests.failed / metrics.requests.total 
      : 0;
    
    return {
      healthy: errorRate < AlertThresholds.ERROR_RATE_WARNING,
      value: errorRate,
      threshold: AlertThresholds.ERROR_RATE_WARNING,
      message: errorRate >= AlertThresholds.ERROR_RATE_CRITICAL 
        ? 'CRITICAL: High error rate' 
        : errorRate >= AlertThresholds.ERROR_RATE_WARNING 
          ? 'WARNING: Elevated error rate' 
          : 'OK'
    };
  },

  /**
   * Check average response time
   */
  checkResponseTime: async () => {
    const metrics = await monitoringService.getPerformanceMetrics();
    const avgResponseTime = metrics.requests.avgResponseTime;
    
    return {
      healthy: avgResponseTime < AlertThresholds.RESPONSE_TIME_SLOW,
      value: avgResponseTime,
      threshold: AlertThresholds.RESPONSE_TIME_SLOW,
      message: avgResponseTime >= AlertThresholds.RESPONSE_TIME_CRITICAL 
        ? 'CRITICAL: Very slow response times' 
        : avgResponseTime >= AlertThresholds.RESPONSE_TIME_SLOW 
          ? 'WARNING: Slow response times' 
          : 'OK'
    };
  },

  /**
   * Check memory usage
   */
  checkMemoryUsage: () => {
    const systemMetrics = monitoringService.getSystemMetrics();
    const memoryUsage = systemMetrics.memory.heapUsed;
    
    return {
      healthy: memoryUsage < AlertThresholds.MEMORY_WARNING,
      value: memoryUsage,
      threshold: AlertThresholds.MEMORY_WARNING,
      message: memoryUsage >= AlertThresholds.MEMORY_CRITICAL 
        ? 'CRITICAL: High memory usage' 
        : memoryUsage >= AlertThresholds.MEMORY_WARNING 
          ? 'WARNING: Elevated memory usage' 
          : 'OK'
    };
  },

  /**
   * Check cache hit rate
   */
  checkCacheHitRate: async () => {
    const metrics = await monitoringService.getPerformanceMetrics();
    const hitRate = metrics.cache.hitRate / 100; // Convert percentage to ratio
    
    return {
      healthy: hitRate > AlertThresholds.CACHE_HIT_RATE_LOW,
      value: hitRate,
      threshold: AlertThresholds.CACHE_HIT_RATE_LOW,
      message: hitRate <= AlertThresholds.CACHE_HIT_RATE_LOW 
        ? 'WARNING: Low cache hit rate' 
        : 'OK'
    };
  }
};

export default performanceMonitoring;
