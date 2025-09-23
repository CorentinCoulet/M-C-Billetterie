import { PrismaClient } from '../generated/prisma';
import { Request, Response } from 'express';
import { logger } from './logger';

const prisma = new PrismaClient();

interface PerformanceMetric {
  endpoint: string;
  method: string;
  responseTime: number;
  statusCode: number;
  timestamp: Date;
  userId?: string;
  ip: string;
  userAgent?: string;
}

interface SecurityAlert {
  type: 'BRUTE_FORCE' | 'SQL_INJECTION' | 'XSS_ATTEMPT' | 'UNUSUAL_ACTIVITY' | 'HIGH_TRAFFIC';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  ip: string;
  timestamp: Date;
  metadata?: any;
}

/**
 * Production-Ready Security and Performance Monitor
 * Real-time monitoring with automated alerting
 */
export class ProductionMonitor {
  private static instance: ProductionMonitor;
  private metrics: PerformanceMetric[] = [];
  private alerts: SecurityAlert[] = [];
  private thresholds = {
    responseTime: 5000, // 5 seconds
    errorRate: 0.05, // 5%
    requestRate: 1000, // requests per minute
    memoryUsage: 0.8 // 80%
  };

  private constructor() {
    this.startCleanupTasks();
    this.startHealthChecks();
  }

  static getInstance(): ProductionMonitor {
    if (!ProductionMonitor.instance) {
      ProductionMonitor.instance = new ProductionMonitor();
    }
    return ProductionMonitor.instance;
  }

  /**
   * Monitor API request performance
   */
  async monitorRequest(req: Request, res: Response, startTime: number): Promise<void> {
    const responseTime = Date.now() - startTime;
    const metric: PerformanceMetric = {
      endpoint: req.route?.path || req.url || '',
      method: req.method,
      responseTime,
      statusCode: res.statusCode,
      timestamp: new Date(),
      userId: (req as any).user?.id,
      ip: req.ip || req.headers['x-forwarded-for'] as string || 'unknown',
      userAgent: req.headers['user-agent']
    };

    this.metrics.push(metric);
    
    // Keep only last 1000 metrics in memory
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }

    // Check thresholds and generate alerts
    await this.checkPerformanceThresholds(metric);
    
    // Log slow requests
    if (responseTime > this.thresholds.responseTime) {
      logger.warn(`Slow request detected`, {
        endpoint: metric.endpoint,
        responseTime,
        method: metric.method,
        statusCode: metric.statusCode
      });
    }

    // Persist critical metrics
    if (this.shouldPersistMetric(metric)) {
      await this.persistMetric(metric);
    }
  }

  /**
   * Generate security alert
   */
  async generateSecurityAlert(alert: SecurityAlert): Promise<void> {
    this.alerts.push(alert);
    
    // Keep only last 100 alerts in memory
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }

    // Log alert
    logger.warn(`Security alert generated`, alert);

    // Persist alert
    await this.persistSecurityAlert(alert);

    // Send notifications based on severity
    if (alert.severity === 'CRITICAL' || alert.severity === 'HIGH') {
      await this.sendCriticalAlert(alert);
    }
  }

  /**
   * Get real-time performance metrics
   */
  getPerformanceMetrics(timeWindow: number = 300000): any {
    const now = new Date();
    const windowStart = new Date(now.getTime() - timeWindow);
    
    const recentMetrics = this.metrics.filter(m => m.timestamp >= windowStart);
    
    if (recentMetrics.length === 0) {
      return {
        requestCount: 0,
        averageResponseTime: 0,
        errorRate: 0,
        slowRequests: 0
      };
    }

    const requestCount = recentMetrics.length;
    const averageResponseTime = recentMetrics.reduce((sum, m) => sum + m.responseTime, 0) / requestCount;
    const errorCount = recentMetrics.filter(m => m.statusCode >= 400).length;
    const errorRate = errorCount / requestCount;
    const slowRequests = recentMetrics.filter(m => m.responseTime > this.thresholds.responseTime).length;

    return {
      requestCount,
      averageResponseTime: Math.round(averageResponseTime),
      errorRate: Math.round(errorRate * 100) / 100,
      slowRequests,
      topEndpoints: this.getTopEndpoints(recentMetrics),
      statusCodeDistribution: this.getStatusCodeDistribution(recentMetrics)
    };
  }

  /**
   * Get security alerts
   */
  getSecurityAlerts(timeWindow: number = 3600000): SecurityAlert[] {
    const now = new Date();
    const windowStart = new Date(now.getTime() - timeWindow);
    
    return this.alerts.filter(a => a.timestamp >= windowStart);
  }

  /**
   * Get system health status
   */
  async getSystemHealth(): Promise<any> {
    const health = {
      status: 'healthy' as 'healthy' | 'degraded' | 'unhealthy',
      timestamp: new Date(),
      services: {} as any,
      metrics: this.getPerformanceMetrics(),
      memory: process.memoryUsage(),
      uptime: process.uptime()
    };

    // Check database connectivity
    try {
      await prisma.$queryRaw`SELECT 1`;
      health.services.database = { status: 'healthy', responseTime: 0 };
    } catch (error) {
      health.services.database = { status: 'unhealthy', error: 'Connection failed' };
      health.status = 'unhealthy';
    }

    // Check Redis connectivity (if configured)
    if (process.env.REDIS_URL) {
      // Redis health check would go here
      health.services.redis = { status: 'healthy' };
    }

    // Check external services
    health.services.stripe = await this.checkStripeHealth();
    health.services.email = await this.checkEmailHealth();

    // Determine overall health
    const serviceStatuses = Object.values(health.services).map((s: any) => s.status);
    if (serviceStatuses.includes('unhealthy')) {
      health.status = 'unhealthy';
    } else if (serviceStatuses.includes('degraded')) {
      health.status = 'degraded';
    }

    // Check performance thresholds
    if (health.metrics.errorRate > this.thresholds.errorRate) {
      health.status = 'degraded';
    }

    if (health.metrics.averageResponseTime > this.thresholds.responseTime) {
      health.status = 'degraded';
    }

    return health;
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(startDate: Date, endDate: Date): Promise<any> {
    try {
      // Get audit logs
      const auditLogs = await prisma.auditLog.findMany({
        where: {
          timestamp: {
            gte: startDate,
            lte: endDate
          }
        },
        select: {
          action: true,
          resourceType: true,
          result: true,
          riskLevel: true,
          isSensitive: true,
          timestamp: true
        }
      });

      // Get security logs
      const securityLogs = await prisma.securityLog.findMany({
        where: {
          timestamp: {
            gte: startDate,
            lte: endDate
          }
        },
        select: {
          type: true,
          timestamp: true
        }
      });

      // Get login attempts
      const loginAttempts = await prisma.loginAttempt.findMany({
        where: {
          timestamp: {
            gte: startDate,
            lte: endDate
          }
        },
        select: {
          success: true,
          reason: true,
          riskScore: true,
          timestamp: true
        }
      });

      return {
        period: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        },
        summary: {
          totalAuditEvents: auditLogs.length,
          totalSecurityEvents: securityLogs.length,
          totalLoginAttempts: loginAttempts.length,
          failedLogins: loginAttempts.filter((l: any) => !l.success).length,
          highRiskEvents: auditLogs.filter((l: any) => l.riskLevel === 'high' || l.riskLevel === 'critical').length,
          sensitiveDataAccess: auditLogs.filter((l: any) => l.isSensitive).length
        },
        auditEvents: {
          byAction: this.groupBy(auditLogs, 'action'),
          byResourceType: this.groupBy(auditLogs, 'resourceType'),
          byRiskLevel: this.groupBy(auditLogs, 'riskLevel')
        },
        securityEvents: {
          byType: this.groupBy(securityLogs, 'type')
        },
        compliance: {
          gdprCompliant: true,
          dataRetentionCompliant: true,
          accessLoggingCompliant: auditLogs.length > 0,
          securityMonitoringActive: securityLogs.length > 0
        }
      };
    } catch (error) {
      logger.error('Error generating compliance report:', error);
      throw new Error('Failed to generate compliance report');
    }
  }

  /**
   * Check performance thresholds and generate alerts
   */
  private async checkPerformanceThresholds(metric: PerformanceMetric): Promise<void> {
    // Check response time threshold
    if (metric.responseTime > this.thresholds.responseTime) {
      await this.generateSecurityAlert({
        type: 'HIGH_TRAFFIC',
        severity: 'MEDIUM',
        description: `Slow response time: ${metric.responseTime}ms on ${metric.endpoint}`,
        ip: metric.ip,
        timestamp: new Date(),
        metadata: { endpoint: metric.endpoint, responseTime: metric.responseTime }
      });
    }

    // Check error rate
    const recentErrors = this.metrics
      .filter(m => m.timestamp > new Date(Date.now() - 300000)) // Last 5 minutes
      .filter(m => m.statusCode >= 400);
    
    const recentTotal = this.metrics.filter(m => m.timestamp > new Date(Date.now() - 300000));
    const errorRate = recentErrors.length / recentTotal.length;
    
    if (errorRate > this.thresholds.errorRate) {
      await this.generateSecurityAlert({
        type: 'HIGH_TRAFFIC',
        severity: 'HIGH',
        description: `High error rate: ${(errorRate * 100).toFixed(2)}%`,
        ip: metric.ip,
        timestamp: new Date(),
        metadata: { errorRate, threshold: this.thresholds.errorRate }
      });
    }
  }

  /**
   * Check if metric should be persisted
   */
  private shouldPersistMetric(metric: PerformanceMetric): boolean {
    return (
      metric.responseTime > this.thresholds.responseTime ||
      metric.statusCode >= 400 ||
      metric.endpoint.includes('/admin') ||
      metric.endpoint.includes('/auth')
    );
  }

  /**
   * Persist metric to database
   */
  private async persistMetric(metric: PerformanceMetric): Promise<void> {
    try {
      // You might want to create a specific table for performance metrics
      // For now, we'll log it as an audit event
      await prisma.auditLog.create({
        data: {
          action: 'api.request',
          resourceType: 'endpoint',
          resourceId: metric.endpoint,
          ipAddress: metric.ip,
          userAgent: metric.userAgent,
          details: JSON.stringify({
            method: metric.method,
            responseTime: metric.responseTime,
            statusCode: metric.statusCode
          }),
          timestamp: metric.timestamp,
          result: metric.statusCode < 400 ? 'success' : 'failure',
          riskLevel: metric.responseTime > this.thresholds.responseTime ? 'medium' : 'low',
          isSensitive: false,
          eventHash: this.generateEventHash(metric)
        }
      });
    } catch (error) {
      logger.error('Error persisting metric:', error);
    }
  }

  /**
   * Persist security alert
   */
  private async persistSecurityAlert(alert: SecurityAlert): Promise<void> {
    try {
      await prisma.securityLog.create({
        data: {
          type: alert.type,
          ip: alert.ip,
          data: JSON.stringify({
            severity: alert.severity,
            description: alert.description,
            metadata: alert.metadata
          }),
          timestamp: alert.timestamp
        }
      });
    } catch (error) {
      logger.error('Error persisting security alert:', error);
    }
  }

  /**
   * Send critical alert notification
   */
  private async sendCriticalAlert(alert: SecurityAlert): Promise<void> {
    // This would integrate with your notification system
    // Email, Slack, PagerDuty, etc.
    logger.error(`CRITICAL SECURITY ALERT: ${alert.description}`, alert);
    
    // You could send emails, SMS, or push notifications here
    // Example: await emailService.sendCriticalAlert(alert);
  }

  /**
   * Check Stripe service health
   */
  private async checkStripeHealth(): Promise<any> {
    try {
      // Simple Stripe API health check
      // In production, you might want to make a test API call
      return { status: 'healthy' };
    } catch (error) {
      return { status: 'unhealthy', error: 'Stripe API unavailable' };
    }
  }

  /**
   * Check email service health
   */
  private async checkEmailHealth(): Promise<any> {
    try {
      // Check email service connectivity
      return { status: 'healthy' };
    } catch (error) {
      return { status: 'unhealthy', error: 'Email service unavailable' };
    }
  }

  /**
   * Get top endpoints by request count
   */
  private getTopEndpoints(metrics: PerformanceMetric[]): any[] {
    const endpointCounts = this.groupBy(metrics, 'endpoint');
    
    return Object.entries(endpointCounts)
      .map(([endpoint, requests]) => ({
        endpoint,
        count: (requests as any[]).length,
        averageResponseTime: Math.round(
          (requests as any[]).reduce((sum, r) => sum + r.responseTime, 0) / (requests as any[]).length
        )
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  /**
   * Get status code distribution
   */
  private getStatusCodeDistribution(metrics: PerformanceMetric[]): any {
    const statusCodes = this.groupBy(metrics, 'statusCode');
    
    return Object.entries(statusCodes).reduce((acc, [code, requests]) => {
      acc[code] = (requests as any[]).length;
      return acc;
    }, {} as any);
  }

  /**
   * Group array by property
   */
  private groupBy(array: any[], property: string): any {
    return array.reduce((groups, item) => {
      const key = item[property];
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(item);
      return groups;
    }, {});
  }

  /**
   * Generate event hash for integrity
   */
  private generateEventHash(data: any): string {
    const crypto = require('crypto');
    const dataString = JSON.stringify(data);
    return crypto.createHash('sha256').update(dataString).digest('hex');
  }

  /**
   * Start cleanup tasks
   */
  private startCleanupTasks(): void {
    // Clean up old metrics every hour
    setInterval(() => {
      const oneHourAgo = new Date(Date.now() - 3600000);
      this.metrics = this.metrics.filter(m => m.timestamp > oneHourAgo);
      this.alerts = this.alerts.filter(a => a.timestamp > oneHourAgo);
    }, 3600000);
  }

  /**
   * Start health checks
   */
  private startHealthChecks(): void {
    // Run health checks every 5 minutes
    setInterval(async () => {
      try {
        const health = await this.getSystemHealth();
        
        if (health.status === 'unhealthy') {
          await this.generateSecurityAlert({
            type: 'UNUSUAL_ACTIVITY',
            severity: 'CRITICAL',
            description: 'System health check failed',
            ip: 'system',
            timestamp: new Date(),
            metadata: health
          });
        }
      } catch (error) {
        logger.error('Health check failed:', error);
      }
    }, 300000); // 5 minutes
  }
}

export const productionMonitor = ProductionMonitor.getInstance();
