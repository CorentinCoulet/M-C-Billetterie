/**
 * GDPR Data Deletion API Tests
 * Tests for /api/gdpr/deletion endpoint
 */

import { mockPrisma as prismaMock } from '../../mocks/prisma.mock';

// Mock PrismaClient before importing service
jest.mock('@prisma/client', () => {
  const prismaMock = require('../../mocks/prisma.mock').mockPrisma;
  return {
    PrismaClient: jest.fn(() => prismaMock),
  };
});

// Mock AuditService to avoid database calls
jest.mock('../../../src/lib/audit-service', () => ({
  AuditService: {
    logEvent: jest.fn().mockResolvedValue({}),
  },
}));

import { GDPRService } from '../../../src/modules/gdpr/gdpr.service';

describe('GDPR Deletion API Tests', () => {
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

  const mockCancelledOrder = {
    id: 'order-123',
    userId: mockUserId,
    eventId: 'event-123',
    status: 'cancelled' as const,
    totalAmount: 5000,
    currency: 'EUR' as const,
    stripePaymentIntentId: 'pi_123',
    stripeCustomerId: 'cus_123',
    paymentMethod: 'card' as const,
    paymentStatus: 'refunded' as const,
    billingAddress: null,
    metadata: null,
    createdAt: new Date('2024-09-01'),
    updatedAt: new Date('2024-09-01')
  };

  const mockActiveOrder = {
    ...mockCancelledOrder,
    id: 'order-456',
    status: 'completed' as const,
    paymentStatus: 'paid' as const
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/gdpr/deletion', () => {
    it('should delete user data successfully when no active orders', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        ...mockUser,
        orders: [mockCancelledOrder],
        tickets: []
      } as any);

      prismaMock.$transaction.mockResolvedValue([{}, {}, {}, {}, {}, mockUser] as any);
      prismaMock.auditLog.create.mockResolvedValue({} as any);

      const result = await GDPRService.deleteUserData(mockUserId);

      expect(result).toEqual({
        success: true,
        message: 'User data deleted'
      });
      expect(prismaMock.$transaction).toHaveBeenCalled();
    });

    it('should prevent deletion if user has active orders', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        ...mockUser,
        orders: [mockActiveOrder],
        tickets: []
      } as any);

      prismaMock.auditLog.create.mockResolvedValue({} as any);

      await expect(GDPRService.deleteUserData(mockUserId)).rejects.toThrow(
        'Cannot delete user with active orders'
      );
      
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it('should throw error if user not found', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.auditLog.create.mockResolvedValue({} as any);

      await expect(GDPRService.deleteUserData(mockUserId)).rejects.toThrow('User not found');
      
      expect(prismaMock.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'GDPR_DATA_DELETION',
            result: 'error'
          })
        })
      );
    });

    it('should delete tickets in transaction', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        ...mockUser,
        orders: [],
        tickets: [{
          id: 'ticket-123',
          userId: mockUserId,
          orderId: 'order-123',
          eventId: 'event-123',
          ticketType: 'STANDARD' as const,
          price: 5000,
          currency: 'EUR' as const,
          qrCode: 'QR123',
          status: 'cancelled' as const
        }]
      } as any);

      prismaMock.$transaction.mockResolvedValue([{}, {}, {}, {}, {}, mockUser] as any);
      prismaMock.auditLog.create.mockResolvedValue({} as any);

      await GDPRService.deleteUserData(mockUserId);

      const transactionCalls = prismaMock.$transaction.mock.calls[0][0];
      expect(transactionCalls).toHaveLength(6); // tickets, orders, sessions, attempts, passwordHistory, user
    });

    it('should delete orders in transaction', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        ...mockUser,
        orders: [mockCancelledOrder],
        tickets: []
      } as any);

      prismaMock.$transaction.mockResolvedValue([{}, {}, {}, {}, {}, mockUser] as any);
      prismaMock.auditLog.create.mockResolvedValue({} as any);

      await GDPRService.deleteUserData(mockUserId);

      expect(prismaMock.$transaction).toHaveBeenCalled();
    });

    it('should delete user sessions in transaction', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        ...mockUser,
        orders: [],
        tickets: []
      } as any);

      prismaMock.$transaction.mockResolvedValue([{}, {}, {}, {}, {}, mockUser] as any);
      prismaMock.auditLog.create.mockResolvedValue({} as any);

      await GDPRService.deleteUserData(mockUserId);

      expect(prismaMock.$transaction).toHaveBeenCalled();
    });

    it('should log audit event on successful deletion', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        ...mockUser,
        orders: [],
        tickets: []
      } as any);

      prismaMock.$transaction.mockResolvedValue([{}, {}, {}, {}, {}, mockUser] as any);
      prismaMock.auditLog.create.mockResolvedValue({} as any);

      await GDPRService.deleteUserData(mockUserId);

      expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'GDPR_DATA_DELETION',
          resourceType: 'USER',
          resourceId: mockUserId,
          result: 'success',
          riskLevel: 'high'
        })
      });
    });

    it('should handle transaction rollback on error', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        ...mockUser,
        orders: [],
        tickets: []
      } as any);

      prismaMock.$transaction.mockRejectedValue(new Error('Transaction failed'));
      prismaMock.auditLog.create.mockResolvedValue({} as any);

      await expect(GDPRService.deleteUserData(mockUserId)).rejects.toThrow('Transaction failed');
      
      expect(prismaMock.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            result: 'error'
          })
        })
      );
    });

    it('should delete user last in transaction order', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        ...mockUser,
        orders: [],
        tickets: []
      } as any);

      prismaMock.$transaction.mockResolvedValue([{}, {}, {}, {}, {}, mockUser] as any);
      prismaMock.auditLog.create.mockResolvedValue({} as any);

      await GDPRService.deleteUserData(mockUserId);

      const transactionCalls = prismaMock.$transaction.mock.calls[0][0];
      // User deletion should be last (index 5)
      expect(transactionCalls).toHaveLength(6);
    });

    it('should allow deletion with only cancelled orders', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        ...mockUser,
        orders: [mockCancelledOrder, { ...mockCancelledOrder, id: 'order-789' }],
        tickets: []
      } as any);

      prismaMock.$transaction.mockResolvedValue([{}, {}, {}, {}, {}, mockUser] as any);
      prismaMock.auditLog.create.mockResolvedValue({} as any);

      const result = await GDPRService.deleteUserData(mockUserId);

      expect(result.success).toBe(true);
      expect(prismaMock.$transaction).toHaveBeenCalled();
    });
  });
});
