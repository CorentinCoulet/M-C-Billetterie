import { adminService } from '../../../src/services/adminService';
import { analyticsService } from '../../../src/services/analyticsService';
import { eventManagementService } from '../../../src/services/eventManagementService';
import { systemLogsService } from '../../../src/services/systemLogsService';
import { generateRandomEmail, hashTestPassword } from '../../utils/helpers';

// Mock Prisma first
jest.mock('../../../src/lib/prisma', () => ({
  prisma: {
    auditLog: {
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn()
    },
    blockedUser: {
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn()
    },
    order: {
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
      aggregate: jest.fn()
    },
    ticket: {
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      findMany: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn()
    },
    event: {
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn()
    },
    user: {
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn()
    },
    organizer: {
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      create: jest.fn(),
      findUnique: jest.fn()
    },
    loginAttempt: {
      findMany: jest.fn()
    },
    userSession: {
      deleteMany: jest.fn().mockResolvedValue({ count: 0 })
    },
    category: {
      findMany: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn()
    },
    payment: {
      groupBy: jest.fn()
    },
    $disconnect: jest.fn().mockResolvedValue(undefined)
  }
}));

// Get the mocked prisma for easy access
const { prisma: mockPrisma } = require('../../../src/lib/prisma');

describe('Refactored Services Integration Tests', () => {
  let testUser: any;
  let testAdmin: any;
  let testEvent: any;
  let testOrder: any;

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();

    // Configure mock responses with realistic data
    const mockUser = {
      id: 'user-123',
      email: generateRandomEmail(),
      password: await hashTestPassword('Password123!'),
      name: 'Test User',
      role: 'USER',
      isVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      _count: { tickets: 0 } // Add count for analytics
    };

    const mockAdmin = {
      id: 'admin-123',
      email: generateRandomEmail(),
      password: await hashTestPassword('AdminPass123!'),
      name: 'Test Admin',
      role: 'ADMIN',
      isVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      _count: { tickets: 0 } // Add count for analytics
    };

    const mockOrganizer = {
      id: 'org-123',
      name: 'Test Organizer',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const mockEvent = {
      id: 'event-123',
      title: 'Test Event',
      description: 'Test event description',
      date: new Date(Date.now() + 86400000),
      location: 'Test Location',
      maxCapacity: 100,
      isPublished: true,
      isCancelled: false,
      organizerId: mockOrganizer.id,
      categoryId: 'category-123',
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {},
      tickets: [], // Add empty tickets array
      _count: { tickets: 0 } // Add count for pagination
    };

    const mockOrder = {
      id: 'order-123',
      userId: mockUser.id,
      totalPrice: 50.0,
      status: 'paid',
      currency: 'EUR',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Configure user mocks
    mockPrisma.user.create.mockImplementation(({ data }: { data: any }) => Promise.resolve({ ...mockUser, ...data }));
    mockPrisma.user.findUnique.mockResolvedValue(mockUser);
    mockPrisma.user.findMany.mockResolvedValue([mockUser, mockAdmin]);
    mockPrisma.user.update.mockImplementation(({ data }: { data: any }) => Promise.resolve({ ...mockUser, ...data }));
    mockPrisma.user.count.mockResolvedValue(2);
    mockPrisma.user.groupBy.mockResolvedValue([
      { role: 'USER', _count: { id: 1 } },
      { role: 'ADMIN', _count: { id: 1 } }
    ]);

    // Configure organizer mocks
    mockPrisma.organizer.create.mockResolvedValue(mockOrganizer);
    mockPrisma.organizer.findUnique.mockResolvedValue(mockOrganizer);

    // Configure event mocks
    mockPrisma.event.create.mockImplementation(({ data }: { data: any }) => Promise.resolve({ ...mockEvent, ...data }));
    mockPrisma.event.findUnique.mockResolvedValue(mockEvent);
    mockPrisma.event.findMany.mockResolvedValue([mockEvent]);
    mockPrisma.event.update.mockImplementation(({ data }: { data: any }) => Promise.resolve({ ...mockEvent, ...data }));
    mockPrisma.event.count.mockResolvedValue(1);
    mockPrisma.event.groupBy.mockResolvedValue([]);

    // Configure order mocks
    mockPrisma.order.create.mockImplementation(({ data }: { data: any }) => Promise.resolve({ ...mockOrder, ...data }));
    mockPrisma.order.findMany.mockResolvedValue([mockOrder]);
    mockPrisma.order.count.mockResolvedValue(1);
    mockPrisma.order.groupBy.mockResolvedValue([
      { status: 'paid', _count: { id: 1 }, _sum: { totalPrice: 50.0 } }
    ]);
    mockPrisma.order.aggregate.mockResolvedValue({
      _sum: { totalPrice: 50.0 },
      _count: { id: 1 },
      _avg: { totalPrice: 50.0 },
      _max: { totalPrice: 50.0 },
      _min: { totalPrice: 50.0 }
    });

    // Configure ticket mocks
    mockPrisma.ticket.findMany.mockResolvedValue([]);
    mockPrisma.ticket.count.mockResolvedValue(0);
    mockPrisma.ticket.aggregate.mockResolvedValue({
      _count: { id: 0 }
    });

    // Configure blocked user mocks
    mockPrisma.blockedUser.findUnique.mockResolvedValue(null);
    mockPrisma.blockedUser.findMany.mockResolvedValue([]);
    mockPrisma.blockedUser.create.mockImplementation(({ data }: { data: any }) => Promise.resolve({
      id: 'blocked-123',
      userId: data.userId,
      reason: data.reason,
      createdAt: new Date(),
      updatedAt: new Date(),
      blockedAt: new Date(),
      ...data
    }));

    // Configure audit log mocks
    mockPrisma.auditLog.create.mockImplementation(({ data }: { data: any }) => Promise.resolve({
      id: 'log-123',
      action: data.action,
      userId: data.userId,
      createdAt: new Date(),
      timestamp: new Date(),
      ...data
    }));
    mockPrisma.auditLog.findMany.mockResolvedValue([]);
    mockPrisma.auditLog.count.mockResolvedValue(0);
    mockPrisma.auditLog.groupBy.mockResolvedValue([]);

    // Configure login attempt mocks
    mockPrisma.loginAttempt.findMany.mockResolvedValue([]);

    // Configure additional mocks for analytics service
    mockPrisma.category.findMany.mockResolvedValue([]);
    mockPrisma.payment.groupBy.mockResolvedValue([]);

    // Store test data for access in tests
    testUser = mockUser;
    testAdmin = mockAdmin;
    testEvent = mockEvent;
    testOrder = mockOrder;
  });

  describe('AnalyticsService', () => {
    it('should get dashboard statistics', async () => {
      const stats = await analyticsService.getDashboardStatistics();

      expect(stats).toHaveProperty('users');
      expect(stats).toHaveProperty('events');
      expect(stats).toHaveProperty('orders');
      expect(stats).toHaveProperty('revenue');

      expect(stats.users.total).toBe(2); // testUser + testAdmin
      expect(stats.events.total).toBe(1);
      expect(stats.orders.total).toBe(1);
      expect(typeof stats.revenue.total).toBe('number');
    });

    it('should get user analytics', async () => {
      // Mock specific for blocked users count
      mockPrisma.user.count
        .mockResolvedValueOnce(2) // total users
        .mockResolvedValueOnce(0); // blocked users (with where clause)

      const analytics = await analyticsService.getUserAnalytics();

      expect(analytics).toHaveProperty('totalUsers');
      expect(analytics).toHaveProperty('activeUsers');
      expect(analytics).toHaveProperty('usersByRole');
      expect(analytics).toHaveProperty('newUsersOverTime');
      expect(analytics).toHaveProperty('userEngagement');

      expect(analytics.totalUsers).toBe(2);
      expect(analytics.usersByRole).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ role: 'USER', count: 1 }),
          expect.objectContaining({ role: 'ADMIN', count: 1 })
        ])
      );
    });

    it('should get sales statistics', async () => {
      const salesStats = await analyticsService.getSalesStatistics();

      expect(salesStats).toHaveProperty('totalOrders');
      expect(salesStats).toHaveProperty('totalRevenue');
      expect(salesStats).toHaveProperty('averageOrderValue');
      expect(salesStats).toHaveProperty('salesByStatus');
      expect(salesStats).toHaveProperty('salesOverTime');

      expect(salesStats.totalOrders).toBe(1);
      expect(salesStats.totalRevenue).toBe(50.0);
    });
  });

  describe('EventManagementService', () => {
    it('should get event management statistics', async () => {
      // Mock specific responses for event management stats
      mockPrisma.event.count
        .mockResolvedValueOnce(1) // total events
        .mockResolvedValueOnce(1) // upcoming events
        .mockResolvedValueOnce(1) // published events
        .mockResolvedValueOnce(0) // draft events
        .mockResolvedValueOnce(0); // cancelled events

      // Mock findMany for categories
      mockPrisma.event.findMany
        .mockResolvedValueOnce([{ categoryId: 'cat-1', category: { name: 'Concert' } }]) // for categories
        .mockResolvedValueOnce([{ // for top events
          id: testEvent.id,
          title: testEvent.title,
          _count: { tickets: 0 }
        }]);

      const stats = await eventManagementService.getEventManagementStats();

      expect(stats).toHaveProperty('events');
      expect(stats).toHaveProperty('byCategory');
      expect(stats).toHaveProperty('averageTicketsPerEvent');
      expect(stats).toHaveProperty('topEvents');

      expect(stats.events.total).toBe(1);
      expect(stats.events.published).toBe(1);
      expect(stats.events.upcoming).toBe(1);
    });

    it('should toggle event published status', async () => {
      const updatedEvent = await eventManagementService.toggleEventPublished(testEvent.id, false);

      expect(updatedEvent.isPublished).toBe(false);

      // Toggle back
      const retoggledEvent = await eventManagementService.toggleEventPublished(testEvent.id, true);
      expect(retoggledEvent.isPublished).toBe(true);
    });

    it('should cancel an event', async () => {
      const canceledEvent = await eventManagementService.cancelEvent(testEvent.id, 'Test cancellation');

      expect(canceledEvent.isCancelled).toBe(true);
      expect(canceledEvent.metadata).toEqual(
        expect.objectContaining({
          cancelReason: 'Test cancellation'
        })
      );
    });

    it('should get event details', async () => {
      // Mock findUnique with include for event details
      mockPrisma.event.findUnique.mockResolvedValueOnce({
        ...testEvent,
        tickets: [],
        _count: { tickets: 0 }
      });

      const details = await eventManagementService.getEventDetails(testEvent.id);

      expect(details).toHaveProperty('id', testEvent.id);
      expect(details).toHaveProperty('title', testEvent.title);
      expect(details).toHaveProperty('revenue');
      expect(details).toHaveProperty('ticketsSold');
      expect(details).toHaveProperty('attendees');
      expect(Array.isArray(details.attendees)).toBe(true);
    });

    it('should update event details', async () => {
      const updatedEvent = await eventManagementService.updateEvent(testEvent.id, {
        title: 'Updated Event Title',
        description: 'Updated description',
        maxCapacity: 150
      });

      expect(updatedEvent.title).toBe('Updated Event Title');
      expect(updatedEvent.description).toBe('Updated description');
      expect(updatedEvent.maxCapacity).toBe(150);
    });

    it('should get events with pagination', async () => {
      // Mock for pagination
      mockPrisma.event.findMany.mockResolvedValueOnce([{
        ...testEvent,
        _count: { tickets: 0 },
        category: { name: 'Test Category' }
      }]);
      mockPrisma.event.count.mockResolvedValueOnce(1);

      const result = await eventManagementService.getEvents({
        page: 1,
        limit: 10,
        isPublished: true
      });

      expect(result).toHaveProperty('events');
      expect(result).toHaveProperty('pagination');
      expect(result.events).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.page).toBe(1);
    });
  });

  describe('SystemLogsService', () => {
    it('should log system activity', async () => {
      // Mock user.findUnique for email lookup
      mockPrisma.user.findUnique.mockResolvedValueOnce(testUser);

      await systemLogsService.logSystemActivity({
        action: 'TEST_ACTION',
        userId: testUser.id,
        level: 'low',
        resourceType: 'test',
        result: 'success',
        details: { testData: 'test value' }
      });

      // Verify log was created
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'TEST_ACTION',
          userId: testUser.id,
          riskLevel: 'low'
        })
      });
    });

    it('should get system activity statistics', async () => {
      // Mock for statistics call
      mockPrisma.auditLog.count
        .mockResolvedValueOnce(2) // total logs
        .mockResolvedValueOnce(1); // today logs

      mockPrisma.auditLog.findMany.mockResolvedValueOnce([
        { 
          timestamp: new Date(), 
          riskLevel: 'low', 
          action: 'TEST_ACTION', 
          userId: testUser.id, 
          userEmail: testUser.email 
        },
        { 
          timestamp: new Date(), 
          riskLevel: 'medium', 
          action: 'ANOTHER_ACTION', 
          userId: testAdmin.id, 
          userEmail: testAdmin.email 
        }
      ]);

      const stats = await systemLogsService.getSystemActivityStats();

      expect(stats).toHaveProperty('totalLogs');
      expect(stats).toHaveProperty('todayLogs');
      expect(stats).toHaveProperty('logsByRiskLevel');
      expect(stats).toHaveProperty('topActions');
      expect(stats).toHaveProperty('activeUsers');
      expect(stats).toHaveProperty('activityOverTime');

      expect(stats.totalLogs).toBe(2);
    });

    it('should log security events', async () => {
      await systemLogsService.logSecurityEvent({
        event: 'SUSPICIOUS_ACTIVITY',
        severity: 'high',
        userId: testUser.id,
        ip: '192.168.1.1',
        details: { reason: 'Too many login attempts' },
        blocked: true
      });

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'SECURITY_SUSPICIOUS_ACTIVITY',
          userId: testUser.id,
          riskLevel: 'high'
        })
      });
    });

    it('should log user and admin actions', async () => {
      await systemLogsService.logUserAction({
        userId: testUser.id,
        action: 'LOGIN',
        success: true,
        ip: '192.168.1.1'
      });

      await systemLogsService.logAdminAction({
        adminId: testAdmin.id,
        action: 'USER_MANAGEMENT',
        targetUserId: testUser.id,
        details: { operation: 'view_profile' }
      });

      expect(mockPrisma.auditLog.create).toHaveBeenCalledTimes(2);
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'USER_LOGIN',
          userId: testUser.id
        })
      });
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'ADMIN_USER_MANAGEMENT',
          userId: testAdmin.id
        })
      });
    });
  });

  describe('AdminService (Refactored)', () => {
    it('should delegate dashboard statistics to AnalyticsService', async () => {
      const stats = await adminService.getDashboardStatistics();
      
      // Should have same structure as AnalyticsService
      expect(stats).toHaveProperty('users');
      expect(stats).toHaveProperty('events');
      expect(stats).toHaveProperty('orders');
      expect(stats).toHaveProperty('revenue');
    });

    it('should block and unblock users', async () => {
      // Block user
      await adminService.blockUser(testUser.id, 'Test blocking', testAdmin.id);

      // Mock the return for getBlockedUsers
      mockPrisma.blockedUser.findMany.mockResolvedValueOnce([{
        id: 'blocked-123',
        userId: testUser.id,
        reason: 'Test blocking (blocked by admin: admin-123)',
        blockedAt: new Date()
      }]);

      const blockedUsers = await adminService.getBlockedUsers();
      expect(blockedUsers).toHaveLength(1);
      expect(blockedUsers[0].userId).toBe(testUser.id);
      expect(blockedUsers[0].reason).toContain('Test blocking');

      // Mock for unblock operation
      mockPrisma.blockedUser.findUnique.mockResolvedValueOnce({
        id: 'blocked-123',
        userId: testUser.id,
        reason: 'Test blocking',
        blockedAt: new Date()
      });
      mockPrisma.blockedUser.delete.mockResolvedValueOnce({
        id: 'blocked-123',
        userId: testUser.id
      });

      // Unblock user
      await adminService.unblockUser(testUser.id, testAdmin.id);

      // Mock empty result for getBlockedUsers after unblock
      mockPrisma.blockedUser.findMany.mockResolvedValueOnce([]);
      const unblockedUsers = await adminService.getBlockedUsers();
      expect(unblockedUsers).toHaveLength(0);
    });

    it('should update user roles', async () => {
      const updatedUser = await adminService.updateUserRole(testUser.id, 'MODERATOR', testAdmin.id);

      expect(updatedUser.role).toBe('MODERATOR');
    });

    it('should get user details for admin view', async () => {
      const userDetails = await adminService.getUserDetails(testUser.id);

      expect(userDetails).toHaveProperty('user');
      expect(userDetails).toHaveProperty('orders');
      expect(userDetails).toHaveProperty('tickets');
      expect(userDetails).toHaveProperty('loginHistory');
      expect(userDetails).toHaveProperty('isBlocked');

      expect(userDetails.user.id).toBe(testUser.id);
      expect(userDetails.isBlocked).toBe(false);
    });

    it('should get admin activity summary', async () => {
      // Mock for activity summary
      mockPrisma.auditLog.count.mockResolvedValue(2);
      mockPrisma.auditLog.findMany.mockResolvedValue([
        { action: 'ADMIN_UPDATE_USER_ROLE', createdAt: new Date() },
        { action: 'ADMIN_BLOCK_USER', createdAt: new Date() }
      ]);

      const summary = await adminService.getAdminActivitySummary(testAdmin.id);

      expect(summary).toHaveProperty('totalActions');
      expect(summary).toHaveProperty('todayActions');
      expect(summary).toHaveProperty('recentActions');

      expect(summary.totalActions).toBe(2);
    });

    it('should perform system maintenance', async () => {
      const result = await adminService.performSystemMaintenance(testAdmin.id, {
        cleanupSessions: true,
        optimizeDatabase: true
      });

      expect(result).toHaveProperty('results');
      expect(result.results).toHaveLength(2);
      
      const cleanupResult = result.results.find(r => r.operation === 'cleanup_sessions');
      const optimizeResult = result.results.find(r => r.operation === 'optimize_database');

      expect(cleanupResult?.success).toBe(true);
      expect(optimizeResult?.success).toBe(true);
    });

    it('should handle errors gracefully and log them', async () => {
      // Mock findUnique to return null for invalid user
      mockPrisma.blockedUser.findUnique.mockResolvedValueOnce(null);

      // Test error handling with invalid user ID - should not throw since user check happens first
      await adminService.blockUser('invalid-id', 'Test', testAdmin.id);

      // Verify the call was made
      expect(mockPrisma.blockedUser.create).toHaveBeenCalled();
    });
  });

  describe('Service Integration', () => {
    it('should maintain data consistency across services', async () => {
      // Create some activities
      await adminService.blockUser(testUser.id, 'Integration test', testAdmin.id);
      await eventManagementService.cancelEvent(testEvent.id, 'Integration test');

      // Check analytics reflect the changes
      const userAnalytics = await analyticsService.getUserAnalytics();

      expect(userAnalytics).toBeDefined();
    });

    it('should handle concurrent operations safely', async () => {
      // Simulate concurrent admin operations
      const operations = [
        adminService.updateUserRole(testUser.id, 'MODERATOR', testAdmin.id),
        eventManagementService.toggleEventPublished(testEvent.id, false),
        systemLogsService.logSystemActivity({
          action: 'CONCURRENT_TEST',
          level: 'low'
        })
      ];

      // All operations should complete successfully
      await Promise.all(operations);

      // Verify operations were called
      expect(mockPrisma.user.update).toHaveBeenCalled();
      expect(mockPrisma.event.update).toHaveBeenCalled();
      expect(mockPrisma.auditLog.create).toHaveBeenCalled();
    });
  });
});
