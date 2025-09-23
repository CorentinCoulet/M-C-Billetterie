/**
 * GDPR Service with method exports
 */

import { PrismaClient } from '@prisma/client';
import { AuditService } from '../../lib/audit-service';

const prisma = new PrismaClient();

export class GDPRService {
  static async exportUserData(userId: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          orders: {
            include: {
              tickets: true
            }
          },
          tickets: {
            include: {
              event: true,
              order: true
            }
          }
        }
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Log data export
      await AuditService.logEvent({
        action: 'GDPR_DATA_EXPORT',
        resourceType: 'USER',
        resourceId: userId,
        userId: userId,
        details: { description: 'User data export according to GDPR' },
        result: 'success',
        riskLevel: 'low',
        ipAddress: 'system'
      });

      return {
        personalData: {
          id: user.id,
          name: user.name,
          email: user.email,
          createdAt: user.createdAt,
          lastLogin: user.lastLogin,
          isVerified: user.isVerified
        },
        orders: user.orders,
        tickets: user.tickets
      };
    } catch (error) {
      console.error('Error during GDPR data export:', error);
      
      // Log failed export attempt
      await AuditService.logEvent({
        action: 'GDPR_DATA_EXPORT',
        resourceType: 'USER',
        resourceId: userId,
        userId: userId,
        details: { 
          description: 'Failed user data export according to GDPR',
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        result: 'error',
        riskLevel: 'low',
        ipAddress: 'system'
      });
      
      throw error;
    }
  }

  static async deleteUserData(userId: string) {
    try {
      // Check if user exists
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          orders: true,
          tickets: true
        }
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Check if user has active orders (should prevent deletion)
      const activeOrders = user.orders.filter((order: any) => order.status !== 'cancelled');
      if (activeOrders.length > 0) {
        throw new Error('Cannot delete user with active orders. Please cancel or complete orders first.');
      }

      // Delete related data in transaction
      await prisma.$transaction([
        // Delete tickets
        prisma.ticket.deleteMany({
          where: { userId: userId }
        }),
        // Delete orders
        prisma.order.deleteMany({
          where: { userId: userId }
        }),
        // Delete other related data - keep only userSession
        prisma.userSession.deleteMany({
          where: { userId: userId }
        }),
        prisma.loginAttempt.deleteMany({
          where: { userId: userId }
        }),
        prisma.passwordHistory.deleteMany({
          where: { userId: userId }
        }),
        // Delete user last
        prisma.user.delete({
          where: { id: userId }
        })
      ]);

      // Log deletion
      await AuditService.logEvent({
        action: 'GDPR_DATA_DELETION',
        resourceType: 'USER',
        resourceId: userId,
        userId: userId,
        details: { description: 'User data deletion according to GDPR' },
        result: 'success',
        riskLevel: 'high',
        ipAddress: 'system'
      });

      return { success: true, message: 'User data deleted' };
    } catch (error) {
      console.error('Error during GDPR data deletion:', error);
      
      // Log failed deletion attempt
      await AuditService.logEvent({
        action: 'GDPR_DATA_DELETION',
        resourceType: 'USER',
        resourceId: userId,
        userId: userId,
        details: { 
          description: 'Failed user data deletion according to GDPR',
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        result: 'error',
        riskLevel: 'high',
        ipAddress: 'system'
      });
      
      throw error;
    }
  }

  static async portUserData(userId: string) {
    try {
      // Data portability is similar to export but with different formatting
      const exportData = await GDPRService.exportUserData(userId);
      
      // Log portability
      await AuditService.logEvent({
        action: 'GDPR_DATA_PORTABILITY',
        resourceType: 'USER',
        resourceId: userId,
        userId: userId,
        details: { description: 'User data portability according to GDPR' },
        result: 'success',
        riskLevel: 'low',
        ipAddress: 'system'
      });

      return {
        format: 'JSON',
        data: exportData,
        exportedAt: new Date(),
        userId
      };
    } catch (error) {
      console.error('Error during GDPR data portability:', error);
      
      // Log failed portability attempt
      await AuditService.logEvent({
        action: 'GDPR_DATA_PORTABILITY',
        resourceType: 'USER',
        resourceId: userId,
        userId: userId,
        details: { 
          description: 'Failed user data portability according to GDPR',
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        result: 'error',
        riskLevel: 'low',
        ipAddress: 'system'
      });
      
      throw error;
    }
  }

  static async anonymizeUserData(userId: string) {
    try {
      // Check if user exists
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        throw new Error('User not found');
      }

      const anonymizedEmail = `anonymized_${Date.now()}@deleted.user`;
      
      await prisma.user.update({
        where: { id: userId },
        data: {
          name: 'Deleted User',
          email: anonymizedEmail,
          password: 'ANONYMIZED',
          metadata: null,
          isVerified: false,
          lastLogin: null
        }
      });

      // Log anonymization
      await AuditService.logEvent({
        action: 'GDPR_DATA_ANONYMIZATION',
        resourceType: 'USER',
        resourceId: userId,
        userId: userId,
        details: { 
          description: 'User data anonymization according to GDPR',
          anonymizedEmail
        },
        result: 'success',
        riskLevel: 'medium',
        ipAddress: 'system'
      });

      return { success: true, message: 'User data anonymized' };
    } catch (error) {
      console.error('Error during GDPR data anonymization:', error);
      
      // Log failed anonymization attempt
      await AuditService.logEvent({
        action: 'GDPR_DATA_ANONYMIZATION',
        resourceType: 'USER',
        resourceId: userId,
        userId: userId,
        details: { 
          description: 'Failed user data anonymization according to GDPR',
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        result: 'error',
        riskLevel: 'medium',
        ipAddress: 'system'
      });
      
      throw error;
    }
  }

  static async getComplianceStatus(userId: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          orders: true,
          tickets: true
        }
      });

      if (!user) {
        throw new Error('User not found');
      }

      return {
        userId,
        hasPersonalData: true,
        hasActiveOrders: user.orders.filter((order: any) => order.status !== 'cancelled').length > 0,
        hasActiveTickets: user.tickets.filter((ticket: any) => ticket.status !== 'cancelled').length > 0,
        dataRetentionCompliant: true,
        lastDataExport: null, // To implement if needed
        consentGiven: user.isVerified,
        canDelete: user.orders.filter((order: any) => order.status !== 'cancelled').length === 0
      };
    } catch (error) {
      console.error('Error during GDPR compliance status check:', error);
      
      // Log failed compliance check
      await AuditService.logEvent({
        action: 'GDPR_COMPLIANCE_CHECK',
        resourceType: 'USER',
        resourceId: userId,
        userId: userId,
        details: { 
          description: 'Failed GDPR compliance status check',
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        result: 'error',
        riskLevel: 'low',
        ipAddress: 'system'
      });
      
      throw error;
    }
  }
}

// Export individual methods for API routes
export const exportUserData = (userId: string) => GDPRService.exportUserData(userId);
export const deleteUserData = (userId: string) => GDPRService.deleteUserData(userId);
export const portUserData = (userId: string) => GDPRService.portUserData(userId);
export const anonymizeUserData = (userId: string) => GDPRService.anonymizeUserData(userId);
export const getComplianceStatus = (userId: string) => GDPRService.getComplianceStatus(userId);

export default GDPRService;
