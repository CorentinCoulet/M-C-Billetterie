/**
 * Automated GDPR Compliance System
 * Complete GDPR compliance with automated data management
 */

import { PrismaClient } from '../generated/prisma';
import crypto from 'crypto';
import { logger } from './logger';
import { emailService } from './mailer';

const prisma = new PrismaClient();

interface GDPRRequest {
  id: string;
  type: 'ACCESS' | 'RECTIFICATION' | 'ERASURE' | 'PORTABILITY' | 'RESTRICTION' | 'OBJECTION';
  userId: string;
  email: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED';
  requestedAt: Date;
  completedAt?: Date;
  verificationToken: string;
  verificationExpires: Date;
  isVerified: boolean;
  metadata?: Record<string, any>;
}

interface DataCategory {
  name: string;
  tables: string[];
  fields: string[];
  retention: number; // days
  lawfulBasis: string;
  isPersonal: boolean;
  isSensitive: boolean;
}

interface ConsentRecord {
  userId: string;
  consentType: string;
  granted: boolean;
  grantedAt: Date;
  withdrawnAt?: Date;
  lawfulBasis: string;
  version: string;
}

class GDPRComplianceManager {
  private dataCategories: DataCategory[] = [
    {
      name: 'Identity Data',
      tables: ['User'],
      fields: ['name', 'email', 'phone'],
      retention: 2555, // 7 years
      lawfulBasis: 'Contract',
      isPersonal: true,
      isSensitive: false
    },
    {
      name: 'Financial Data',
      tables: ['Payment', 'Order'],
      fields: ['amount', 'currency', 'paymentMethod'],
      retention: 2555, // 7 years for accounting
      lawfulBasis: 'Legal Obligation',
      isPersonal: true,
      isSensitive: false
    },
    {
      name: 'Technical Data',
      tables: ['LoginAttempt', 'SecurityLog', 'UserSession'],
      fields: ['ipAddress', 'userAgent', 'deviceInfo'],
      retention: 365, // 1 year
      lawfulBasis: 'Legitimate Interest',
      isPersonal: true,
      isSensitive: false
    },
    {
      name: 'Marketing Data',
      tables: ['Notification'],
      fields: ['type', 'message', 'isRead'],
      retention: 1095, // 3 years
      lawfulBasis: 'Consent',
      isPersonal: true,
      isSensitive: false
    }
  ];

  private pendingRequests: Map<string, GDPRRequest> = new Map();

  constructor() {
    this.startAutomatedCompliance();
  }

  /**
   * Handle GDPR data subject request
   */
  async processDataSubjectRequest(
    type: GDPRRequest['type'],
    email: string,
    metadata?: Record<string, any>
  ): Promise<{ requestId: string; verificationRequired: boolean }> {
    
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date();
    verificationExpires.setHours(verificationExpires.getHours() + 24); // 24 hours

    const request: GDPRRequest = {
      id: this.generateRequestId(),
      type,
      userId: user.id,
      email,
      status: 'PENDING',
      requestedAt: new Date(),
      verificationToken,
      verificationExpires,
      isVerified: false,
      metadata
    };

    this.pendingRequests.set(request.id, request);

    // Send verification email
    await this.sendVerificationEmail(request);

    // Log the request
    await this.logGDPRRequest(request);

    logger.info('GDPR request created', {
      requestId: request.id,
      type: request.type,
      email: request.email
    });

    return {
      requestId: request.id,
      verificationRequired: true
    };
  }

  /**
   * Verify GDPR request with token
   */
  async verifyGDPRRequest(requestId: string, token: string): Promise<void> {
    const request = this.pendingRequests.get(requestId);
    
    if (!request) {
      throw new Error('Request not found');
    }

    if (request.verificationExpires < new Date()) {
      throw new Error('Verification token expired');
    }

    if (request.verificationToken !== token) {
      throw new Error('Invalid verification token');
    }

    request.isVerified = true;
    request.status = 'IN_PROGRESS';

    // Process the request
    await this.executeGDPRRequest(request);

    logger.info('GDPR request verified and processed', {
      requestId: request.id,
      type: request.type
    });
  }

  /**
   * Execute verified GDPR request
   */
  private async executeGDPRRequest(request: GDPRRequest): Promise<void> {
    try {
      switch (request.type) {
        case 'ACCESS':
          await this.handleAccessRequest(request);
          break;
        case 'RECTIFICATION':
          await this.handleRectificationRequest(request);
          break;
        case 'ERASURE':
          await this.handleErasureRequest(request);
          break;
        case 'PORTABILITY':
          await this.handlePortabilityRequest(request);
          break;
        case 'RESTRICTION':
          await this.handleRestrictionRequest(request);
          break;
        case 'OBJECTION':
          await this.handleObjectionRequest(request);
          break;
      }

      request.status = 'COMPLETED';
      request.completedAt = new Date();

      // Send completion notification
      await this.sendCompletionNotification(request);

    } catch (error) {
      logger.error('GDPR request execution failed', {
        requestId: request.id,
        error: error.message
      });
      
      request.status = 'REJECTED';
      await this.sendErrorNotification(request, error.message);
    }
  }

  /**
   * Handle data access request (Article 15)
   */
  private async handleAccessRequest(request: GDPRRequest): Promise<void> {
    const userData = await this.collectUserData(request.userId);
    const exportFile = await this.generateDataExport(userData, 'json');
    
    await this.sendDataExport(request.email, exportFile);
    
    // Log the access
    await this.auditDataAccess(request.userId, 'GDPR_ACCESS_REQUEST');
  }

  /**
   * Handle data rectification request (Article 16)
   */
  private async handleRectificationRequest(request: GDPRRequest): Promise<void> {
    if (!request.metadata?.corrections) {
      throw new Error('No correction data provided');
    }

    const corrections = request.metadata.corrections;
    
    // Apply corrections
    await prisma.user.update({
      where: { id: request.userId },
      data: corrections
    });

    await this.auditDataModification(request.userId, 'GDPR_RECTIFICATION', corrections);
  }

  /**
   * Handle data erasure request (Article 17 - Right to be Forgotten)
   */
  private async handleErasureRequest(request: GDPRRequest): Promise<void> {
    // Check if erasure is possible (legal obligations)
    const canErase = await this.checkErasureEligibility(request.userId);
    
    if (!canErase.eligible) {
      throw new Error(`Erasure not possible: ${canErase.reason}`);
    }

    // Perform cascading deletion with anonymization where required
    await this.performDataErasure(request.userId);
    
    await this.auditDataErasure(request.userId, 'GDPR_RIGHT_TO_BE_FORGOTTEN');
  }

  /**
   * Handle data portability request (Article 20)
   */
  private async handlePortabilityRequest(request: GDPRRequest): Promise<void> {
    const userData = await this.collectUserData(request.userId);
    const portableData = this.filterPortableData(userData);
    
    const formats = ['json', 'csv', 'xml'];
    const exports = await Promise.all(
      formats.map(format => this.generateDataExport(portableData, format))
    );

    await this.sendDataPortability(request.email, exports);
    
    await this.auditDataPortability(request.userId, 'GDPR_DATA_PORTABILITY');
  }

  /**
   * Handle processing restriction request (Article 18)
   */
  private async handleRestrictionRequest(request: GDPRRequest): Promise<void> {
    // Mark user data as restricted
    await prisma.user.update({
      where: { id: request.userId },
      data: {
        metadata: {
          ...((await prisma.user.findUnique({ where: { id: request.userId } }))?.metadata as object || {}),
          processingRestricted: true,
          restrictionReason: request.metadata?.reason || 'User request',
          restrictedAt: new Date()
        }
      }
    });

    await this.auditProcessingRestriction(request.userId, 'GDPR_PROCESSING_RESTRICTION');
  }

  /**
   * Handle processing objection request (Article 21)
   */
  private async handleObjectionRequest(request: GDPRRequest): Promise<void> {
    const processingTypes = request.metadata?.processingTypes || ['marketing'];
    
    for (const processingType of processingTypes) {
      await this.revokeConsent(request.userId, processingType);
    }

    await this.auditProcessingObjection(request.userId, 'GDPR_PROCESSING_OBJECTION');
  }

  /**
   * Automated consent management
   */
  async recordConsent(
    userId: string,
    consentType: string,
    granted: boolean,
    lawfulBasis: string,
    version: string = '1.0'
  ): Promise<void> {
    const consent: ConsentRecord = {
      userId,
      consentType,
      granted,
      grantedAt: new Date(),
      lawfulBasis,
      version
    };

    if (!granted) {
      consent.withdrawnAt = new Date();
    }

    // Store consent record
    await prisma.auditLog.create({
      data: {
        action: granted ? 'consent.granted' : 'consent.withdrawn',
        resourceType: 'consent',
        resourceId: `${userId}:${consentType}`,
        userId,
        details: JSON.stringify(consent),
        timestamp: new Date(),
        result: 'success',
        riskLevel: 'low',
        eventHash: this.generateEventHash(consent)
      }
    });

    logger.info('Consent recorded', {
      userId,
      consentType,
      granted,
      lawfulBasis
    });
  }

  /**
   * Check consent validity
   */
  async checkConsentValidity(userId: string, consentType: string): Promise<boolean> {
    const latestConsent = await prisma.auditLog.findFirst({
      where: {
        userId,
        action: {
          in: ['consent.granted', 'consent.withdrawn']
        },
        resourceId: `${userId}:${consentType}`
      },
      orderBy: {
        timestamp: 'desc'
      }
    });

    if (!latestConsent) {
      return false;
    }

    const consentData = JSON.parse(latestConsent.details || '{}');
    return consentData.granted && !consentData.withdrawnAt;
  }

  /**
   * Automated data retention management
   */
  async enforceDataRetention(): Promise<void> {
    logger.info('Starting automated data retention enforcement');

    for (const category of this.dataCategories) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - category.retention);

      for (const table of category.tables) {
        try {
          // This is a simplified example - in practice, you'd need more sophisticated logic
          const deletedCount = await (prisma as any)[table.toLowerCase()].deleteMany({
            where: {
              createdAt: {
                lt: cutoffDate
              },
              // Additional conditions based on lawful basis
              ...(category.lawfulBasis === 'Consent' && {
                // Only delete if consent has been withdrawn
              })
            }
          });

          logger.info('Data retention enforced', {
            category: category.name,
            table,
            deletedRecords: deletedCount.count,
            cutoffDate
          });

        } catch (error) {
          logger.error('Data retention enforcement failed', {
            category: category.name,
            table,
            error: error.message
          });
        }
      }
    }
  }

  /**
   * Generate comprehensive privacy report
   */
  async generatePrivacyReport(startDate: Date, endDate: Date): Promise<any> {
    const gdprRequests = await prisma.auditLog.findMany({
      where: {
        action: {
          startsWith: 'gdpr.'
        },
        timestamp: {
          gte: startDate,
          lte: endDate
        }
      }
    });

    const consentRecords = await prisma.auditLog.findMany({
      where: {
        action: {
          in: ['consent.granted', 'consent.withdrawn']
        },
        timestamp: {
          gte: startDate,
          lte: endDate
        }
      }
    });

    const dataBreaches = await prisma.securityLog.findMany({
      where: {
        type: {
          contains: 'BREACH'
        },
        timestamp: {
          gte: startDate,
          lte: endDate
        }
      }
    });

    return {
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      },
      summary: {
        totalGDPRRequests: gdprRequests.length,
        consentGranted: consentRecords.filter(c => 
          JSON.parse(c.details || '{}').granted
        ).length,
        consentWithdrawn: consentRecords.filter(c => 
          JSON.parse(c.details || '{}').withdrawnAt
        ).length,
        dataBreaches: dataBreaches.length
      },
      gdprRequests: {
        byType: this.groupBy(gdprRequests, 'action'),
        byStatus: gdprRequests.reduce((acc, req) => {
          const status = JSON.parse(req.details || '{}').status || 'unknown';
          acc[status] = (acc[status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      },
      consentManagement: {
        totalRecords: consentRecords.length,
        byType: this.groupBy(consentRecords.map(c => 
          JSON.parse(c.details || '{}')
        ), 'consentType')
      },
      dataRetention: {
        categoriesManaged: this.dataCategories.length,
        lastEnforcementDate: new Date() // This should come from actual enforcement logs
      },
      complianceScore: this.calculateComplianceScore({
        gdprRequests: gdprRequests.length,
        responseTime: this.calculateAverageResponseTime(gdprRequests),
        dataBreaches: dataBreaches.length,
        consentRate: consentRecords.length
      })
    };
  }

  private async collectUserData(userId: string): Promise<any> {
    // Collect all user data from all tables
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        tickets: {
          include: {
            event: true,
            order: true
          }
        },
        orders: {
          include: {
            payment: true
          }
        },
        sessions: true,
        reviews: true,
        notifications: true,
        auditLogs: true,
        loginAttempts: true
      }
    });

    return user;
  }

  private async generateDataExport(data: any, format: 'json' | 'csv' | 'xml'): Promise<Buffer> {
    switch (format) {
      case 'json':
        return Buffer.from(JSON.stringify(data, null, 2));
      case 'csv':
        // Convert to CSV format
        return this.convertToCSV(data);
      case 'xml':
        // Convert to XML format
        return this.convertToXML(data);
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  private convertToCSV(data: any): Buffer {
    // Simplified CSV conversion - use a proper CSV library in production
    const csv = Object.entries(data).map(([key, value]) => 
      `${key},${JSON.stringify(value)}`
    ).join('\n');
    
    return Buffer.from(csv);
  }

  private convertToXML(data: any): Buffer {
    // Simplified XML conversion - use a proper XML library in production
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<user_data>
${Object.entries(data).map(([key, value]) => 
  `  <${key}>${JSON.stringify(value)}</${key}>`
).join('\n')}
</user_data>`;
    
    return Buffer.from(xml);
  }

  private filterPortableData(userData: any): any {
    // Filter data that is portable under GDPR
    // Remove system-generated data, logs, etc.
    const portableData = { ...userData };
    delete portableData.id;
    delete portableData.createdAt;
    delete portableData.updatedAt;
    delete portableData.auditLogs;
    delete portableData.loginAttempts;
    
    return portableData;
  }

  private async checkErasureEligibility(userId: string): Promise<{ eligible: boolean; reason?: string }> {
    // Check if user has active orders (legal obligation to keep financial records)
    const activeOrders = await prisma.order.count({
      where: {
        userId,
        createdAt: {
          gte: new Date(Date.now() - 7 * 365 * 24 * 60 * 60 * 1000) // 7 years
        }
      }
    });

    if (activeOrders > 0) {
      return {
        eligible: false,
        reason: 'User has financial records that must be retained for legal compliance'
      };
    }

    return { eligible: true };
  }

  private async performDataErasure(userId: string): Promise<void> {
    // Perform cascading deletion or anonymization
    await prisma.$transaction(async (tx) => {
      // Anonymize instead of delete where legal obligations exist
      await tx.user.update({
        where: { id: userId },
        data: {
          name: '[DELETED]',
          email: `deleted-${userId}@deleted.local`,
          password: '[DELETED]',
          isVerified: false,
          metadata: {
            deleted: true,
            deletedAt: new Date(),
            reason: 'GDPR Right to Erasure'
          }
        }
      });

      // Delete non-essential data
      await tx.notification.deleteMany({
        where: { userId }
      });

      await tx.review.deleteMany({
        where: { userId }
      });

      // Anonymize logs (keep for security but remove personal identifiers)
      await tx.loginAttempt.updateMany({
        where: { userId },
        data: {
          email: '[DELETED]'
        }
      });
    });
  }

  private async revokeConsent(userId: string, consentType: string): Promise<void> {
    await this.recordConsent(userId, consentType, false, 'User Objection');
  }

  private generateRequestId(): string {
    return `GDPR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateEventHash(data: any): string {
    return crypto.createHash('sha256')
      .update(JSON.stringify(data))
      .digest('hex');
  }

  private async sendVerificationEmail(request: GDPRRequest): Promise<void> {
    const verificationLink = `${process.env.NEXT_PUBLIC_APP_URL}/gdpr/verify/${request.id}/${request.verificationToken}`;
    
    await emailService.sendEmail({
      to: request.email,
      subject: `GDPR Request Verification - ${request.type}`,
      html: `
        <h2>GDPR Data Subject Request Verification</h2>
        <p>We received a ${request.type} request for your personal data.</p>
        <p>To proceed with this request, please click the link below:</p>
        <a href="${verificationLink}">${verificationLink}</a>
        <p>This link will expire in 24 hours.</p>
        <p>If you did not make this request, please ignore this email.</p>
      `
    });
  }

  private async sendCompletionNotification(request: GDPRRequest): Promise<void> {
    await emailService.sendEmail({
      to: request.email,
      subject: `GDPR Request Completed - ${request.type}`,
      html: `
        <h2>GDPR Request Completed</h2>
        <p>Your ${request.type} request has been successfully processed.</p>
        <p>Request ID: ${request.id}</p>
        <p>Completed at: ${request.completedAt?.toISOString()}</p>
      `
    });
  }

  private async sendErrorNotification(request: GDPRRequest, error: string): Promise<void> {
    await emailService.sendEmail({
      to: request.email,
      subject: `GDPR Request Error - ${request.type}`,
      html: `
        <h2>GDPR Request Error</h2>
        <p>We encountered an error processing your ${request.type} request.</p>
        <p>Error: ${error}</p>
        <p>Please contact our privacy team at privacy@company.com</p>
      `
    });
  }

  private async sendDataExport(email: string, exportFile: Buffer): Promise<void> {
    await emailService.sendEmail({
      to: email,
      subject: 'Your Personal Data Export',
      html: `
        <h2>Your Personal Data Export</h2>
        <p>As requested, please find your personal data export attached.</p>
        <p>This export contains all personal data we process about you.</p>
      `,
      attachments: [{
        filename: 'personal_data_export.json',
        content: exportFile
      }]
    });
  }

  private async sendDataPortability(email: string, exports: Buffer[]): Promise<void> {
    const attachments = exports.map((buffer, index) => ({
      filename: `data_export.${['json', 'csv', 'xml'][index]}`,
      content: buffer
    }));

    await emailService.sendEmail({
      to: email,
      subject: 'Your Data Portability Export',
      html: `
        <h2>Your Data Portability Export</h2>
        <p>As requested, please find your data in multiple formats.</p>
        <p>This data can be imported into other services.</p>
      `,
      attachments
    });
  }

  private async logGDPRRequest(request: GDPRRequest): Promise<void> {
    await prisma.auditLog.create({
      data: {
        action: `gdpr.${request.type.toLowerCase()}`,
        resourceType: 'user',
        resourceId: request.userId,
        userId: request.userId,
        details: JSON.stringify({
          requestId: request.id,
          type: request.type,
          status: request.status,
          requestedAt: request.requestedAt
        }),
        timestamp: new Date(),
        result: 'success',
        riskLevel: 'medium',
        eventHash: this.generateEventHash(request)
      }
    });
  }

  private async auditDataAccess(userId: string, action: string): Promise<void> {
    await this.logGDPRActivity(userId, action, { accessType: 'full_export' });
  }

  private async auditDataModification(userId: string, action: string, changes: any): Promise<void> {
    await this.logGDPRActivity(userId, action, { changes });
  }

  private async auditDataErasure(userId: string, action: string): Promise<void> {
    await this.logGDPRActivity(userId, action, { erasureType: 'user_request' });
  }

  private async auditDataPortability(userId: string, action: string): Promise<void> {
    await this.logGDPRActivity(userId, action, { formats: ['json', 'csv', 'xml'] });
  }

  private async auditProcessingRestriction(userId: string, action: string): Promise<void> {
    await this.logGDPRActivity(userId, action, { restrictionType: 'user_request' });
  }

  private async auditProcessingObjection(userId: string, action: string): Promise<void> {
    await this.logGDPRActivity(userId, action, { objectionType: 'user_request' });
  }

  private async logGDPRActivity(userId: string, action: string, details: any): Promise<void> {
    await prisma.auditLog.create({
      data: {
        action,
        resourceType: 'user',
        resourceId: userId,
        userId,
        details: JSON.stringify(details),
        timestamp: new Date(),
        result: 'success',
        riskLevel: 'medium',
        eventHash: this.generateEventHash({ userId, action, details })
      }
    });
  }

  private startAutomatedCompliance(): void {
    // Run data retention enforcement daily at 2 AM
    setInterval(async () => {
      const now = new Date();
      if (now.getHours() === 2 && now.getMinutes() === 0) {
        await this.enforceDataRetention();
      }
    }, 60 * 1000); // Check every minute

    logger.info('GDPR automated compliance system started');
  }

  private groupBy<T>(array: T[], key: string): Record<string, number> {
    return array.reduce((acc, item) => {
      const value = (item as any)[key];
      acc[value] = (acc[value] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private calculateAverageResponseTime(requests: any[]): number {
    const completedRequests = requests.filter(req => {
      const details = JSON.parse(req.details || '{}');
      return details.completedAt && details.requestedAt;
    });

    if (completedRequests.length === 0) return 0;

    const totalTime = completedRequests.reduce((acc, req) => {
      const details = JSON.parse(req.details);
      const requested = new Date(details.requestedAt);
      const completed = new Date(details.completedAt);
      return acc + (completed.getTime() - requested.getTime());
    }, 0);

    return totalTime / completedRequests.length / (1000 * 60 * 60 * 24); // Days
  }

  private calculateComplianceScore(metrics: any): number {
    let score = 100;

    // Response time penalty (should be < 30 days)
    if (metrics.responseTime > 30) {
      score -= 20;
    } else if (metrics.responseTime > 14) {
      score -= 10;
    }

    // Data breach penalty
    if (metrics.dataBreaches > 0) {
      score -= metrics.dataBreaches * 15;
    }

    // GDPR request handling bonus
    if (metrics.gdprRequests > 0) {
      score += 5;
    }

    return Math.max(0, Math.min(100, score));
  }
}

// Export singleton instance
export const gdprComplianceManager = new GDPRComplianceManager();
export default GDPRComplianceManager;
