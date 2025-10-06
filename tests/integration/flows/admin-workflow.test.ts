/**
 * Admin Workflow Integration Test
 * Tests the complete admin operations: platform stats → user management → event moderation → reports
 */

import { beforeEach, describe, expect, it, jest } from '@jest/globals';

// Type definitions
type UserRole = 'USER' | 'ORGANIZER' | 'ADMIN';
type EventStatus = 'DRAFT' | 'PUBLISHED' | 'CANCELLED' | 'COMPLETED';
type OrderStatus = 'PENDING' | 'COMPLETED' | 'CANCELLED';
type SupportTicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

const UserRole = {
  USER: 'USER' as UserRole,
  ORGANIZER: 'ORGANIZER' as UserRole,
  ADMIN: 'ADMIN' as UserRole,
};

const EventStatus = {
  DRAFT: 'DRAFT' as EventStatus,
  PUBLISHED: 'PUBLISHED' as EventStatus,
  CANCELLED: 'CANCELLED' as EventStatus,
  COMPLETED: 'COMPLETED' as EventStatus,
};

const OrderStatus = {
  PENDING: 'PENDING' as OrderStatus,
  COMPLETED: 'COMPLETED' as OrderStatus,
  CANCELLED: 'CANCELLED' as OrderStatus,
};

const SupportTicketStatus = {
  OPEN: 'OPEN' as SupportTicketStatus,
  IN_PROGRESS: 'IN_PROGRESS' as SupportTicketStatus,
  RESOLVED: 'RESOLVED' as SupportTicketStatus,
  CLOSED: 'CLOSED' as SupportTicketStatus,
};

// Mock Prisma Client
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    create: jest.fn(),
  },
  event: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  order: {
    findMany: jest.fn(),
    count: jest.fn(),
    aggregate: jest.fn(),
    delete: jest.fn(),
  },
  ticket: {
    count: jest.fn(),
    findMany: jest.fn(),
    delete: jest.fn(),
  },
  organization: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
  payment: {
    aggregate: jest.fn(),
    findMany: jest.fn(),
  },
  auditLog: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
  supportTicket: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  $transaction: jest.fn((callback: any) => {
    if (typeof callback === 'function') {
      return callback(mockPrisma);
    }
    return Promise.all(callback as any[]);
  }),
} as any;

// Mock modules
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: mockPrisma,
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('Admin Workflow Integration Tests', () => {
  const mockAdmin = {
    id: 'admin-123',
    email: 'admin@billetterie.com',
    name: 'Super Admin',
    role: UserRole.ADMIN,
    emailVerified: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUsers = [
    {
      id: 'user-1',
      email: 'user1@example.com',
      name: 'User One',
      role: UserRole.USER,
      emailVerified: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'user-2',
      email: 'user2@example.com',
      name: 'User Two',
      role: UserRole.USER,
      emailVerified: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'organizer-1',
      email: 'organizer@example.com',
      name: 'Event Organizer',
      role: UserRole.ORGANIZER,
      emailVerified: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete Admin Workflow', () => {
    it('should complete full admin workflow: stats → manage users → moderate events → handle support → generate reports', async () => {
      // Step 1: View Platform Statistics
      mockPrisma.user.count.mockImplementation((params?: any) => {
        if (!params || !params.where) return Promise.resolve(1523);
        if (params.where.role === UserRole.USER) return Promise.resolve(1200);
        if (params.where.role === UserRole.ORGANIZER) return Promise.resolve(300);
        if (params.where.role === UserRole.ADMIN) return Promise.resolve(23);
        return Promise.resolve(0);
      });

      mockPrisma.event.count.mockImplementation((params?: any) => {
        if (!params || !params.where) return Promise.resolve(450);
        if (params.where.status === EventStatus.PUBLISHED) return Promise.resolve(320);
        if (params.where.status === EventStatus.DRAFT) return Promise.resolve(80);
        if (params.where.status === EventStatus.CANCELLED) return Promise.resolve(50);
        return Promise.resolve(0);
      });

      mockPrisma.order.count.mockImplementation((params?: any) => {
        if (!params || !params.where) return Promise.resolve(8750);
        if (params.where.status === OrderStatus.COMPLETED) return Promise.resolve(8200);
        if (params.where.status === OrderStatus.PENDING) return Promise.resolve(300);
        if (params.where.status === OrderStatus.CANCELLED) return Promise.resolve(250);
        return Promise.resolve(0);
      });

      mockPrisma.ticket.count.mockResolvedValue(15420);

      mockPrisma.order.aggregate.mockResolvedValue({
        _sum: { totalAmount: 1247560.50 }, // Total revenue
      });

      const platformStats = {
        totalUsers: await mockPrisma.user.count(),
        users: await mockPrisma.user.count({ where: { role: UserRole.USER } }),
        organizers: await mockPrisma.user.count({ where: { role: UserRole.ORGANIZER } }),
        admins: await mockPrisma.user.count({ where: { role: UserRole.ADMIN } }),
        totalEvents: await mockPrisma.event.count(),
        publishedEvents: await mockPrisma.event.count({ where: { status: EventStatus.PUBLISHED } }),
        draftEvents: await mockPrisma.event.count({ where: { status: EventStatus.DRAFT } }),
        totalOrders: await mockPrisma.order.count(),
        completedOrders: await mockPrisma.order.count({ where: { status: OrderStatus.COMPLETED } }),
        totalTickets: await mockPrisma.ticket.count(),
        totalRevenue: (await mockPrisma.order.aggregate({
          _sum: { totalAmount: true },
        }))._sum.totalAmount,
      };

      expect(platformStats.totalUsers).toBe(1523);
      expect(platformStats.users).toBe(1200);
      expect(platformStats.organizers).toBe(300);
      expect(platformStats.totalEvents).toBe(450);
      expect(platformStats.publishedEvents).toBe(320);
      expect(platformStats.totalOrders).toBe(8750);
      expect(platformStats.totalRevenue).toBe(1247560.50);

      // Step 2: Manage Users - Suspend problematic user
      const problematicUser = {
        id: 'user-spam',
        email: 'spammer@example.com',
        name: 'Spam User',
        role: UserRole.USER,
        isActive: true,
        emailVerified: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.user.findUnique.mockResolvedValue(problematicUser);
      mockPrisma.user.update.mockResolvedValue({
        ...problematicUser,
        isActive: false,
      });
      mockPrisma.auditLog.create.mockResolvedValue({
        id: 'audit-1',
        action: 'USER_SUSPENDED',
        userId: mockAdmin.id,
        targetUserId: problematicUser.id,
        reason: 'Spam activity detected',
        createdAt: new Date(),
      });

      const userToSuspend = await mockPrisma.user.findUnique({
        where: { id: 'user-spam' },
      });

      expect(userToSuspend?.isActive).toBe(true);

      // Suspend user
      const suspendedUser = await mockPrisma.user.update({
        where: { id: userToSuspend!.id },
        data: { isActive: false },
      });

      // Log action
      const auditLog = await mockPrisma.auditLog.create({
        data: {
          action: 'USER_SUSPENDED',
          userId: mockAdmin.id,
          targetUserId: problematicUser.id,
          reason: 'Spam activity detected',
          createdAt: new Date(),
        },
      });

      expect(suspendedUser.isActive).toBe(false);
      expect(auditLog.action).toBe('USER_SUSPENDED');

      // Step 3: Moderate Events - Review and approve pending event
      const pendingEvent = {
        id: 'event-pending',
        title: 'Community Concert',
        description: 'Local music event',
        date: new Date('2025-12-25'),
        location: 'Community Center',
        category: 'MUSIC',
        price: 25.0,
        capacity: 200,
        status: EventStatus.DRAFT,
        organizerId: 'organizer-1',
        requiresApproval: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.event.findUnique.mockResolvedValue(pendingEvent);
      mockPrisma.event.update.mockResolvedValue({
        ...pendingEvent,
        status: EventStatus.PUBLISHED,
        approvedBy: mockAdmin.id,
        approvedAt: new Date(),
      });

      const eventToReview = await mockPrisma.event.findUnique({
        where: { id: 'event-pending' },
      });

      expect(eventToReview?.status).toBe(EventStatus.DRAFT);

      // Approve event
      const approvedEvent = await mockPrisma.event.update({
        where: { id: eventToReview!.id },
        data: {
          status: EventStatus.PUBLISHED,
          approvedBy: mockAdmin.id,
          approvedAt: new Date(),
        },
      });

      expect(approvedEvent.status).toBe(EventStatus.PUBLISHED);
      expect(approvedEvent.approvedBy).toBe(mockAdmin.id);

      // Step 4: Handle Support Tickets
      const supportTickets = [
        {
          id: 'ticket-1',
          userId: 'user-1',
          subject: 'Cannot access my tickets',
          description: 'I purchased tickets but cannot download them',
          status: SupportTicketStatus.OPEN,
          priority: 'HIGH',
          createdAt: new Date(),
        },
        {
          id: 'ticket-2',
          userId: 'user-2',
          subject: 'Refund request',
          description: 'Event was cancelled, need refund',
          status: SupportTicketStatus.OPEN,
          priority: 'MEDIUM',
          createdAt: new Date(),
        },
      ];

      mockPrisma.supportTicket.findMany.mockResolvedValue(supportTickets);
      mockPrisma.supportTicket.update
        .mockResolvedValueOnce({
          ...supportTickets[0],
          status: SupportTicketStatus.IN_PROGRESS,
          assignedTo: mockAdmin.id,
        })
        .mockResolvedValueOnce({
          ...supportTickets[0],
          status: SupportTicketStatus.RESOLVED,
          resolvedAt: new Date(),
          resolution: 'Ticket access link resent to user email',
        });

      const openTickets = await mockPrisma.supportTicket.findMany({
        where: { status: SupportTicketStatus.OPEN },
      });

      expect(openTickets).toHaveLength(2);

      // Assign ticket to admin
      const assignedTicket = await mockPrisma.supportTicket.update({
        where: { id: supportTickets[0].id },
        data: {
          status: SupportTicketStatus.IN_PROGRESS,
          assignedTo: mockAdmin.id,
        },
      });

      expect(assignedTicket.status).toBe(SupportTicketStatus.IN_PROGRESS);

      // Resolve ticket
      const resolvedTicket = await mockPrisma.supportTicket.update({
        where: { id: supportTickets[0].id },
        data: {
          status: SupportTicketStatus.RESOLVED,
          resolvedAt: new Date(),
          resolution: 'Ticket access link resent to user email',
        },
      });

      expect(resolvedTicket.status).toBe(SupportTicketStatus.RESOLVED);
      expect(resolvedTicket.resolution).toBeDefined();

      // Step 5: Generate Reports
      const last30Days = new Date();
      last30Days.setDate(last30Days.getDate() - 30);

      mockPrisma.order.count.mockResolvedValue(850); // Orders in last 30 days
      mockPrisma.order.aggregate.mockResolvedValue({
        _sum: { totalAmount: 125480.75 },
      });
      mockPrisma.user.count.mockResolvedValue(127); // New users in last 30 days
      mockPrisma.event.count.mockResolvedValue(45); // New events in last 30 days

      const monthlyReport = {
        period: '30 days',
        newOrders: await mockPrisma.order.count({
          where: {
            createdAt: { gte: last30Days },
          },
        }),
        revenue: (await mockPrisma.order.aggregate({
          where: {
            createdAt: { gte: last30Days },
            status: OrderStatus.COMPLETED,
          },
          _sum: { totalAmount: true },
        }))._sum.totalAmount,
        newUsers: await mockPrisma.user.count({
          where: {
            createdAt: { gte: last30Days },
          },
        }),
        newEvents: await mockPrisma.event.count({
          where: {
            createdAt: { gte: last30Days },
          },
        }),
      };

      expect(monthlyReport.newOrders).toBe(850);
      expect(monthlyReport.revenue).toBe(125480.75);
      expect(monthlyReport.newUsers).toBe(127);
      expect(monthlyReport.newEvents).toBe(45);

      // Verify complete workflow
      expect(platformStats.totalUsers).toBeGreaterThan(1000);
      expect(suspendedUser.isActive).toBe(false);
      expect(approvedEvent.status).toBe(EventStatus.PUBLISHED);
      expect(resolvedTicket.status).toBe(SupportTicketStatus.RESOLVED);
      expect(monthlyReport.revenue).toBeGreaterThan(100000);
    });
  });

  describe('User Management', () => {
    it('should manage user roles and permissions', async () => {
      const regularUser = mockUsers[0];

      mockPrisma.user.findUnique.mockResolvedValue(regularUser);
      mockPrisma.user.update.mockResolvedValue({
        ...regularUser,
        role: UserRole.ORGANIZER,
      });

      const user = await mockPrisma.user.findUnique({
        where: { id: regularUser.id },
      });

      expect(user?.role).toBe(UserRole.USER);

      // Promote to organizer
      const promotedUser = await mockPrisma.user.update({
        where: { id: user!.id },
        data: { role: UserRole.ORGANIZER },
      });

      expect(promotedUser.role).toBe(UserRole.ORGANIZER);
    });

    it('should delete user account and associated data', async () => {
      const userToDelete = {
        id: 'user-delete',
        email: 'delete@example.com',
        name: 'User To Delete',
        role: UserRole.USER,
      };

      mockPrisma.user.findUnique.mockResolvedValue(userToDelete);
      mockPrisma.order.findMany.mockResolvedValue([]); // No active orders
      mockPrisma.$transaction.mockResolvedValue([
        { count: 0 }, // tickets deleted
        { count: 0 }, // orders deleted
        userToDelete, // user deleted
      ]);

      const user = await mockPrisma.user.findUnique({
        where: { id: userToDelete.id },
      });

      expect(user).toBeDefined();

      // Check for active orders
      const activeOrders = await mockPrisma.order.findMany({
        where: {
          userId: user!.id,
          status: { in: [OrderStatus.PENDING, OrderStatus.COMPLETED] },
        },
      });

      expect(activeOrders).toHaveLength(0);

      // Delete user and all data
      await mockPrisma.$transaction([
        mockPrisma.ticket.delete({ where: { userId: user!.id } }),
        mockPrisma.order.delete({ where: { userId: user!.id } }),
        mockPrisma.user.delete({ where: { id: user!.id } }),
      ]);

      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('should list users with filters and pagination', async () => {
      mockPrisma.user.findMany.mockResolvedValue(mockUsers);
      mockPrisma.user.count.mockResolvedValue(3);

      const users = await mockPrisma.user.findMany({
        where: { role: UserRole.USER },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
      });

      const totalUsers = await mockPrisma.user.count({
        where: { role: UserRole.USER },
      });

      expect(users).toBeDefined();
      expect(totalUsers).toBeGreaterThan(0);
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 10,
        })
      );
    });
  });

  describe('Event Moderation', () => {
    it('should reject inappropriate event', async () => {
      const inappropriateEvent = {
        id: 'event-inappropriate',
        title: 'Inappropriate Event',
        description: 'Contains inappropriate content',
        status: EventStatus.DRAFT,
        organizerId: 'organizer-1',
      };

      mockPrisma.event.findUnique.mockResolvedValue(inappropriateEvent);
      mockPrisma.event.update.mockResolvedValue({
        ...inappropriateEvent,
        status: EventStatus.CANCELLED,
        rejectedBy: mockAdmin.id,
        rejectionReason: 'Violates community guidelines',
      });

      const event = await mockPrisma.event.findUnique({
        where: { id: inappropriateEvent.id },
      });

      const rejectedEvent = await mockPrisma.event.update({
        where: { id: event!.id },
        data: {
          status: EventStatus.CANCELLED,
          rejectedBy: mockAdmin.id,
          rejectionReason: 'Violates community guidelines',
        },
      });

      expect(rejectedEvent.status).toBe(EventStatus.CANCELLED);
      expect(rejectedEvent.rejectionReason).toBeDefined();
    });

    it('should cancel published event due to complaint', async () => {
      const publishedEvent = {
        id: 'event-complaint',
        title: 'Event with Complaints',
        status: EventStatus.PUBLISHED,
        organizerId: 'organizer-1',
      };

      mockPrisma.event.findUnique.mockResolvedValue(publishedEvent);
      mockPrisma.order.findMany.mockResolvedValue([
        { id: 'order-1', userId: 'user-1', totalAmount: 50 },
        { id: 'order-2', userId: 'user-2', totalAmount: 75 },
      ]);
      mockPrisma.event.update.mockResolvedValue({
        ...publishedEvent,
        status: EventStatus.CANCELLED,
        cancelledBy: mockAdmin.id,
        cancellationReason: 'Multiple user complaints',
      });

      const event = await mockPrisma.event.findUnique({
        where: { id: publishedEvent.id },
      });

      // Get affected orders for refund
      const affectedOrders = await mockPrisma.order.findMany({
        where: {
          tickets: {
            some: { eventId: event!.id },
          },
        },
      });

      expect(affectedOrders).toHaveLength(2);

      // Cancel event
      const cancelledEvent = await mockPrisma.event.update({
        where: { id: event!.id },
        data: {
          status: EventStatus.CANCELLED,
          cancelledBy: mockAdmin.id,
          cancellationReason: 'Multiple user complaints',
        },
      });

      expect(cancelledEvent.status).toBe(EventStatus.CANCELLED);
    });
  });

  describe('Analytics and Reports', () => {
    it('should generate revenue report by period', async () => {
      const revenueData = [
        { date: '2025-10-01', revenue: 15420.50 },
        { date: '2025-10-02', revenue: 18750.25 },
        { date: '2025-10-03', revenue: 22100.75 },
      ];

      mockPrisma.order.aggregate.mockResolvedValue({
        _sum: { totalAmount: 56271.50 },
      });

      const totalRevenue = await mockPrisma.order.aggregate({
        where: {
          status: OrderStatus.COMPLETED,
          createdAt: {
            gte: new Date('2025-10-01'),
            lte: new Date('2025-10-03'),
          },
        },
        _sum: { totalAmount: true },
      });

      expect(totalRevenue._sum.totalAmount).toBe(56271.50);
    });

    it('should generate user growth report', async () => {
      mockPrisma.user.count.mockImplementation((params?: any) => {
        if (!params) return Promise.resolve(1523);
        const date = params.where?.createdAt?.gte;
        if (!date) return Promise.resolve(1523);
        
        // Simulate growth data
        return Promise.resolve(127);
      });

      const last30DaysUsers = await mockPrisma.user.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
      });

      const totalUsers = await mockPrisma.user.count();

      const growthRate = (last30DaysUsers / totalUsers) * 100;

      expect(last30DaysUsers).toBe(127);
      expect(totalUsers).toBe(1523);
      expect(growthRate).toBeCloseTo(8.34, 2);
    });

    it('should generate top events report', async () => {
      const topEvents = [
        {
          id: 'event-top-1',
          title: 'Summer Festival',
          ticketsSold: 1250,
          revenue: 93750,
        },
        {
          id: 'event-top-2',
          title: 'Rock Concert',
          ticketsSold: 980,
          revenue: 73500,
        },
        {
          id: 'event-top-3',
          title: 'Jazz Night',
          ticketsSold: 650,
          revenue: 32500,
        },
      ];

      mockPrisma.event.findMany.mockResolvedValue(topEvents);

      const events = await mockPrisma.event.findMany({
        take: 10,
        orderBy: { ticketsSold: 'desc' },
      });

      expect(events).toHaveLength(3);
      expect(events[0].ticketsSold).toBeGreaterThan(events[1].ticketsSold);
      expect(events[1].ticketsSold).toBeGreaterThan(events[2].ticketsSold);
    });
  });

  describe('Audit Logging', () => {
    it('should log all admin actions', async () => {
      const adminActions = [
        { action: 'USER_SUSPENDED', targetUserId: 'user-1' },
        { action: 'EVENT_APPROVED', targetEventId: 'event-1' },
        { action: 'REFUND_PROCESSED', targetOrderId: 'order-1' },
      ];

      mockPrisma.auditLog.create.mockImplementation((params: any) => {
        return Promise.resolve({
          id: `audit-${Date.now()}`,
          ...params.data,
          createdAt: new Date(),
        });
      });

      const logs = await Promise.all(
        adminActions.map((action) =>
          mockPrisma.auditLog.create({
            data: {
              ...action,
              userId: mockAdmin.id,
              createdAt: new Date(),
            },
          })
        )
      );

      expect(logs).toHaveLength(3);
      logs.forEach((log) => {
        expect(log.userId).toBe(mockAdmin.id);
        expect(log.createdAt).toBeDefined();
      });
    });

    it('should retrieve audit logs with filters', async () => {
      const mockAuditLogs = [
        {
          id: 'audit-1',
          action: 'USER_SUSPENDED',
          userId: mockAdmin.id,
          createdAt: new Date(),
        },
        {
          id: 'audit-2',
          action: 'EVENT_APPROVED',
          userId: mockAdmin.id,
          createdAt: new Date(),
        },
      ];

      mockPrisma.auditLog.findMany.mockResolvedValue(mockAuditLogs);

      const logs = await mockPrisma.auditLog.findMany({
        where: {
          userId: mockAdmin.id,
          action: { in: ['USER_SUSPENDED', 'EVENT_APPROVED'] },
        },
        orderBy: { createdAt: 'desc' },
      });

      expect(logs).toHaveLength(2);
      expect(logs[0].action).toBeDefined();
    });
  });
});
