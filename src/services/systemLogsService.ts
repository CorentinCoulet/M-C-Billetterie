import { createHash } from 'crypto';
import { prisma } from '../lib/prisma';

/**
 * System Logs Service
 * Handles system logging, activity tracking and audit operations
 */
export class SystemLogsService {
  /**
   * Log system activity
   */
  async logSystemActivity(data: {
    action: string;
    userId?: string;
    details?: any;
    ip?: string;
    userAgent?: string;
    level?: 'low' | 'medium' | 'high' | 'critical';
    resourceType?: string;
    resourceId?: string;
    result?: 'success' | 'failure' | 'error';
  }): Promise<void> {
    try {
      // Store in database audit log
      await prisma.auditLog.create({
        data: {
          action: data.action,
          resourceType: data.resourceType || 'system',
          resourceId: data.resourceId,
          userId: data.userId,
          userEmail: data.userId ? (await prisma.user.findUnique({ 
            where: { id: data.userId }, 
            select: { email: true } 
          }))?.email : undefined,
          ipAddress: data.ip || 'unknown',
          userAgent: data.userAgent,
          details: data.details ? JSON.stringify(data.details) : null,
          riskLevel: data.level || 'low',
          result: data.result || 'success',
          timestamp: new Date(),
          eventHash: this.generateEventHash(data.action, data.userId, data.ip),
          isSensitive: data.level === 'high' || data.level === 'critical'
        }
      });

      // Also log to application logs for immediate debugging
      const logMessage = `[${data.level?.toUpperCase() || 'LOW'}] ${data.action} - User: ${data.userId || 'Anonymous'} - IP: ${data.ip || 'Unknown'}`;
      console.log(logMessage, data.details);
      
    } catch (error) {
      console.error('Failed to log system activity:', error);
      // Don't throw error to avoid breaking main application flow
    }
  }

  /**
   * Generate event hash for integrity verification
   */
  private generateEventHash(action: string, userId?: string, ip?: string): string {
    const data = `${action}:${userId || 'anonymous'}:${ip || 'unknown'}:${Date.now()}`;
    return createHash('sha256').update(data).digest('hex');
  }

  /**
   * Get system logs with pagination and filtering
   */
  async getSystemLogs(params: {
    page?: number;
    limit?: number;
    userId?: string;
    action?: string;
    riskLevel?: string;
    startDate?: Date;
    endDate?: Date;
    search?: string;
  } = {}): Promise<{
    logs: Array<{
      id: string;
      action: string;
      userId: string | null;
      userEmail?: string | null;
      details: any;
      ipAddress: string;
      userAgent: string | null;
      riskLevel: string;
      result: string;
      timestamp: Date;
      resourceType: string;
      resourceId: string | null;
    }>;
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    const { 
      page = 1, 
      limit = 50, 
      userId, 
      action, 
      riskLevel, 
      startDate, 
      endDate, 
      search 
    } = params;
    
    const skip = (page - 1) * limit;
    const where: any = {};

    // Build filter conditions
    if (userId) {
      where.userId = userId;
    }

    if (action) {
      where.action = { contains: action, mode: 'insensitive' };
    }

    if (riskLevel) {
      where.riskLevel = riskLevel;
    }

    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = startDate;
      if (endDate) where.timestamp.lte = endDate;
    }

    if (search) {
      where.OR = [
        { action: { contains: search, mode: 'insensitive' } },
        { ipAddress: { contains: search, mode: 'insensitive' } },
        { userAgent: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          User: {
            select: {
              name: true,
              email: true
            }
          }
        },
        orderBy: { timestamp: 'desc' },
        skip,
        take: limit
      }),
      prisma.auditLog.count({ where })
    ]);

    return {
      logs: logs.map(log => ({
        id: log.id,
        action: log.action,
        userId: log.userId,
        userEmail: log.userEmail,
        details: log.details ? JSON.parse(log.details) : null,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        riskLevel: log.riskLevel,
        result: log.result,
        timestamp: log.timestamp,
        resourceType: log.resourceType,
        resourceId: log.resourceId
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get system activity statistics
   */
  async getSystemActivityStats(): Promise<{
    totalLogs: number;
    todayLogs: number;
    logsByRiskLevel: {
      riskLevel: string;
      count: number;
    }[];
    topActions: {
      action: string;
      count: number;
    }[];
    activeUsers: {
      userId: string;
      userEmail: string | null;
      actionCount: number;
    }[];
    activityOverTime: {
      date: string;
      count: number;
    }[];
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [
      totalLogs,
      todayLogs,
      recentActivity
    ] = await Promise.all([
      prisma.auditLog.count(),
      prisma.auditLog.count({
        where: {
          timestamp: { gte: today }
        }
      }),
      prisma.auditLog.findMany({
        where: {
          timestamp: { gte: sevenDaysAgo }
        },
        select: {
          timestamp: true,
          riskLevel: true,
          action: true,
          userId: true,
          userEmail: true
        },
        orderBy: { timestamp: 'asc' }
      })
    ]);

    // Process logs by risk level
    const riskLevelCounts: Record<string, number> = {};
    const actionCounts: Record<string, number> = {};
    const userActivityCounts: Record<string, number> = {};

    recentActivity.forEach(log => {
      // Count by risk level
      riskLevelCounts[log.riskLevel] = (riskLevelCounts[log.riskLevel] || 0) + 1;
      
      // Count by action (all time data)
      actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
      
      // Count by user
      if (log.userId) {
        userActivityCounts[log.userId] = (userActivityCounts[log.userId] || 0) + 1;
      }
    });

    // Get top actions
    const topActions = Object.entries(actionCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([action, count]) => ({ action, count }));

    // Get active users
    const topUserIds = Object.entries(userActivityCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);

    const activeUsers = topUserIds.map(([userId, count]) => {
      const userLog = recentActivity.find(log => log.userId === userId);
      return {
        userId,
        userEmail: userLog?.userEmail || null,
        actionCount: count
      };
    });

    // Process activity over time (last 7 days)
    const activityByDay: Record<string, number> = {};
    const last7Days = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      last7Days.push(dateKey);
      activityByDay[dateKey] = 0;
    }

    recentActivity.forEach(activity => {
      const dateKey = activity.timestamp.toISOString().split('T')[0];
      if (activityByDay[dateKey] !== undefined) {
        activityByDay[dateKey]++;
      }
    });

    return {
      totalLogs,
      todayLogs,
      logsByRiskLevel: Object.entries(riskLevelCounts).map(([riskLevel, count]) => ({
        riskLevel,
        count
      })),
      topActions,
      activeUsers,
      activityOverTime: last7Days.map(date => ({
        date,
        count: activityByDay[date]
      }))
    };
  }

  /**
   * Log security event
   */
  async logSecurityEvent(data: {
    event: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    userId?: string;
    ip?: string;
    details?: any;
    blocked?: boolean;
  }): Promise<void> {
    await this.logSystemActivity({
      action: `SECURITY_${data.event.toUpperCase()}`,
      userId: data.userId,
      ip: data.ip,
      level: data.severity,
      resourceType: 'security',
      result: data.blocked ? 'failure' : 'success',
      details: {
        ...data.details,
        securityEvent: true,
        severity: data.severity,
        blocked: data.blocked || false
      }
    });
  }

  /**
   * Log user action
   */
  async logUserAction(data: {
    userId: string;
    action: string;
    resourceType?: string;
    resourceId?: string;
    ip?: string;
    userAgent?: string;
    success?: boolean;
    details?: any;
  }): Promise<void> {
    await this.logSystemActivity({
      action: `USER_${data.action.toUpperCase()}`,
      userId: data.userId,
      ip: data.ip,
      userAgent: data.userAgent,
      level: data.success === false ? 'medium' : 'low',
      resourceType: data.resourceType,
      resourceId: data.resourceId,
      result: data.success === false ? 'failure' : 'success',
      details: {
        ...data.details,
        success: data.success !== false
      }
    });
  }

  /**
   * Log admin action
   */
  async logAdminAction(data: {
    adminId: string;
    action: string;
    targetUserId?: string;
    targetResource?: string;
    ip?: string;
    details?: any;
  }): Promise<void> {
    await this.logSystemActivity({
      action: `ADMIN_${data.action.toUpperCase()}`,
      userId: data.adminId,
      ip: data.ip,
      level: 'medium',
      resourceType: data.targetResource || 'admin',
      resourceId: data.targetUserId,
      result: 'success',
      details: {
        ...data.details,
        adminAction: true,
        targetUserId: data.targetUserId,
        targetResource: data.targetResource
      }
    });
  }

  /**
   * Clean up old logs (retention policy)
   */
  async cleanupOldLogs(retentionDays: number = 90): Promise<{ deletedCount: number }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = await prisma.auditLog.deleteMany({
      where: {
        timestamp: {
          lt: cutoffDate
        },
        riskLevel: {
          not: 'critical' // Keep critical logs longer
        }
      }
    });

    await this.logSystemActivity({
      action: 'SYSTEM_LOG_CLEANUP',
      level: 'low',
      resourceType: 'system',
      result: 'success',
      details: {
        retentionDays,
        deletedCount: result.count,
        cutoffDate
      }
    });

    return { deletedCount: result.count };
  }

  /**
   * Export logs for analysis or compliance
   */
  async exportLogs(params: {
    startDate: Date;
    endDate: Date;
    format?: 'json' | 'csv';
    userId?: string;
    riskLevel?: string;
  }): Promise<{
    data: any[];
    count: number;
    format: string;
  }> {
    const where: any = {
      timestamp: {
        gte: params.startDate,
        lte: params.endDate
      }
    };

    if (params.userId) where.userId = params.userId;
    if (params.riskLevel) where.riskLevel = params.riskLevel;

    const logs = await prisma.auditLog.findMany({
      where,
      include: {
        User: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: { timestamp: 'desc' }
    });

    const exportData = logs.map(log => ({
      timestamp: log.timestamp.toISOString(),
      riskLevel: log.riskLevel,
      result: log.result,
      action: log.action,
      userId: log.userId,
      userEmail: log.userEmail,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      resourceType: log.resourceType,
      resourceId: log.resourceId,
      details: log.details
    }));

    // Log the export action
    await this.logSystemActivity({
      action: 'SYSTEM_LOG_EXPORT',
      level: 'low',
      resourceType: 'system',
      result: 'success',
      details: {
        exportParams: params,
        recordCount: exportData.length
      }
    });

    return {
      data: exportData,
      count: exportData.length,
      format: params.format || 'json'
    };
  }
}

// Export singleton instance
export const systemLogsService = new SystemLogsService();
export default systemLogsService;
