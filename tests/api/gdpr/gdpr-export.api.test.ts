/**
 * GDPR Data Export API Tests
 * Tests for /api/gdpr/export endpoint
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

describe('GDPR Export API Tests', () => {
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

  const mockOrder = {
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
    updatedAt: new Date('2024-09-01'),
    tickets: []
  };

  const mockTicket = {
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

  describe('POST /api/gdpr/export', () => {
    it('should export all user data successfully', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        ...mockUser,
        orders: [mockOrder],
        tickets: [mockTicket]
      } as any);

      const result = await GDPRService.exportUserData(mockUserId);

      expect(result).toBeDefined();
      expect(result.personalData).toEqual({
        id: mockUserId,
        name: 'Test User',
        email: 'test@example.com',
        createdAt: mockUser.createdAt,
        lastLogin: mockUser.lastLogin,
        isVerified: true
      });
      expect(result.orders).toHaveLength(1);
      expect(result.tickets).toHaveLength(1);
      expect(AuditServiceModule.AuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'GDPR_DATA_EXPORT'
        })
      );
    });

    it('should export user data without orders and tickets', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        ...mockUser,
        orders: [],
        tickets: []
      } as any);

      const result = await GDPRService.exportUserData(mockUserId);

      expect(result.personalData).toBeDefined();
      expect(result.orders).toHaveLength(0);
      expect(result.tickets).toHaveLength(0);
    });

    it('should throw error if user not found', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(GDPRService.exportUserData(mockUserId)).rejects.toThrow('User not found');
      
      expect(AuditServiceModule.AuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'GDPR_DATA_EXPORT',
          result: 'error'
        })
      );
    });

    it('should exclude password from export', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        ...mockUser,
        orders: [],
        tickets: []
      } as any);

      const result = await GDPRService.exportUserData(mockUserId);

      expect(result.personalData).not.toHaveProperty('password');
      expect(result.personalData).not.toHaveProperty('passwordResetToken');
      expect(result.personalData).not.toHaveProperty('emailVerificationToken');
    });

    it('should include related order data', async () => {
      const orderWithTickets = {
        ...mockOrder,
        tickets: [mockTicket]
      };

      prismaMock.user.findUnique.mockResolvedValue({
        ...mockUser,
        orders: [orderWithTickets],
        tickets: [mockTicket]
      } as any);

      const result = await GDPRService.exportUserData(mockUserId);

      expect(result.orders[0].tickets).toHaveLength(1);
      expect(result.orders[0].tickets[0].id).toBe('ticket-123');
    });

    it('should log audit event on successful export', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        ...mockUser,
        orders: [],
        tickets: []
      } as any);

      await GDPRService.exportUserData(mockUserId);

      expect(AuditServiceModule.AuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'GDPR_DATA_EXPORT',
          resourceType: 'USER',
          resourceId: mockUserId,
          userId: mockUserId,
          result: 'success',
          riskLevel: 'low'
        })
      );
    });

    it('should handle database errors gracefully', async () => {
      prismaMock.user.findUnique.mockRejectedValue(new Error('Database connection failed'));

      await expect(GDPRService.exportUserData(mockUserId)).rejects.toThrow('Database connection failed');
      
      expect(AuditServiceModule.AuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'GDPR_DATA_EXPORT',
          result: 'error'
        })
      );
    });
  });
});
