/**
 * GDPR Compliance Status API Tests
 * Tests for /api/gdpr/status endpoint
 */

import { mockPrisma as prismaMock } from '../../mocks/prisma.mock';

// Mock PrismaClient before importing service
jest.mock('@prisma/client', () => {
  const prismaMock = require('../../mocks/prisma.mock').mockPrisma;
  return {
    PrismaClient: jest.fn(() => prismaMock),
  };
});

import * as AuditServiceModule from '../../../src/lib/audit-service';
import { GDPRService } from '../../../src/modules/gdpr/gdpr.service';

// Mock AuditService
jest.spyOn(AuditServiceModule.AuditService, 'logEvent').mockResolvedValue(undefined as any);

describe('GDPR Status API Tests', () => {
  const mockUserId = 'user-123';
  const mockUser = {
    id: mockUserId,
    email: 'test@example.com',
    name: 'Test User',
    password: 'hashedPassword',
    role: 'USER' as const,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    lastLogin: new Date('2024-10-01'),
    isVerified: true,
    emailVerificationToken: null,
    emailVerificationExpires: null,
    metadata: null,
    passwordResetToken: null,
    passwordResetExpires: null,
    failedLoginAttempts: 0,
    accountLockedUntil: null,
    twoFactorEnabled: false,
    twoFactorSecret: null,
    stripeCustomerId: null,
    stripeAccountId: null,
    profileImageUrl: null
  };

  const mockActiveOrder = {
    id: 'order-123',
    userId: mockUserId,
    eventId: 'event-123',
    status: 'completed' as const,
    totalAmount: 5000,
    currency: 'EUR' as const,
    stripePaymentIntentId: 'pi_123',
    stripeCustomerId: 'cus_123',
    paymentMethod: 'card' as const,
    paymentStatus: 'paid' as const,
    billingAddress: null,
    metadata: null,
    createdAt: new Date('2024-09-01'),
    updatedAt: new Date('2024-09-01')
  };

  const mockActiveTicket = {
    id: 'ticket-123',
    orderId: 'order-123',
    eventId: 'event-123',
    userId: mockUserId,
    ticketType: 'STANDARD' as const,
    price: 5000,
    currency: 'EUR' as const,
    qrCode: 'QR123',
    qrCodeExpires: new Date('2025-01-01'),
    status: 'active' as const,
    seatNumber: null,
    checkedInAt: null,
    checkedInBy: null,
    transferredTo: null,
    transferredAt: null,
    metadata: null,
    createdAt: new Date('2024-09-01'),
    updatedAt: new Date('2024-09-01')
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset AuditService mock
    jest.spyOn(AuditServiceModule.AuditService, 'logEvent').mockResolvedValue(undefined as any);
  });

  describe('GET /api/gdpr/status', () => {
    it('should return compliance status with active orders', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        ...mockUser,
        orders: [mockActiveOrder],
        tickets: [mockActiveTicket]
      } as any);

      const result = await GDPRService.getComplianceStatus(mockUserId);

      expect(result).toEqual({
        userId: mockUserId,
        hasPersonalData: true,
        hasActiveOrders: true,
        hasActiveTickets: true,
        dataRetentionCompliant: true,
        lastDataExport: null,
        consentGiven: true,
        canDelete: false
      });
    });

    it('should return compliance status without active orders', async () => {
      const cancelledOrder = {
        ...mockActiveOrder,
        status: 'cancelled' as const
      };

      const cancelledTicket = {
        ...mockActiveTicket,
        status: 'cancelled' as const
      };

      prismaMock.user.findUnique.mockResolvedValue({
        ...mockUser,
        orders: [cancelledOrder],
        tickets: [cancelledTicket]
      } as any);

      const result = await GDPRService.getComplianceStatus(mockUserId);

      expect(result).toEqual({
        userId: mockUserId,
        hasPersonalData: true,
        hasActiveOrders: false,
        hasActiveTickets: false,
        dataRetentionCompliant: true,
        lastDataExport: null,
        consentGiven: true,
        canDelete: true
      });
    });

    it('should return compliance status for user with no data', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        ...mockUser,
        orders: [],
        tickets: []
      } as any);

      const result = await GDPRService.getComplianceStatus(mockUserId);

      expect(result.hasActiveOrders).toBe(false);
      expect(result.hasActiveTickets).toBe(false);
      expect(result.canDelete).toBe(true);
    });

    it('should throw error if user not found', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(GDPRService.getComplianceStatus(mockUserId)).rejects.toThrow('User not found');
      
      expect(AuditServiceModule.AuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'GDPR_COMPLIANCE_CHECK',
          result: 'error'
        })
      );
    });

    it('should indicate consent based on email verification', async () => {
      const unverifiedUser = {
        ...mockUser,
        isVerified: false
      };

      prismaMock.user.findUnique.mockResolvedValue({
        ...unverifiedUser,
        orders: [],
        tickets: []
      } as any);

      const result = await GDPRService.getComplianceStatus(mockUserId);

      expect(result.consentGiven).toBe(false);
    });

    it('should prevent deletion when active orders exist', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        ...mockUser,
        orders: [mockActiveOrder],
        tickets: []
      } as any);

      const result = await GDPRService.getComplianceStatus(mockUserId);

      expect(result.canDelete).toBe(false);
      expect(result.hasActiveOrders).toBe(true);
    });

    it('should allow deletion when only cancelled orders exist', async () => {
      const cancelledOrder = {
        ...mockActiveOrder,
        status: 'cancelled' as const
      };

      prismaMock.user.findUnique.mockResolvedValue({
        ...mockUser,
        orders: [cancelledOrder],
        tickets: []
      } as any);

      const result = await GDPRService.getComplianceStatus(mockUserId);

      expect(result.canDelete).toBe(true);
      expect(result.hasActiveOrders).toBe(false);
    });

    it('should handle database errors gracefully', async () => {
      prismaMock.user.findUnique.mockRejectedValue(new Error('Database connection failed'));

      await expect(GDPRService.getComplianceStatus(mockUserId)).rejects.toThrow('Database connection failed');
      
      expect(AuditServiceModule.AuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'GDPR_COMPLIANCE_CHECK',
          result: 'error'
        })
      );
    });
  });
});
