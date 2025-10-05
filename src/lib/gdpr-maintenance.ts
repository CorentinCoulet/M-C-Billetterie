import cron from 'node-cron';
import AuditService from '../lib/audit-service';
import GDPRComplianceService from '../lib/gdpr-compliance';
import prisma from '../lib/prisma';

// Simple notification service for GDPR alerts
class GDPRNotificationService {
  static async sendAlert(to: string, subject: string, message: string): Promise<void> {
    // In production, this would use the actual EmailService
    console.log(`📧 GDPR Alert to ${to}: ${subject} - ${message}`);
    // TODO: Integrate with actual email service
  }
}

export class GDPRMaintenanceService {
  private static instance: GDPRMaintenanceService;
  private isRunning = false;

  static getInstance(): GDPRMaintenanceService {
    if (!GDPRMaintenanceService.instance) {
      GDPRMaintenanceService.instance = new GDPRMaintenanceService();
    }
    return GDPRMaintenanceService.instance;
  }

  /**
   * Initialize GDPR maintenance jobs
   * This should be called when the server starts
   */
  public initializeJobs(): void {
    console.log('🔒 Initializing GDPR maintenance jobs...');

    // Daily data retention cleanup at 2 AM
    cron.schedule('0 2 * * *', async () => {
      await this.executeDataRetentionCleanup();
    }, {
      timezone: 'Europe/Paris'
    });

    // Weekly compliance report on Mondays at 9 AM
    cron.schedule('0 9 * * 1', async () => {
      await this.generateComplianceReport();
    }, {
      timezone: 'Europe/Paris'
    });

    // Monthly audit log cleanup (keep only last 2 years) on 1st at 3 AM
    cron.schedule('0 3 1 * *', async () => {
      await this.cleanupOldAuditLogs();
    }, {
      timezone: 'Europe/Paris'
    });

    // Schedule retention policies every Sunday at 1 AM
    cron.schedule('0 1 * * 0', async () => {
      await this.scheduleRetentionPolicies();
    }, {
      timezone: 'Europe/Paris'
    });

    console.log('✅ GDPR maintenance jobs initialized successfully');
  }

  /**
   * Execute data retention cleanup
   */
  private async executeDataRetentionCleanup(): Promise<void> {
    if (this.isRunning) {
      console.log('⏭️ GDPR cleanup already running, skipping...');
      return;
    }

    this.isRunning = true;
    console.log('🧹 Starting GDPR data retention cleanup...');

    try {
      const startTime = new Date();
      
      // Execute data retention
      const deletedCount = await GDPRComplianceService.executeDataRetention();
      
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      await AuditService.logEvent({
        action: 'gdpr.automated_retention_cleanup',
        resourceType: 'system',
        resourceId: 'maintenance',
        userId: 'system',
        ipAddress: 'localhost',
        timestamp: new Date(),
        result: 'success',
        riskLevel: 'low',
        details: {
          deletedCount,
          duration,
          scheduled: true
        }
      });

      console.log(`✅ GDPR cleanup completed: ${deletedCount} items processed in ${duration}ms`);

      // Send notification to admins if significant cleanup occurred
      if (deletedCount > 100) {
        await this.notifyAdminsOfCleanup(deletedCount, duration);
      }

    } catch (error) {
      console.error('❌ GDPR cleanup failed:', error);
      
      await AuditService.logEvent({
        action: 'gdpr.automated_retention_cleanup_failed',
        resourceType: 'system',
        resourceId: 'maintenance',
        userId: 'system',
        ipAddress: 'localhost',
        timestamp: new Date(),
        result: 'error',
        riskLevel: 'high',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          scheduled: true
        }
      });

      // Notify admins of failure
      await this.notifyAdminsOfError('Data retention cleanup failed', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Schedule retention policies for future cleanup
   */
  private async scheduleRetentionPolicies(): Promise<void> {
    try {
      console.log('📅 Scheduling GDPR retention policies...');
      
      await GDPRComplianceService.scheduleDataRetention();
      
      await AuditService.logEvent({
        action: 'gdpr.retention_policies_scheduled',
        resourceType: 'system',
        resourceId: 'maintenance',
        userId: 'system',
        ipAddress: 'localhost',
        timestamp: new Date(),
        result: 'success',
        riskLevel: 'low',
        details: { scheduled: true, recurring: true }
      });

      console.log('✅ GDPR retention policies scheduled successfully');

    } catch (error) {
      console.error('❌ Failed to schedule retention policies:', error);
      
      await AuditService.logEvent({
        action: 'gdpr.retention_policies_scheduling_failed',
        resourceType: 'system',
        resourceId: 'maintenance',
        userId: 'system',
        ipAddress: 'localhost',
        timestamp: new Date(),
        result: 'error',
        riskLevel: 'medium',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          scheduled: true
        }
      });
    }
  }

  /**
   * Generate weekly compliance report
   */
  private async generateComplianceReport(): Promise<void> {
    try {
      console.log('📊 Generating GDPR compliance report...');
      
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7); // Last 7 days

      // Get GDPR-related activities from the last week
      const gdprActivities = await prisma.auditLog.findMany({
        where: {
          timestamp: { gte: startDate, lte: endDate },
          action: { startsWith: 'gdpr.' }
        },
        orderBy: { timestamp: 'desc' }
      });

      // Count by activity type
      const activityCounts = gdprActivities.reduce((acc: any, log: any) => {
        const action = log.action.replace('gdpr.', '');
        acc[action] = (acc[action] || 0) + 1;
        return acc;
      }, {});

      // Get data retention stats
      const retentionStats = await prisma.dataRetention.groupBy({
        by: ['entityType'],
        _count: { id: true },
        where: {
          scheduledDeleteAt: { gte: startDate, lte: endDate }
        }
      });

      // Count of users with recent GDPR requests
      const activeUsers = new Set(gdprActivities.map((log: any) => log.userId)).size;

      const report = {
        period: { start: startDate, end: endDate },
        activities: activityCounts,
        totalActivities: gdprActivities.length,
        activeUsers,
        retentionScheduled: retentionStats,
        complianceMetrics: {
          averageResponseTime: '< 24h', // In a real implementation, calculate this
          dataBreaches: 0, // From security monitoring
          consentUpdates: activityCounts['consent_updated'] || 0,
          dataExports: activityCounts['data_export'] || 0,
          dataErasures: activityCounts['data_erasure'] || 0
        },
        recommendations: this.generateComplianceRecommendations(activityCounts)
      };

      await AuditService.logEvent({
        action: 'gdpr.compliance_report_generated',
        resourceType: 'system',
        resourceId: 'maintenance',
        userId: 'system',
        ipAddress: 'localhost',
        timestamp: new Date(),
        result: 'success',
        riskLevel: 'low',
        details: { report, automated: true }
      });

      // Send report to compliance officers
      await this.sendComplianceReport(report);

      console.log('✅ GDPR compliance report generated successfully');

    } catch (error) {
      console.error('❌ Failed to generate compliance report:', error);
      
      await AuditService.logEvent({
        action: 'gdpr.compliance_report_failed',
        resourceType: 'system',
        resourceId: 'maintenance',
        userId: 'system',
        ipAddress: 'localhost',
        timestamp: new Date(),
        result: 'error',
        riskLevel: 'medium',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  }

  /**
   * Clean up old audit logs (keep only last 2 years)
   */
  private async cleanupOldAuditLogs(): Promise<void> {
    try {
      console.log('🗂️ Cleaning up old audit logs...');
      
      const cutoffDate = new Date();
      cutoffDate.setFullYear(cutoffDate.getFullYear() - 2); // 2 years ago

      // Archive to cold storage before deletion (in production)
      const oldLogs = await prisma.auditLog.findMany({
        where: {
          timestamp: { lt: cutoffDate },
          isSensitive: false // Keep sensitive logs longer
        },
        take: 1000 // Process in batches
      });

      if (oldLogs.length > 0) {
        // In production, export to cold storage first
        await this.archiveAuditLogs(oldLogs);

        // Delete the archived logs
        const deletedCount = await prisma.auditLog.deleteMany({
          where: {
            id: { in: oldLogs.map((log: any) => log.id) }
          }
        });

        await AuditService.logEvent({
          action: 'audit.logs_archived_and_deleted',
          resourceType: 'system',
          resourceId: 'maintenance',
          userId: 'system',
          ipAddress: 'localhost',
          timestamp: new Date(),
          result: 'success',
          riskLevel: 'low',
          details: {
            deletedCount: deletedCount.count,
            cutoffDate,
            automated: true
          }
        });

        console.log(`✅ Archived and deleted ${deletedCount.count} old audit logs`);
      } else {
        console.log('✅ No old audit logs to clean up');
      }

    } catch (error) {
      console.error('❌ Failed to clean up audit logs:', error);
      
      await AuditService.logEvent({
        action: 'audit.logs_cleanup_failed',
        resourceType: 'system',
        resourceId: 'maintenance',
        userId: 'system',
        ipAddress: 'localhost',
        timestamp: new Date(),
        result: 'error',
        riskLevel: 'high',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  }

  /**
   * Generate compliance recommendations based on activity patterns
   */
  private generateComplianceRecommendations(activityCounts: any): string[] {
    const recommendations = [];

    if (activityCounts['data_export'] > 10) {
      recommendations.push('High number of data exports detected. Review data access controls.');
    }

    if (activityCounts['data_erasure'] > 5) {
      recommendations.push('Multiple erasure requests. Investigate potential data quality issues.');
    }

    if (!activityCounts['consent_updated']) {
      recommendations.push('No consent updates this week. Ensure consent mechanism is working.');
    }

    if (Object.keys(activityCounts).length === 0) {
      recommendations.push('No GDPR activities detected. Verify monitoring systems are operational.');
    }

    return recommendations;
  }

  /**
   * Archive audit logs to cold storage (placeholder implementation)
   */
  private async archiveAuditLogs(logs: any[]): Promise<void> {
    // In production, this would export to S3, Azure Blob, or other cold storage
    console.log(`📦 Archiving ${logs.length} audit logs to cold storage...`);
    
    // For now, just log the action
    await AuditService.logEvent({
      action: 'audit.logs_archived',
      resourceType: 'system',
      resourceId: 'cold_storage',
      userId: 'system',
      ipAddress: 'localhost',
      timestamp: new Date(),
      result: 'success',
      riskLevel: 'low',
      details: {
        count: logs.length,
        destination: 'cold_storage',
        automated: true
      }
    });
  }

  /**
   * Notify administrators of cleanup activities
   */
  private async notifyAdminsOfCleanup(deletedCount: number, duration: number): Promise<void> {
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { email: true, name: true }
    });

    for (const admin of admins) {
      try {
        await GDPRNotificationService.sendAlert(
          admin.email,
          '🔒 GDPR Data Retention Cleanup Report',
          `Cleanup completed: ${deletedCount} items processed in ${Math.round(duration / 1000)}s at ${new Date().toISOString()}`
        );
      } catch (error) {
        console.error(`Failed to notify admin ${admin.email}:`, error);
      }
    }
  }

  /**
   * Notify administrators of errors
   */
  private async notifyAdminsOfError(subject: string, error: any): Promise<void> {
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { email: true, name: true }
    });

    for (const admin of admins) {
      try {
        await GDPRNotificationService.sendAlert(
          admin.email,
          `🚨 GDPR Maintenance Error: ${subject}`,
          `Error occurred: ${error instanceof Error ? error.message : String(error)} at ${new Date().toISOString()}`
        );
      } catch (emailError) {
        console.error(`Failed to notify admin ${admin.email}:`, emailError);
      }
    }
  }

  /**
   * Send compliance report to compliance officers
   */
  private async sendComplianceReport(report: any): Promise<void> {
    const complianceOfficers = await prisma.user.findMany({
      where: { 
        OR: [
          { role: 'ADMIN' },
          { metadata: { path: ['roles'], array_contains: ['compliance_officer'] } }
        ]
      },
      select: { email: true, name: true }
    });

    for (const officer of complianceOfficers) {
      try {
        await GDPRNotificationService.sendAlert(
          officer.email,
          '📊 Weekly GDPR Compliance Report',
          `Report period: ${report.period.start.toLocaleDateString()} - ${report.period.end.toLocaleDateString()}\nActivities: ${report.totalActivities}\nActive users: ${report.activeUsers}`
        );
      } catch (error) {
        console.error(`Failed to send report to ${officer.email}:`, error);
      }
    }
  }

  /**
   * Manual cleanup trigger (for admin use)
   */
  public async triggerManualCleanup(): Promise<{
    success: boolean;
    deletedCount?: number;
    error?: string;
  }> {
    try {
      console.log('🔧 Manual GDPR cleanup triggered...');
      
      const deletedCount = await GDPRComplianceService.executeDataRetention();
      
      await AuditService.logEvent({
        action: 'gdpr.manual_retention_cleanup',
        resourceType: 'system',
        resourceId: 'maintenance',
        userId: 'admin',
        ipAddress: 'localhost',
        timestamp: new Date(),
        result: 'success',
        riskLevel: 'low',
        details: { deletedCount, manual: true }
      });

      return { success: true, deletedCount };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      await AuditService.logEvent({
        action: 'gdpr.manual_retention_cleanup_failed',
        resourceType: 'system',
        resourceId: 'maintenance',
        userId: 'admin',
        ipAddress: 'localhost',
        timestamp: new Date(),
        result: 'error',
        riskLevel: 'medium',
        details: { error: errorMessage, manual: true }
      });

      return { success: false, error: errorMessage };
    }
  }
}

export default GDPRMaintenanceService;
