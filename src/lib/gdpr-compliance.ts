import crypto from 'crypto';
import { Prisma } from '../generated/prisma';
import AuditService from './audit-service';
import DataEncryptionService from './data-encryption';
import prisma from './prisma';

export interface GDPRRequest {
  userId: string;
  requestType: 'access' | 'rectification' | 'erasure' | 'portability' | 'restriction' | 'objection';
  requestedBy: string; // User ID of requester
  requestedAt: Date;
  reason?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'rejected';
  completedAt?: Date;
  data?: any;
}

export interface DataExportResult {
  personalData: any;
  auditTrail: any[];
  metadata: {
    exportDate: Date;
    dataTypes: string[];
    retention: { [key: string]: Date };
    checksum: string;
  };
}

export interface AnonymizationResult {
  affectedTables: string[];
  recordsProcessed: number;
  anonymizationDate: Date;
  verificationHash: string;
}

export class GDPRComplianceService {
  /**
   * Handle GDPR data access request (Article 15)
   * User has the right to obtain confirmation and access to their personal data
   */
  static async handleAccessRequest(userId: string, requestedBy: string): Promise<DataExportResult> {
    try {
      // Log the request
      await AuditService.logDataAccess('export', 'user', userId, requestedBy, '0.0.0.0', {
        gdprRequest: 'access_request',
        article: 'Article 15'
      });

      // Collect all personal data
      const personalData = await this.collectPersonalData(userId);
      
      // Get audit trail for this user
      const auditTrail = await this.getAuditTrail(userId);
      
      // Calculate checksum for data integrity
      const dataString = JSON.stringify({ personalData, auditTrail });
      const checksum = crypto.createHash('sha256').update(dataString).digest('hex');
      
      const result: DataExportResult = {
        personalData,
        auditTrail,
        metadata: {
          exportDate: new Date(),
          dataTypes: Object.keys(personalData),
          retention: await this.getDataRetentionInfo(userId),
          checksum
        }
      };

      // Store the request record
      await this.createGDPRRequest({
        userId,
        requestType: 'access',
        requestedBy,
        requestedAt: new Date(),
        status: 'completed',
        completedAt: new Date(),
        data: { exportSize: JSON.stringify(result).length }
      });

      return result;
    } catch (error) {
      console.error('GDPR access request error:', error);
      throw new Error('Failed to process access request');
    }
  }

  /**
   * Handle right to rectification (Article 16)
   * User has the right to have inaccurate personal data corrected
   */
  static async handleRectificationRequest(
    userId: string, 
    requestedBy: string, 
    corrections: Record<string, any>,
    reason: string
  ): Promise<boolean> {
    try {
      // Verify the requester has the right to make corrections
      if (userId !== requestedBy) {
        const requester = await prisma.user.findUnique({ where: { id: requestedBy } });
        if (!requester || requester.role !== 'ADMIN') {
          throw new Error('Insufficient permissions for rectification');
        }
      }

      // Get original data for audit
      const originalData = await prisma.user.findUnique({
        where: { id: userId },
        select: Object.keys(corrections).reduce((acc, key) => ({ ...acc, [key]: true }), {})
      });

      // Apply corrections
      await prisma.user.update({
        where: { id: userId },
        data: corrections
      });

      // Log the rectification
      await AuditService.logDataAccess('export', 'user', userId, requestedBy, '0.0.0.0', {
        gdprRequest: 'rectification',
        article: 'Article 16',
        originalData,
        corrections,
        reason
      });

      // Store the request record
      await this.createGDPRRequest({
        userId,
        requestType: 'rectification',
        requestedBy,
        requestedAt: new Date(),
        status: 'completed',
        completedAt: new Date(),
        reason,
        data: { corrections, originalData }
      });

      return true;
    } catch (error) {
      console.error('GDPR rectification error:', error);
      throw new Error('Failed to process rectification request');
    }
  }

  /**
   * Handle right to erasure/Right to be forgotten (Article 17)
   * User has the right to have their personal data erased
   */
  static async handleErasureRequest(
    userId: string, 
    requestedBy: string, 
    reason: string,
    softDelete: boolean = true
  ): Promise<AnonymizationResult> {
    try {
      // Verify the requester has the right to request erasure
      if (userId !== requestedBy) {
        const requester = await prisma.user.findUnique({ where: { id: requestedBy } });
        if (!requester || requester.role !== 'ADMIN') {
          throw new Error('Insufficient permissions for erasure');
        }
      }

      // Check if there are legal reasons to retain the data
      const retentionCheck = await this.checkLegalRetentionRequirements(userId);
      if (retentionCheck.mustRetain) {
        throw new Error(`Cannot erase data: ${retentionCheck.reason}`);
      }

      let result: AnonymizationResult;

      if (softDelete) {
        // Anonymize instead of delete (recommended for audit trail)
        result = await this.anonymizeUserData(userId);
      } else {
        // Hard delete (use with caution)
        result = await this.hardDeleteUserData(userId);
      }

      // Log the erasure
      await AuditService.logDataAccess(softDelete ? 'anonymize' : 'delete', 'user', userId, requestedBy, '0.0.0.0', {
        gdprRequest: 'erasure',
        article: 'Article 17',
        reason,
        method: softDelete ? 'anonymization' : 'hard_delete',
        result
      });

      // Store the request record
      await this.createGDPRRequest({
        userId,
        requestType: 'erasure',
        requestedBy,
        requestedAt: new Date(),
        status: 'completed',
        completedAt: new Date(),
        reason,
        data: result
      });

      return result;
    } catch (error) {
      console.error('GDPR erasure error:', error);
      throw new Error('Failed to process erasure request');
    }
  }

  /**
   * Handle data portability request (Article 20)
   * User has the right to receive their data in a structured, commonly used format
   */
  static async handlePortabilityRequest(
    userId: string, 
    requestedBy: string, 
    format: 'json' | 'csv' | 'xml' = 'json'
  ): Promise<{ data: string; mimeType: string; filename: string }> {
    try {
      // Collect portable data (only data provided by user, not derived data)
      const portableData = await this.collectPortableData(userId);
      
      let formattedData: string;
      let mimeType: string;
      let filename: string;

      switch (format) {
        case 'json':
          formattedData = JSON.stringify(portableData, null, 2);
          mimeType = 'application/json';
          filename = `user_data_${userId}_${Date.now()}.json`;
          break;
        case 'csv':
          formattedData = this.convertToCSV(portableData);
          mimeType = 'text/csv';
          filename = `user_data_${userId}_${Date.now()}.csv`;
          break;
        case 'xml':
          formattedData = this.convertToXML(portableData);
          mimeType = 'application/xml';
          filename = `user_data_${userId}_${Date.now()}.xml`;
          break;
        default:
          throw new Error('Unsupported export format');
      }

      // Log the portability request
      await AuditService.logDataAccess('export', 'user', userId, requestedBy, '0.0.0.0', {
        gdprRequest: 'portability',
        article: 'Article 20',
        format,
        dataSize: formattedData.length
      });

      // Store the request record
      await this.createGDPRRequest({
        userId,
        requestType: 'portability',
        requestedBy,
        requestedAt: new Date(),
        status: 'completed',
        completedAt: new Date(),
        data: { format, size: formattedData.length }
      });

      return { data: formattedData, mimeType, filename };
    } catch (error) {
      console.error('GDPR portability error:', error);
      throw new Error('Failed to process portability request');
    }
  }

  /**
   * Collect all personal data for a user
   */
  private static async collectPersonalData(userId: string): Promise<any> {
    const [user, orders, tickets, sessions, auditLogs] = await Promise.all([
      // Basic user data
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          isVerified: true,
          lastLogin: true,
          role: true,
          createdAt: true,
          updatedAt: true,
          metadata: true
        }
      }),
      
      // Order history
      prisma.order.findMany({
        where: { userId },
        include: {
          tickets: true,
          payment: true
        }
      }),
      
      // Tickets
      prisma.ticket.findMany({
        where: { userId },
        include: {
          event: {
            select: { title: true, date: true, location: true }
          }
        }
      }),
      
      // Session history (last 90 days)
      prisma.userSession.findMany({
        where: {
          userId,
          createdAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) }
        },
        select: {
          id: true,
          ipAddress: true,
          userAgent: true,
          createdAt: true,
          lastActivityAt: true,
          isActive: true
        }
      }),
      
      // Audit logs related to this user
      prisma.auditLog.findMany({
        where: { userId },
        orderBy: { timestamp: 'desc' },
        take: 1000 // Limit to last 1000 entries
      })
    ]);

    return {
      profile: user ? DataEncryptionService.decryptPII(user) : null,
      orders: orders?.map((order: any) => DataEncryptionService.decryptPII(order)),
      tickets: tickets?.map((ticket: any) => DataEncryptionService.decryptPII(ticket)),
      sessions,
      auditLogs: auditLogs?.slice(0, 100) // Limit audit logs in export
    };
  }

  /**
   * Collect data for portability (only user-provided data)
   */
  private static async collectPortableData(userId: string): Promise<any> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        name: true,
        createdAt: true,
        metadata: true
      }
    });

    const orders = await prisma.order.findMany({
      where: { userId },
      select: {
        id: true,
        totalPrice: true,
        status: true,
        createdAt: true,
        tickets: {
          select: {
            id: true,
            status: true,
            purchasedAt: true,
            event: {
              select: { title: true, date: true, location: true }
            }
          }
        }
      }
    });

    return {
      personalInformation: user ? DataEncryptionService.decryptPII(user) : null,
      purchaseHistory: orders?.map((order: any) => DataEncryptionService.decryptPII(order))
    };
  }

  /**
   * Anonymize user data (recommended over hard delete)
   */
  private static async anonymizeUserData(userId: string): Promise<AnonymizationResult> {
    const affectedTables: string[] = [];
    let recordsProcessed = 0;

    // Anonymize user profile
    await prisma.user.update({
      where: { id: userId },
      data: {
        email: `anonymous_${crypto.randomUUID()}@anonymized.local`,
        name: 'Anonymized User',
        password: crypto.randomBytes(32).toString('hex'),
        metadata: Prisma.JsonNull
      }
    });
    affectedTables.push('users');
    recordsProcessed++;

    // Anonymize order data
    const orders = await prisma.order.updateMany({
      where: { userId },
      data: {
        metadata: Prisma.JsonNull
      }
    });
    if (orders.count > 0) {
      affectedTables.push('orders');
      recordsProcessed += orders.count;
    }

    // Keep tickets for business records but remove personal identifiers
    const tickets = await prisma.ticket.updateMany({
      where: { userId },
      data: {
        metadata: Prisma.JsonNull
      }
    });
    if (tickets.count > 0) {
      affectedTables.push('tickets');
      recordsProcessed += tickets.count;
    }

    // Remove session data
    const sessions = await prisma.userSession.deleteMany({
      where: { userId }
    });
    if (sessions.count > 0) {
      affectedTables.push('user_sessions');
      recordsProcessed += sessions.count;
    }

    // Update audit logs to show anonymization
    await prisma.auditLog.updateMany({
      where: { userId },
      data: {
        userEmail: 'anonymized@local',
        details: JSON.stringify({ anonymized: true, date: new Date() })
      }
    });

    const anonymizationDate = new Date();
    const verificationHash = crypto
      .createHash('sha256')
      .update(`${userId}-${anonymizationDate.toISOString()}-${recordsProcessed}`)
      .digest('hex');

    return {
      affectedTables,
      recordsProcessed,
      anonymizationDate,
      verificationHash
    };
  }

  /**
   * Hard delete user data (use with caution)
   */
  private static async hardDeleteUserData(userId: string): Promise<AnonymizationResult> {
    const affectedTables: string[] = [];
    let recordsProcessed = 0;

    // Delete in correct order to handle foreign key constraints
    
    // Delete sessions
    const sessions = await prisma.userSession.deleteMany({
      where: { userId }
    });
    if (sessions.count > 0) {
      affectedTables.push('user_sessions');
      recordsProcessed += sessions.count;
    }

    // Delete password history
    const passwordHistory = await prisma.passwordHistory.deleteMany({
      where: { userId }
    });
    if (passwordHistory.count > 0) {
      affectedTables.push('password_history');
      recordsProcessed += passwordHistory.count;
    }

    // Delete login attempts
    const loginAttempts = await prisma.loginAttempt.deleteMany({
      where: { userId }
    });
    if (loginAttempts.count > 0) {
      affectedTables.push('login_attempts');
      recordsProcessed += loginAttempts.count;
    }

    // Update tickets to remove user association (keep for business records)
    const tickets = await prisma.ticket.updateMany({
      where: { userId },
      data: {
        userId: null,
        metadata: JSON.stringify({ deletedUser: true, deletionDate: new Date() })
      }
    });
    if (tickets.count > 0) {
      affectedTables.push('tickets');
      recordsProcessed += tickets.count;
    }

    // Update orders to remove user association (keep for financial records)
    const orders = await prisma.order.updateMany({
      where: { userId },
      data: {
        metadata: JSON.stringify({ deletedUser: true, deletionDate: new Date() })
      }
    });
    if (orders.count > 0) {
      affectedTables.push('orders');
      recordsProcessed += orders.count;
    }

    // Update audit logs
    await prisma.auditLog.updateMany({
      where: { userId },
      data: {
        userId: null,
        userEmail: 'deleted@local',
        details: JSON.stringify({ userDeleted: true, date: new Date() })
      }
    });

    // Finally, delete the user
    await prisma.user.delete({
      where: { id: userId }
    });
    affectedTables.push('users');
    recordsProcessed++;

    const anonymizationDate = new Date();
    const verificationHash = crypto
      .createHash('sha256')
      .update(`${userId}-deleted-${anonymizationDate.toISOString()}-${recordsProcessed}`)
      .digest('hex');

    return {
      affectedTables,
      recordsProcessed,
      anonymizationDate,
      verificationHash
    };
  }

  /**
   * Check legal retention requirements
   */
  private static async checkLegalRetentionRequirements(userId: string): Promise<{
    mustRetain: boolean;
    reason?: string;
    retainUntil?: Date;
  }> {
    // Check for financial records that must be retained
    const recentOrders = await prisma.order.findMany({
      where: {
        userId,
        createdAt: { gte: new Date(Date.now() - 7 * 365 * 24 * 60 * 60 * 1000) } // 7 years
      }
    });

    if (recentOrders.length > 0) {
      const latestOrder = recentOrders.reduce((latest: any, order: any) => 
        order.createdAt > latest.createdAt ? order : latest
      );
      
      const retainUntil = new Date(latestOrder.createdAt);
      retainUntil.setFullYear(retainUntil.getFullYear() + 7);

      if (retainUntil > new Date()) {
        return {
          mustRetain: true,
          reason: 'Financial records must be retained for 7 years',
          retainUntil
        };
      }
    }

    // Check for legal proceedings
    // In a real implementation, this would check for any ongoing legal cases
    
    return { mustRetain: false };
  }

  /**
   * Get audit trail for a user
   */
  private static async getAuditTrail(userId: string): Promise<any[]> {
    return await prisma.auditLog.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
      take: 1000,
      select: {
        action: true,
        resourceType: true,
        timestamp: true,
        ipAddress: true,
        result: true,
        riskLevel: true
      }
    });
  }

  /**
   * Get data retention information
   */
  private static async getDataRetentionInfo(userId: string): Promise<{ [key: string]: Date }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { createdAt: true }
    });

    if (!user) return {};

    const createdAt = user.createdAt;
    
    return {
      profile: new Date(createdAt.getTime() + 7 * 365 * 24 * 60 * 60 * 1000), // 7 years
      sessions: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
      auditLogs: new Date(createdAt.getTime() + 7 * 365 * 24 * 60 * 60 * 1000), // 7 years
      financialRecords: new Date(createdAt.getTime() + 10 * 365 * 24 * 60 * 60 * 1000) // 10 years
    };
  }

  /**
   * Store GDPR request record
   */
  private static async createGDPRRequest(request: Omit<GDPRRequest, 'id'>): Promise<void> {
    // In a real implementation, this would use a proper GDPRRequest model
    await prisma.auditLog.create({
      data: {
        action: `gdpr.${request.requestType}`,
        resourceType: 'user',
        resourceId: request.userId,
        userId: request.requestedBy,
        ipAddress: '0.0.0.0', // Would be actual IP in real implementation
        timestamp: request.requestedAt,
        result: request.status === 'completed' ? 'success' : 'pending',
        riskLevel: 'high',
        details: JSON.stringify({
          gdprRequest: true,
          requestType: request.requestType,
          status: request.status,
          completedAt: request.completedAt,
          reason: request.reason,
          data: request.data
        }),
        eventHash: crypto.randomUUID(),
        isSensitive: true
      }
    });
  }

  /**
   * Convert data to CSV format
   */
  private static convertToCSV(data: any): string {
    // Simple CSV conversion - in production, use a proper CSV library
    const headers = Object.keys(data).join(',');
    const rows = Object.values(data).map(value => 
      typeof value === 'object' ? JSON.stringify(value) : String(value)
    ).join(',');
    
    return `${headers}\n${rows}`;
  }

  /**
   * Convert data to XML format
   */
  private static convertToXML(data: any): string {
    // Simple XML conversion - in production, use a proper XML library
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<userData>\n';
    
    for (const [key, value] of Object.entries(data)) {
      xml += `  <${key}>${typeof value === 'object' ? JSON.stringify(value) : value}</${key}>\n`;
    }
    
    xml += '</userData>';
    return xml;
  }

  /**
   * Schedule automatic data deletion based on retention policies
   */
  static async scheduleDataRetention(): Promise<void> {
    const retentionPolicies = [
      { entityType: 'user_session', days: 90 },
      { entityType: 'audit_log', days: 2555 }, // 7 years
      { entityType: 'password_history', days: 365 },
      { entityType: 'login_attempt', days: 365 }
    ];

    for (const policy of retentionPolicies) {
      const cutoffDate = new Date(Date.now() - policy.days * 24 * 60 * 60 * 1000);
      
      // TODO: Create dataRetention model in Prisma schema
      // await prisma.dataRetention.createMany({
      //   data: [{
      //     entityType: policy.entityType,
      //     entityId: '*', // Wildcard for all entities of this type
      //     retentionPolicy: `auto_delete_${policy.days}_days`,
      //     scheduledDeleteAt: cutoffDate
      //   }],
      //   skipDuplicates: true
      // });
    }
  }

  /**
   * Execute scheduled data retention
   */
  static async executeDataRetention(): Promise<number> {
    // TODO: Create dataRetention model in Prisma schema
    const itemsToDelete: any[] = []; // await prisma.dataRetention.findMany({
    //   where: {
    //     scheduledDeleteAt: { lte: new Date() },
    //     isDeleted: false
    //   }
    // });

    let deletedCount = 0;

    for (const item of itemsToDelete) {
      try {
        switch (item.entityType) {
          case 'user_session':
            await prisma.userSession.deleteMany({
              where: { 
                expiresAt: { lte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) }
              }
            });
            break;
          case 'password_history':
            await prisma.passwordHistory.deleteMany({
              where: {
                createdAt: { lte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) }
              }
            });
            break;
          case 'login_attempt':
            await prisma.loginAttempt.deleteMany({
              where: {
                timestamp: { lte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) }
              }
            });
            break;
        }

        // Mark as deleted
        // TODO: Create dataRetention model in Prisma schema
        // await prisma.dataRetention.update({
        //   where: { id: item.id },
        //   data: {
        //     isDeleted: true,
        //     deletedAt: new Date()
        //   }
        // });

        deletedCount++;
      } catch (error) {
        console.error(`Failed to delete ${item.entityType}:`, error);
      }
    }

    return deletedCount;
  }
}

export default GDPRComplianceService;
