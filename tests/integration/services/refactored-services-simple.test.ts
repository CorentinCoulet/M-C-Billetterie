// Mock Prisma avant tous les imports
jest.mock('../../../src/lib/prisma', () => {
  // Create mock inline to avoid hoisting issues
  const createMockModel = () => ({
    findUnique: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    createMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    upsert: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(),
    aggregate: jest.fn(),
    groupBy: jest.fn(),
  });

  const mockPrismaInstance = {
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    $queryRaw: jest.fn(),
    $executeRaw: jest.fn(),
    $transaction: jest.fn().mockImplementation((callback: any) => callback(mockPrismaInstance)),
    user: createMockModel(),
    organizer: createMockModel(),
    event: createMockModel(),
    order: createMockModel(),
    ticket: createMockModel(),
    payment: createMockModel(),
    category: createMockModel(),
    venue: createMockModel(),
    review: createMockModel(),
    teamMember: createMockModel(),
    theme: createMockModel(),
    qRCode: createMockModel(),
    activityLog: createMockModel(),
    eventLog: createMockModel(),
    notification: createMockModel(),
    session: createMockModel(),
    blockedUser: createMockModel(),
    translation: createMockModel(),
    securityLog: createMockModel(),
    passwordHistory: createMockModel(),
    loginAttempt: createMockModel(),
    systemBackup: createMockModel(),
    auditLog: createMockModel(),
    userSession: createMockModel(),
    blockedIP: createMockModel(),
  };

  return {
    __esModule: true,
    default: mockPrismaInstance,
    prisma: mockPrismaInstance,
  };
});

import prisma from '../../../src/lib/prisma';
import { adminService } from '../../../src/services/adminService';
import { analyticsService } from '../../../src/services/analyticsService';
import { eventManagementService } from '../../../src/services/eventManagementService';
import { systemLogsService } from '../../../src/services/systemLogsService';

// Get the mocked prisma instance
const mockPrisma = prisma as any;

describe('Refactored Services - Basic Integration Tests', () => {
  beforeEach(async () => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Setup default mock returns
    mockPrisma.auditLog.deleteMany.mockResolvedValue({ count: 0 });
    mockPrisma.ticket.deleteMany.mockResolvedValue({ count: 0 });
    mockPrisma.order.deleteMany.mockResolvedValue({ count: 0 });
    mockPrisma.event.deleteMany.mockResolvedValue({ count: 0 });
    mockPrisma.organizer.deleteMany.mockResolvedValue({ count: 0 });
    mockPrisma.user.deleteMany.mockResolvedValue({ count: 0 });
    
    // Setup mock returns for creates
    mockPrisma.user.create.mockImplementation((args: any) => 
      Promise.resolve({ 
        id: 'mock-user-id', 
        ...args.data, 
        createdAt: new Date(), 
        updatedAt: new Date() 
      })
    );
    mockPrisma.organizer.create.mockImplementation((args: any) => 
      Promise.resolve({ 
        id: 'mock-organizer-id', 
        ...args.data, 
        createdAt: new Date(), 
        updatedAt: new Date() 
      })
    );
    mockPrisma.event.create.mockImplementation((args: any) => 
      Promise.resolve({ 
        id: 'mock-event-id', 
        ...args.data, 
        createdAt: new Date(), 
        updatedAt: new Date() 
      })
    );
  });

  afterAll(async () => {
    jest.clearAllMocks();
  });

  describe('AnalyticsService', () => {
    test('should get dashboard statistics with empty data', async () => {
      // Mock the database queries for analytics
      mockPrisma.user.count.mockResolvedValue(0);
      mockPrisma.event.count
        .mockResolvedValueOnce(0) // total events
        .mockResolvedValueOnce(0) // upcoming events  
        .mockResolvedValueOnce(0); // published events
      
      // Mock order statistics (called by getOrderStatisticsInternal)
      mockPrisma.order.count
        .mockResolvedValueOnce(0) // total orders
        .mockResolvedValueOnce(0) // completed orders (paid)
        .mockResolvedValueOnce(0) // pending orders
        .mockResolvedValueOnce(0); // cancelled orders
      
      // Mock order aggregates for revenue
      mockPrisma.order.aggregate.mockResolvedValue({
        _sum: { totalPrice: 0 }
      });
      
      const stats = await analyticsService.getDashboardStatistics();
      
      expect(stats).toHaveProperty('users');
      expect(stats).toHaveProperty('events');
      expect(stats).toHaveProperty('orders');
      expect(stats.users.total).toBe(0);
      expect(stats.events.total).toBe(0);
      expect(stats.orders.total).toBe(0);
    });

    test('should get sales statistics', async () => {
      // Mock the database queries for sales stats
      mockPrisma.order.count.mockResolvedValue(0);
      mockPrisma.order.groupBy.mockResolvedValue([]);
      mockPrisma.order.findMany.mockResolvedValue([]);
      
      const salesStats = await analyticsService.getSalesStatistics();
      
      expect(salesStats).toHaveProperty('totalOrders');
      expect(salesStats).toHaveProperty('totalRevenue');
      expect(salesStats).toHaveProperty('averageOrderValue');
      expect(salesStats.totalRevenue).toBe(0);
      expect(salesStats.totalOrders).toBe(0);
      expect(salesStats.averageOrderValue).toBe(0);
    });
  });

  describe('SystemLogsService', () => {
    test('should log system activity correctly', async () => {
      // Mock user creation
      const mockUser = {
        id: 'mock-user-id',
        email: 'test@logging.com',
        name: 'Test User',
        password: 'hashedpassword',
        role: 'USER',
        isVerified: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      mockPrisma.user.create.mockResolvedValue(mockUser);
      mockPrisma.user.findUnique.mockResolvedValue({ email: mockUser.email });

      // Create a test user
      const user = await mockPrisma.user.create({
        data: {
          email: 'test@logging.com',
          name: 'Test User',
          password: 'hashedpassword',
          role: 'USER',
          isVerified: true
        }
      });

      // Mock the audit log creation
      const mockAuditLog = {
        id: 'log-id',
        action: 'TEST_ACTIVITY',
        resourceType: 'user',
        resourceId: user.id,
        userId: user.id,
        userEmail: user.email,
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
        details: JSON.stringify({ test: 'data' }),
        result: 'success',
        riskLevel: 'low',
        timestamp: new Date(),
        eventHash: 'mock-hash',
        isSensitive: false
      };

      mockPrisma.auditLog.create.mockResolvedValue(mockAuditLog);
      mockPrisma.auditLog.findMany.mockResolvedValue([{
        ...mockAuditLog,
        User: { name: user.name, email: user.email }
      }]);
      mockPrisma.auditLog.count.mockResolvedValue(1);

      // Log an activity
      await systemLogsService.logSystemActivity({
        action: 'TEST_ACTIVITY',
        resourceType: 'user',
        resourceId: user.id,
        userId: user.id,
        ip: '127.0.0.1',
        userAgent: 'test-agent',
        details: JSON.stringify({ test: 'data' }),
        result: 'success',
        level: 'low'
      });

      const logs = await systemLogsService.getSystemLogs();
      
      expect(logs).toHaveProperty('logs');
      expect(logs.logs).toHaveLength(1);
      expect(logs.logs[0].action).toBe('TEST_ACTIVITY');
      expect(logs.logs[0].userId).toBe(user.id);
    });

    test('should log security event', async () => {
      // Mock user creation
      const mockUser = {
        id: 'security-user-id',
        email: 'security@test.com',
        name: 'Security User',
        password: 'hashedpassword',
        role: 'USER',
        isVerified: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      mockPrisma.user.create.mockResolvedValue(mockUser);
      mockPrisma.user.findUnique.mockResolvedValue({ email: mockUser.email });

      // Create a test user
      const user = await mockPrisma.user.create({
        data: {
          email: 'security@test.com',
          name: 'Security User',
          password: 'hashedpassword',
          role: 'USER',
          isVerified: true
        }
      });

      // Mock the security log
      const mockSecurityLog = {
        id: 'security-log-id',
        action: 'LOGIN_FAILED',
        resourceType: 'user',
        resourceId: user.id,
        userId: user.id,
        userEmail: user.email,
        ipAddress: '192.168.1.100',
        userAgent: 'malicious-agent',
        details: JSON.stringify({ attempts: 3, reason: 'invalid_password' }),
        result: 'failure',
        riskLevel: 'high',
        timestamp: new Date(),
        eventHash: 'mock-hash',
        isSensitive: true
      };

      mockPrisma.auditLog.create.mockResolvedValue(mockSecurityLog);
      mockPrisma.auditLog.findMany.mockResolvedValue([{
        ...mockSecurityLog,
        User: { name: user.name, email: user.email }
      }]);
      mockPrisma.auditLog.count.mockResolvedValue(1);

      // Log a security event manually through the logging method
      await systemLogsService.logSystemActivity({
        action: 'LOGIN_FAILED',
        resourceType: 'user',
        resourceId: user.id,
        userId: user.id,
        ip: '192.168.1.100',
        userAgent: 'malicious-agent',
        details: JSON.stringify({ attempts: 3, reason: 'invalid_password' }),
        result: 'failure',
        level: 'high'
      });

      const logs = await systemLogsService.getSystemLogs();
      
      expect(logs.logs).toHaveLength(1);
      expect(logs.logs[0].action).toBe('LOGIN_FAILED');
      expect(logs.logs[0].ipAddress).toBe('192.168.1.100');
      expect(logs.logs[0].riskLevel).toBe('high');
    });
  });

  describe('EventManagementService', () => {
    test('should get event management stats with no events', async () => {
      // Mock the database queries for event management stats
      mockPrisma.event.count
        .mockResolvedValueOnce(0) // total
        .mockResolvedValueOnce(0) // upcoming
        .mockResolvedValueOnce(0) // published
        .mockResolvedValueOnce(0) // draft
        .mockResolvedValueOnce(0); // cancelled
      
      mockPrisma.event.findMany.mockResolvedValue([]);
      mockPrisma.ticket.aggregate.mockResolvedValue({ _sum: { quantity: 0 } });
      
      const stats = await eventManagementService.getEventManagementStats();
      
      expect(stats).toHaveProperty('events');
      expect(stats.events).toHaveProperty('total');
      expect(stats.events).toHaveProperty('published');
      expect(stats.events).toHaveProperty('cancelled');
      expect(stats.events.total).toBe(0);
      expect(stats.events.published).toBe(0);
      expect(stats.events.cancelled).toBe(0);
    });

    test('should cancel event', async () => {
      // Mock organizer creation
      const mockOrganizer = {
        id: 'mock-organizer-id',
        name: 'Test Organizer',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      mockPrisma.organizer.create.mockResolvedValue(mockOrganizer);

      // Mock event creation and update
      const mockEvent = {
        id: 'mock-event-id',
        title: 'Test Event',
        description: 'Test Description',
        date: new Date(),
        location: 'Test Location',
        maxCapacity: 100,
        isPublished: true,
        isCancelled: false,
        organizerId: mockOrganizer.id,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockCancelledEvent = {
        ...mockEvent,
        isCancelled: true
      };

      mockPrisma.event.create.mockResolvedValue(mockEvent);
      mockPrisma.event.update.mockResolvedValue(mockCancelledEvent);

      // Create test organizer
      const organizer = await mockPrisma.organizer.create({
        data: {
          name: 'Test Organizer'
        }
      });

      // Create test event
      const event = await mockPrisma.event.create({
        data: {
          title: 'Test Event',
          description: 'Test Description',
          date: new Date(),
          location: 'Test Location',
          maxCapacity: 100,
          isPublished: true,
          isCancelled: false,
          organizerId: organizer.id
        }
      });

      const cancelledEvent = await eventManagementService.cancelEvent(event.id, 'Test cancellation');
      expect(cancelledEvent.isCancelled).toBe(true);
    });
  });

  describe('AdminService with Delegation', () => {
    test('should get user details', async () => {
      const mockUser = {
        id: 'admin-user-id',
        email: 'admin@test.com',
        name: 'Admin Test User',
        password: 'hashedpassword',
        role: 'USER',
        isVerified: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      mockPrisma.user.create.mockResolvedValue(mockUser);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.order.findMany.mockResolvedValue([]);
      mockPrisma.ticket.findMany.mockResolvedValue([]);
      mockPrisma.loginAttempt.findMany.mockResolvedValue([]);
      mockPrisma.blockedUser.findUnique.mockResolvedValue(null);

      const user = await mockPrisma.user.create({
        data: {
          email: 'admin@test.com',
          name: 'Admin Test User',
          password: 'hashedpassword',
          role: 'USER',
          isVerified: true
        }
      });

      const userDetails = await adminService.getUserDetails(user.id);

      expect(userDetails).toHaveProperty('user');
      expect(userDetails.user.id).toBe(user.id);
      expect(userDetails.user.email).toBe('admin@test.com');
    });

    test('should perform system maintenance check', async () => {
      const mockAdminUser = {
        id: 'maintenance-user-id',
        email: 'maintenance@test.com',
        name: 'Maintenance User',
        password: 'hashedpassword',
        role: 'ADMIN',
        isVerified: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      mockPrisma.user.create.mockResolvedValue(mockAdminUser);
      
      // Mock the system maintenance operations
      mockPrisma.auditLog.deleteMany.mockResolvedValue({ count: 5 });
      mockPrisma.userSession.deleteMany.mockResolvedValue({ count: 3 });
      mockPrisma.user.count.mockResolvedValue(10);
      mockPrisma.event.count.mockResolvedValue(5);
      mockPrisma.order.count.mockResolvedValue(15);
      mockPrisma.ticket.count.mockResolvedValue(25);

      const adminUser = await mockPrisma.user.create({
        data: {
          email: 'maintenance@test.com',
          name: 'Maintenance User',
          password: 'hashedpassword',
          role: 'ADMIN',
          isVerified: true
        }
      });

      const result = await adminService.performSystemMaintenance(adminUser.id, { 
        cleanupLogs: true, 
        cleanupSessions: true, 
        optimizeDatabase: false 
      });

      expect(result).toHaveProperty('results');
      expect(Array.isArray(result.results)).toBe(true);
    });
  });
});
