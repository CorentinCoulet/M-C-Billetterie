import { adminService } from '../../../src/services/adminService';
import { analyticsService } from '../../../src/services/analyticsService';
import { eventManagementService } from '../../../src/services/eventManagementService';
import { systemLogsService } from '../../../src/services/systemLogsService';

// Mock Prisma
jest.mock('../../../src/lib/prisma', () => ({
  prisma: {
    auditLog: {
      deleteMany: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn()
    },
    ticket: {
      deleteMany: jest.fn(),
      aggregate: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn()
    },
    order: {
      deleteMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      aggregate: jest.fn(),
      groupBy: jest.fn(),
      findMany: jest.fn()
    },
    event: {
      deleteMany: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
      update: jest.fn()
    },
    organizer: {
      deleteMany: jest.fn(),
      create: jest.fn()
    },
    user: {
      deleteMany: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn()
    },
    blockedUser: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn()
    },
    loginAttempt: {
      findMany: jest.fn()
    },
    $disconnect: jest.fn()
  }
}));

const { prisma } = require('../../../src/lib/prisma');

describe('Refactored Services - Integration Tests (Mocked)', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  describe('AnalyticsService', () => {
    test('should get dashboard statistics with correct structure', async () => {
      // Mock the data
      prisma.user.count.mockResolvedValue(10);
      prisma.event.count.mockResolvedValue(5);
      prisma.order.count.mockResolvedValue(20);
      prisma.order.aggregate.mockResolvedValue({ _sum: { totalPrice: 1000 } });

      const stats = await analyticsService.getDashboardStatistics();

      expect(stats).toHaveProperty('users');
      expect(stats).toHaveProperty('events');
      expect(stats).toHaveProperty('orders');
      expect(stats).toHaveProperty('revenue');
      
      expect(stats.users).toHaveProperty('total');
      expect(stats.users).toHaveProperty('new');
      expect(stats.events).toHaveProperty('total');
      expect(stats.events).toHaveProperty('upcoming');
      expect(stats.events).toHaveProperty('published');
    });

    test('should get sales statistics with correct structure', async () => {
      // Mock the data
      prisma.order.count.mockResolvedValue(15);
      prisma.order.groupBy.mockResolvedValue([
        { status: 'paid', _count: { id: 10 }, _sum: { totalPrice: 500 } },
        { status: 'pending_payment', _count: { id: 5 }, _sum: { totalPrice: 250 } }
      ]);
      prisma.order.findMany.mockResolvedValue([
        { createdAt: new Date(), totalPrice: 50, status: 'paid' },
        { createdAt: new Date(), totalPrice: 75, status: 'paid' }
      ]);

      const salesStats = await analyticsService.getSalesStatistics();

      expect(salesStats).toHaveProperty('totalOrders');
      expect(salesStats).toHaveProperty('totalRevenue');
      expect(salesStats).toHaveProperty('averageOrderValue');
      expect(salesStats).toHaveProperty('salesByStatus');
      expect(salesStats).toHaveProperty('salesOverTime');
    });
  });

  describe('EventManagementService', () => {
    test('should toggle event published status correctly', async () => {
      const eventId = 'event-123';
      const mockEvent = { 
        id: eventId, 
        title: 'Test Event', 
        isPublished: false 
      };

      prisma.event.update.mockResolvedValue({ ...mockEvent, isPublished: true });

      // Toggle to published
      const publishedEvent = await eventManagementService.toggleEventPublished(eventId, true);
      expect(publishedEvent.isPublished).toBe(true);
      expect(prisma.event.update).toHaveBeenCalledWith({
        where: { id: eventId },
        data: { isPublished: true }
      });
    });

    test('should cancel event correctly', async () => {
      const eventId = 'event-123';
      const reason = 'Test cancellation';
      const mockEvent = { 
        id: eventId, 
        title: 'Test Event', 
        isCancelled: false 
      };

      prisma.event.update.mockResolvedValue({ ...mockEvent, isCancelled: true });

      const cancelledEvent = await eventManagementService.cancelEvent(eventId, reason);
      expect(cancelledEvent.isCancelled).toBe(true);
      expect(prisma.event.update).toHaveBeenCalledWith({
        where: { id: eventId },
        data: { 
          isCancelled: true,
          metadata: { cancelReason: reason }
        }
      });
    });
  });

  describe('SystemLogsService', () => {
    test('should log system activity correctly', async () => {
      const userId = 'user-123';
      const logData = {
        action: 'TEST_ACTION',
        resourceType: 'user',
        resourceId: userId,
        userId: userId,
        ip: '127.0.0.1',
        userAgent: 'test-agent',
        details: { testData: 'integration test log' },
        result: 'success' as const,
        level: 'low' as const
      };

      prisma.user.findUnique.mockResolvedValue({ email: 'test@example.com' });
      prisma.auditLog.create.mockResolvedValue({ id: 'log-123' });

      await systemLogsService.logSystemActivity(logData);

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'TEST_ACTION',
          resourceType: 'user',
          resourceId: userId,
          userId: userId,
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent',
          riskLevel: 'low',
          result: 'success'
        })
      });
    });

    test('should get system logs with pagination', async () => {
      const mockLogs = [
        {
          id: 'log-1',
          action: 'TEST_ACTION',
          userId: 'user-123',
          userEmail: 'test@example.com',
          details: '{"testData": "test"}',
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent',
          riskLevel: 'low',
          result: 'success',
          timestamp: new Date(),
          resourceType: 'user',
          resourceId: 'user-123',
          User: { name: 'Test User', email: 'test@example.com' }
        }
      ];

      prisma.auditLog.findMany.mockResolvedValue(mockLogs);
      prisma.auditLog.count.mockResolvedValue(1);

      const result = await systemLogsService.getSystemLogs();

      expect(result).toHaveProperty('logs');
      expect(result).toHaveProperty('pagination');
      expect(result.logs).toHaveLength(1);
      expect(result.logs[0].action).toBe('TEST_ACTION');
    });

    test('should log security event correctly', async () => {
      const securityData = {
        event: 'LOGIN_FAILED',
        severity: 'medium' as const,
        userId: 'user-123',
        ip: '192.168.1.100',
        details: { attempts: 3, reason: 'invalid_password' }
      };

      prisma.user.findUnique.mockResolvedValue({ email: 'security@example.com' });
      prisma.auditLog.create.mockResolvedValue({ id: 'security-log-123' });

      await systemLogsService.logSecurityEvent(securityData);

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'SECURITY_LOGIN_FAILED',
          userId: 'user-123',
          ipAddress: '192.168.1.100',
          riskLevel: 'medium',
          result: 'success'
        })
      });
    });
  });

  describe('AdminService with Delegation', () => {
    test('should block user and delegate system logging', async () => {
      const targetUserId = 'user-123';
      const adminUserId = 'admin-456';
      const reason = 'Test blocking';

      // Mock that user is not already blocked
      prisma.blockedUser.findUnique.mockResolvedValue(null);
      prisma.blockedUser.create.mockResolvedValue({
        userId: targetUserId,
        reason: `${reason} (blocked by admin: ${adminUserId})`,
        blockedAt: new Date()
      });
      
      // Mock for the logging
      prisma.user.findUnique.mockResolvedValue({ email: 'admin@example.com' });
      prisma.auditLog.create.mockResolvedValue({ id: 'admin-log-123' });

      // Block user through AdminService
      await adminService.blockUser(targetUserId, reason, adminUserId);

      // Verify user blocking was called
      expect(prisma.blockedUser.create).toHaveBeenCalledWith({
        data: {
          userId: targetUserId,
          reason: `${reason} (blocked by admin: ${adminUserId})`,
          blockedAt: expect.any(Date)
        }
      });

      // Verify system logging was delegated
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'ADMIN_BLOCK_USER',
          userId: adminUserId,
          resourceId: targetUserId
        })
      });
    });

    test('should get user details correctly', async () => {
      const userId = 'user-123';
      const mockUser = {
        id: userId,
        name: 'Test User',
        email: 'test@example.com',
        password: 'hashedpassword',
        role: 'USER',
        isVerified: true,
        lastLogin: null,
        passwordChangedAt: new Date(),
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockOrders = [
        { id: 'order-1', totalPrice: 25.0, status: 'paid', createdAt: new Date() }
      ];

      const mockTickets = [
        {
          id: 'ticket-1',
          status: 'paid',
          purchasedAt: new Date(),
          event: { title: 'Test Event' }
        }
      ];

      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.order.findMany.mockResolvedValue(mockOrders);
      prisma.ticket.findMany.mockResolvedValue(mockTickets);
      prisma.loginAttempt.findMany.mockResolvedValue([]);
      prisma.blockedUser.findUnique.mockResolvedValue(null);

      const userDetails = await adminService.getUserDetails(userId);

      expect(userDetails).toHaveProperty('user');
      expect(userDetails).toHaveProperty('orders');
      expect(userDetails).toHaveProperty('tickets');
      expect(userDetails).toHaveProperty('loginHistory');
      expect(userDetails).toHaveProperty('isBlocked');
      
      expect(userDetails.user.id).toBe(userId);
      expect(userDetails.orders).toHaveLength(1);
      expect(userDetails.tickets).toHaveLength(1);
      expect(userDetails.isBlocked).toBe(false);
    });
  });
});
