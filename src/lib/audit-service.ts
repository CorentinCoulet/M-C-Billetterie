import crypto from 'crypto';
import prisma from './prisma';
import { AUDIT_CONFIG } from './security-config';

export interface AuditEvent {
  action: string;
  resourceType: string;
  resourceId?: string;
  userId?: string;
  userEmail?: string;
  ipAddress: string;
  userAgent?: string;
  details?: Record<string, any>;
  timestamp?: Date;
  sessionId?: string;
  result: 'success' | 'failure' | 'error';
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface AuditFilter {
  action?: string;
  resourceType?: string;
  userId?: string;
  ipAddress?: string;
  riskLevel?: string;
  dateFrom?: Date;
  dateTo?: Date;
  result?: 'success' | 'failure' | 'error';
}

export class AuditService {
  /**
   * Log an audit event
   */
  static async logEvent(event: AuditEvent): Promise<void> {
    try {
      // Determine if this is a sensitive operation
      const isSensitive = AUDIT_CONFIG.SENSITIVE_OPERATIONS.includes(event.action) ||
                         event.riskLevel === 'high' || 
                         event.riskLevel === 'critical';

      // Only log if configured to do so
      if (!AUDIT_CONFIG.LOG_ALL_REQUESTS && !isSensitive) {
        return;
      }

      // Generate event hash for integrity
      const eventHash = this.generateEventHash(event);

      await prisma.auditLog.create({
        data: {
          id: crypto.randomUUID(),
          action: event.action,
          resourceType: event.resourceType,
          resourceId: event.resourceId,
          userId: event.userId,
          userEmail: event.userEmail,
          ipAddress: event.ipAddress,
          userAgent: event.userAgent,
          details: event.details ? JSON.stringify(event.details) : null,
          timestamp: event.timestamp || new Date(),
          sessionId: event.sessionId,
          result: event.result,
          riskLevel: event.riskLevel,
          eventHash,
          isSensitive,
        }
      });

      // Log critical events to external service (e.g., SIEM)
      if (event.riskLevel === 'critical') {
        await this.logToCriticalAlerts(event);
      }

    } catch (error) {
      console.error('Failed to log audit event:', error);
      // Don't throw to avoid breaking the main application flow
    }
  }

  /**
   * Specific logging methods for different types of events
   */
  static async logAuthentication(
    action: 'login' | 'logout' | 'login_failed' | 'password_change' | 'mfa_enabled' | 'mfa_disabled',
    userId: string | null,
    userEmail: string,
    ipAddress: string,
    userAgent?: string,
    details?: Record<string, any>
  ): Promise<void> {
    const riskLevel = action === 'login_failed' ? 'medium' : 
                     action.includes('mfa') ? 'high' : 'low';

    await this.logEvent({
      action: `auth.${action}`,
      resourceType: 'user',
      resourceId: userId || undefined,
      userId: userId || undefined,
      userEmail,
      ipAddress,
      userAgent,
      details,
      result: action === 'login_failed' ? 'failure' : 'success',
      riskLevel
    });
  }

  static async logPayment(
    action: 'create' | 'confirm' | 'refund' | 'failed',
    paymentId: string,
    userId: string,
    amount: number,
    ipAddress: string,
    details?: Record<string, any>
  ): Promise<void> {
    await this.logEvent({
      action: `payment.${action}`,
      resourceType: 'payment',
      resourceId: paymentId,
      userId,
      ipAddress,
      details: { amount, ...details },
      result: action === 'failed' ? 'failure' : 'success',
      riskLevel: action === 'refund' ? 'high' : 'medium'
    });
  }

  static async logDataAccess(
    action: 'read' | 'export' | 'delete' | 'anonymize',
    resourceType: string,
    resourceId: string,
    userId: string,
    ipAddress: string,
    details?: Record<string, any>
  ): Promise<void> {
    const riskLevel = action === 'delete' || action === 'anonymize' ? 'high' : 'low';

    await this.logEvent({
      action: `data.${action}`,
      resourceType,
      resourceId,
      userId,
      ipAddress,
      details,
      result: 'success',
      riskLevel
    });
  }

  static async logAdminAction(
    action: string,
    targetUserId: string,
    adminUserId: string,
    ipAddress: string,
    details?: Record<string, any>
  ): Promise<void> {
    await this.logEvent({
      action: `admin.${action}`,
      resourceType: 'user',
      resourceId: targetUserId,
      userId: adminUserId,
      ipAddress,
      details,
      result: 'success',
      riskLevel: 'critical'
    });
  }

  static async logSecurityEvent(
    action: 'suspicious_activity' | 'brute_force' | 'ip_blocked' | 'sql_injection_attempt',
    ipAddress: string,
    userAgent?: string,
    details?: Record<string, any>
  ): Promise<void> {
    await this.logEvent({
      action: `security.${action}`,
      resourceType: 'system',
      ipAddress,
      userAgent,
      details,
      result: 'success',
      riskLevel: 'critical'
    });
  }

  /**
   * Query audit logs with filtering
   */
  static async queryLogs(
    filter: AuditFilter,
    limit: number = 100,
    offset: number = 0
  ): Promise<{ logs: any[]; total: number }> {
    try {
      const where: any = {};

      if (filter.action) where.action = { contains: filter.action };
      if (filter.resourceType) where.resourceType = filter.resourceType;
      if (filter.userId) where.userId = filter.userId;
      if (filter.ipAddress) where.ipAddress = filter.ipAddress;
      if (filter.riskLevel) where.riskLevel = filter.riskLevel;
      if (filter.result) where.result = filter.result;
      
      if (filter.dateFrom || filter.dateTo) {
        where.timestamp = {};
        if (filter.dateFrom) where.timestamp.gte = filter.dateFrom;
        if (filter.dateTo) where.timestamp.lte = filter.dateTo;
      }

      const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          orderBy: { timestamp: 'desc' },
          take: limit,
          skip: offset,
        }),
        prisma.auditLog.count({ where })
      ]);

      return { logs, total };
    } catch (error) {
      console.error('Error querying audit logs:', error);
      return { logs: [], total: 0 };
    }
  }

  /**
   * Get audit statistics for dashboard
   */
  static async getAuditStats(days: number = 30): Promise<{
    totalEvents: number;
    criticalEvents: number;
    failedEvents: number;
    topActions: Array<{ action: string; count: number }>;
    topIPs: Array<{ ipAddress: string; count: number }>;
    dailyStats: Array<{ date: string; count: number }>;
  }> {
    try {
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const [
        totalEvents,
        criticalEvents,
        failedEvents,
        topActions,
        topIPs
      ] = await Promise.all([
        // Total events
        prisma.auditLog.count({
          where: { timestamp: { gte: since } }
        }),

        // Critical events
        prisma.auditLog.count({
          where: { 
            timestamp: { gte: since },
            riskLevel: 'critical'
          }
        }),

        // Failed events
        prisma.auditLog.count({
          where: { 
            timestamp: { gte: since },
            result: 'failure'
          }
        }),

        // Top actions
        prisma.auditLog.groupBy({
          by: ['action'],
          where: { timestamp: { gte: since } },
          _count: { action: true },
          orderBy: { _count: { action: 'desc' } },
          take: 10
        }),

        // Top IPs
        prisma.auditLog.groupBy({
          by: ['ipAddress'],
          where: { timestamp: { gte: since } },
          _count: { ipAddress: true },
          orderBy: { _count: { ipAddress: 'desc' } },
          take: 10
        })
      ]);

      return {
        totalEvents,
        criticalEvents,
        failedEvents,
        topActions: topActions.map((item: any) => ({
          action: item.action,
          count: item._count.action
        })),
        topIPs: topIPs.map((item: any) => ({
          ipAddress: item.ipAddress,
          count: item._count.ipAddress
        })),
        dailyStats: [] // Would need more complex query for daily breakdown
      };
    } catch (error) {
      console.error('Error getting audit stats:', error);
      return {
        totalEvents: 0,
        criticalEvents: 0,
        failedEvents: 0,
        topActions: [],
        topIPs: [],
        dailyStats: []
      };
    }
  }

  /**
   * Clean up old audit logs based on retention policy
   */
  static async cleanupOldLogs(): Promise<number> {
    try {
      const retentionDate = new Date(Date.now() - AUDIT_CONFIG.RETENTION_DAYS * 24 * 60 * 60 * 1000);
      
      const result = await prisma.auditLog.deleteMany({
        where: {
          timestamp: { lt: retentionDate },
          isSensitive: false // Never delete sensitive logs automatically
        }
      });

      return result.count;
    } catch (error) {
      console.error('Error cleaning up audit logs:', error);
      return 0;
    }
  }

  /**
   * Verify audit log integrity
   */
  static async verifyLogIntegrity(logId: string): Promise<boolean> {
    try {
      const log = await prisma.auditLog.findUnique({
        where: { id: logId }
      });

      if (!log) return false;

      const expectedHash = this.generateEventHash({
        action: log.action,
        resourceType: log.resourceType,
        resourceId: log.resourceId || undefined,
        userId: log.userId || undefined,
        userEmail: log.userEmail || undefined,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent || undefined,
        details: log.details ? JSON.parse(log.details) : undefined,
        timestamp: log.timestamp,
        sessionId: log.sessionId || undefined,
        result: log.result as 'success' | 'failure' | 'error',
        riskLevel: log.riskLevel as 'low' | 'medium' | 'high' | 'critical'
      });

      return log.eventHash === expectedHash;
    } catch (error) {
      console.error('Error verifying log integrity:', error);
      return false;
    }
  }

  /**
   * Generate hash for event integrity
   */
  private static generateEventHash(event: AuditEvent): string {
    const data = JSON.stringify({
      action: event.action,
      resourceType: event.resourceType,
      resourceId: event.resourceId,
      userId: event.userId,
      timestamp: event.timestamp,
      result: event.result
    });

    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Send critical alerts to external monitoring
   */
  private static async logToCriticalAlerts(event: AuditEvent): Promise<void> {
    try {
      // In a real implementation, send to SIEM, Slack, email, etc.
      console.error('CRITICAL AUDIT EVENT:', {
        action: event.action,
        user: event.userEmail,
        ip: event.ipAddress,
        timestamp: event.timestamp,
        details: event.details
      });

      // Could integrate with services like:
      // - Sentry for error tracking
      // - Slack for immediate notifications
      // - Email for critical alerts
      // - External SIEM systems
    } catch (error) {
      console.error('Failed to send critical alert:', error);
    }
  }
}

export default AuditService;
