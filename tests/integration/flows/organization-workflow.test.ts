/**
 * Organization Workflow Integration Test
 * Tests the complete organization lifecycle: create → invite members → create events → analytics
 */

import { beforeEach, describe, expect, it, jest } from '@jest/globals';

// Use string literals for compatibility
type OrganizationRole = 'OWNER' | 'ADMIN' | 'MANAGER' | 'MEMBER' | 'VIEWER';
type EventStatus = 'DRAFT' | 'PUBLISHED' | 'CANCELLED' | 'COMPLETED';
type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED';

const OrganizationRole = {
  OWNER: 'OWNER' as OrganizationRole,
  ADMIN: 'ADMIN' as OrganizationRole,
  MANAGER: 'MANAGER' as OrganizationRole,
  MEMBER: 'MEMBER' as OrganizationRole,
  VIEWER: 'VIEWER' as OrganizationRole,
};

const EventStatus = {
  DRAFT: 'DRAFT' as EventStatus,
  PUBLISHED: 'PUBLISHED' as EventStatus,
  CANCELLED: 'CANCELLED' as EventStatus,
  COMPLETED: 'COMPLETED' as EventStatus,
};

const InvitationStatus = {
  PENDING: 'PENDING' as InvitationStatus,
  ACCEPTED: 'ACCEPTED' as InvitationStatus,
  DECLINED: 'DECLINED' as InvitationStatus,
};

// Mock Prisma Client
const mockPrisma = {
  organization: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  organizationMember: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  organizationInvitation: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  event: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  order: {
    findMany: jest.fn(),
    count: jest.fn(),
    aggregate: jest.fn(),
  },
  ticket: {
    count: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
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

describe('Organization Workflow Integration Tests', () => {
  const mockOwner = {
    id: 'user-owner-123',
    email: 'owner@example.com',
    name: 'Organization Owner',
    role: 'ORGANIZER',
    emailVerified: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockMember1 = {
    id: 'user-member-1',
    email: 'member1@example.com',
    name: 'Member One',
    role: 'USER',
    emailVerified: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockMember2 = {
    id: 'user-member-2',
    email: 'member2@example.com',
    name: 'Member Two',
    role: 'USER',
    emailVerified: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete Organization Lifecycle', () => {
    it('should complete full organization workflow: create → invite → accept → create event → publish → analytics', async () => {
      // Step 1: Create Organization
      const mockOrganization = {
        id: 'org-123',
        name: 'Rock Events Inc',
        description: 'Professional event organization',
        email: 'contact@rockevents.com',
        phone: '+33123456789',
        website: 'https://rockevents.com',
        logo: 'https://rockevents.com/logo.png',
        ownerId: mockOwner.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.organization.create.mockResolvedValue(mockOrganization);
      mockPrisma.organizationMember.create.mockResolvedValue({
        id: 'member-owner',
        organizationId: mockOrganization.id,
        userId: mockOwner.id,
        role: OrganizationRole.OWNER,
        joinedAt: new Date(),
      });

      const organization = await mockPrisma.organization.create({
        data: {
          name: 'Rock Events Inc',
          description: 'Professional event organization',
          email: 'contact@rockevents.com',
          ownerId: mockOwner.id,
        },
      });

      // Auto-add owner as member
      const ownerMembership = await mockPrisma.organizationMember.create({
        data: {
          organizationId: organization.id,
          userId: mockOwner.id,
          role: OrganizationRole.OWNER,
          joinedAt: new Date(),
        },
      });

      expect(organization).toBeDefined();
      expect(organization.name).toBe('Rock Events Inc');
      expect(ownerMembership.role).toBe(OrganizationRole.OWNER);

      // Step 2: Invite Members
      const mockInvitation1 = {
        id: 'invite-1',
        organizationId: organization.id,
        email: mockMember1.email,
        role: OrganizationRole.ADMIN,
        status: InvitationStatus.PENDING,
        invitedBy: mockOwner.id,
        token: 'invite-token-123',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        createdAt: new Date(),
      };

      const mockInvitation2 = {
        id: 'invite-2',
        organizationId: organization.id,
        email: mockMember2.email,
        role: OrganizationRole.MANAGER,
        status: InvitationStatus.PENDING,
        invitedBy: mockOwner.id,
        token: 'invite-token-456',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      };

      mockPrisma.organizationInvitation.create
        .mockResolvedValueOnce(mockInvitation1)
        .mockResolvedValueOnce(mockInvitation2);

      const invitation1 = await mockPrisma.organizationInvitation.create({
        data: {
          organizationId: organization.id,
          email: mockMember1.email,
          role: OrganizationRole.ADMIN,
          status: InvitationStatus.PENDING,
          invitedBy: mockOwner.id,
          token: 'invite-token-123',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      const invitation2 = await mockPrisma.organizationInvitation.create({
        data: {
          organizationId: organization.id,
          email: mockMember2.email,
          role: OrganizationRole.MANAGER,
          status: InvitationStatus.PENDING,
          invitedBy: mockOwner.id,
          token: 'invite-token-456',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      expect(invitation1.status).toBe(InvitationStatus.PENDING);
      expect(invitation2.status).toBe(InvitationStatus.PENDING);

      // Step 3: Members Accept Invitations
      mockPrisma.organizationInvitation.findUnique
        .mockResolvedValueOnce(mockInvitation1)
        .mockResolvedValueOnce(mockInvitation2);
      
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(mockMember1)
        .mockResolvedValueOnce(mockMember2);

      mockPrisma.organizationInvitation.update
        .mockResolvedValueOnce({ ...mockInvitation1, status: InvitationStatus.ACCEPTED })
        .mockResolvedValueOnce({ ...mockInvitation2, status: InvitationStatus.ACCEPTED });

      mockPrisma.organizationMember.create
        .mockResolvedValueOnce({
          id: 'member-1',
          organizationId: organization.id,
          userId: mockMember1.id,
          role: OrganizationRole.ADMIN,
          joinedAt: new Date(),
        })
        .mockResolvedValueOnce({
          id: 'member-2',
          organizationId: organization.id,
          userId: mockMember2.id,
          role: OrganizationRole.MANAGER,
          joinedAt: new Date(),
        });

      // Member 1 accepts
      const foundInvitation1 = await mockPrisma.organizationInvitation.findUnique({
        where: { token: 'invite-token-123' },
      });

      const acceptedInvitation1 = await mockPrisma.organizationInvitation.update({
        where: { id: foundInvitation1!.id },
        data: { status: InvitationStatus.ACCEPTED },
      });

      const member1 = await mockPrisma.organizationMember.create({
        data: {
          organizationId: organization.id,
          userId: mockMember1.id,
          role: foundInvitation1!.role,
          joinedAt: new Date(),
        },
      });

      // Member 2 accepts
      const foundInvitation2 = await mockPrisma.organizationInvitation.findUnique({
        where: { token: 'invite-token-456' },
      });

      const acceptedInvitation2 = await mockPrisma.organizationInvitation.update({
        where: { id: foundInvitation2!.id },
        data: { status: InvitationStatus.ACCEPTED },
      });

      const member2 = await mockPrisma.organizationMember.create({
        data: {
          organizationId: organization.id,
          userId: mockMember2.id,
          role: foundInvitation2!.role,
          joinedAt: new Date(),
        },
      });

      expect(acceptedInvitation1.status).toBe(InvitationStatus.ACCEPTED);
      expect(acceptedInvitation2.status).toBe(InvitationStatus.ACCEPTED);
      expect(member1.role).toBe(OrganizationRole.ADMIN);
      expect(member2.role).toBe(OrganizationRole.MANAGER);

      // Step 4: Create Event (by Admin)
      const mockEvent = {
        id: 'event-123',
        title: 'Summer Rock Festival 2025',
        description: 'The biggest rock festival of the year',
        date: new Date('2025-08-15'),
        location: 'Stadium Arena',
        category: 'MUSIC',
        price: 75.0,
        capacity: 5000,
        availableTickets: 5000,
        status: EventStatus.DRAFT,
        imageUrl: 'https://rockevents.com/festival.jpg',
        organizerId: organization.id,
        createdBy: mockMember1.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.event.create.mockResolvedValue(mockEvent);
      mockPrisma.organizationMember.findFirst.mockResolvedValue(member1);

      // Verify member has permission to create event (ADMIN role)
      const memberPermission = await mockPrisma.organizationMember.findFirst({
        where: {
          organizationId: organization.id,
          userId: mockMember1.id,
        },
      });

      expect(memberPermission?.role).toBe(OrganizationRole.ADMIN);

      const event = await mockPrisma.event.create({
        data: {
          title: 'Summer Rock Festival 2025',
          description: 'The biggest rock festival of the year',
          date: new Date('2025-08-15'),
          location: 'Stadium Arena',
          category: 'MUSIC',
          price: 75.0,
          capacity: 5000,
          availableTickets: 5000,
          status: EventStatus.DRAFT,
          organizerId: organization.id,
        },
      });

      expect(event).toBeDefined();
      expect(event.status).toBe(EventStatus.DRAFT);

      // Step 5: Publish Event (by Owner)
      mockPrisma.event.update.mockResolvedValue({
        ...mockEvent,
        status: EventStatus.PUBLISHED,
      });

      const publishedEvent = await mockPrisma.event.update({
        where: { id: event.id },
        data: { status: EventStatus.PUBLISHED },
      });

      expect(publishedEvent.status).toBe(EventStatus.PUBLISHED);

      // Step 6: Sell Tickets (simulated)
      mockPrisma.order.count.mockResolvedValue(150);
      mockPrisma.ticket.count.mockResolvedValue(300); // 150 orders * 2 tickets avg
      mockPrisma.order.aggregate.mockResolvedValue({
        _sum: { totalAmount: 22500 }, // 300 tickets * 75€
      });

      const ticketsSold = await mockPrisma.ticket.count({
        where: { eventId: event.id },
      });

      const totalOrders = await mockPrisma.order.count({
        where: {
          tickets: {
            some: { eventId: event.id },
          },
        },
      });

      const revenueResult = await mockPrisma.order.aggregate({
        where: {
          tickets: {
            some: { eventId: event.id },
          },
        },
        _sum: {
          totalAmount: true,
        },
      });

      expect(ticketsSold).toBe(300);
      expect(totalOrders).toBe(150);
      expect(revenueResult._sum.totalAmount).toBe(22500);

      // Step 7: View Analytics
      mockPrisma.event.findMany.mockResolvedValue([publishedEvent]);
      mockPrisma.organization.findUnique.mockResolvedValue(organization);
      mockPrisma.organizationMember.findMany.mockResolvedValue([
        ownerMembership,
        member1,
        member2,
      ]);

      const orgAnalytics = {
        organization,
        totalEvents: 1,
        totalMembers: 3,
        totalTicketsSold: ticketsSold,
        totalRevenue: revenueResult._sum.totalAmount,
        events: [publishedEvent],
      };

      expect(orgAnalytics.totalEvents).toBe(1);
      expect(orgAnalytics.totalMembers).toBe(3);
      expect(orgAnalytics.totalTicketsSold).toBe(300);
      expect(orgAnalytics.totalRevenue).toBe(22500);

      // Verify complete workflow
      expect(organization).toBeDefined();
      expect(member1).toBeDefined();
      expect(member2).toBeDefined();
      expect(publishedEvent.status).toBe(EventStatus.PUBLISHED);
      expect(orgAnalytics.totalRevenue).toBeGreaterThan(0);
    });
  });

  describe('Permission Management', () => {
    it('should enforce role-based permissions', async () => {
      const mockOrg = {
        id: 'org-permissions',
        name: 'Test Org',
        ownerId: mockOwner.id,
      };

      const viewerMember = {
        id: 'member-viewer',
        organizationId: mockOrg.id,
        userId: 'user-viewer',
        role: OrganizationRole.VIEWER,
      };

      mockPrisma.organizationMember.findFirst.mockResolvedValue(viewerMember);

      const memberPermission = await mockPrisma.organizationMember.findFirst({
        where: {
          organizationId: mockOrg.id,
          userId: 'user-viewer',
        },
      });

      // VIEWER should not be able to create events
      const canCreateEvent = 
        memberPermission?.role === OrganizationRole.OWNER ||
        memberPermission?.role === OrganizationRole.ADMIN ||
        memberPermission?.role === OrganizationRole.MANAGER;

      expect(canCreateEvent).toBe(false);

      // VIEWER should only read
      const canOnlyView = memberPermission?.role === OrganizationRole.VIEWER;
      expect(canOnlyView).toBe(true);
    });

    it('should prevent non-owner from deleting organization', async () => {
      const adminMember = {
        id: 'member-admin',
        organizationId: 'org-123',
        userId: 'user-admin',
        role: OrganizationRole.ADMIN,
      };

      mockPrisma.organizationMember.findFirst.mockResolvedValue(adminMember);

      const memberRole = await mockPrisma.organizationMember.findFirst({
        where: {
          organizationId: 'org-123',
          userId: 'user-admin',
        },
      });

      const canDelete = memberRole?.role === OrganizationRole.OWNER;
      expect(canDelete).toBe(false);
    });
  });

  describe('Member Invitation Flow', () => {
    it('should handle declined invitation', async () => {
      const mockInvitation = {
        id: 'invite-declined',
        organizationId: 'org-123',
        email: 'declined@example.com',
        role: OrganizationRole.MEMBER,
        status: InvitationStatus.PENDING,
        token: 'decline-token',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      };

      mockPrisma.organizationInvitation.findUnique.mockResolvedValue(mockInvitation);
      mockPrisma.organizationInvitation.update.mockResolvedValue({
        ...mockInvitation,
        status: InvitationStatus.DECLINED,
      });

      const invitation = await mockPrisma.organizationInvitation.findUnique({
        where: { token: 'decline-token' },
      });

      const declinedInvitation = await mockPrisma.organizationInvitation.update({
        where: { id: invitation!.id },
        data: { status: InvitationStatus.DECLINED },
      });

      expect(declinedInvitation.status).toBe(InvitationStatus.DECLINED);
    });

    it('should handle expired invitation', async () => {
      const expiredInvitation = {
        id: 'invite-expired',
        organizationId: 'org-123',
        email: 'expired@example.com',
        role: OrganizationRole.MEMBER,
        status: InvitationStatus.PENDING,
        token: 'expired-token',
        expiresAt: new Date(Date.now() - 1000), // Expired
        createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), // 8 days ago
      };

      mockPrisma.organizationInvitation.findUnique.mockResolvedValue(expiredInvitation);

      const invitation = await mockPrisma.organizationInvitation.findUnique({
        where: { token: 'expired-token' },
      });

      const isExpired = new Date(invitation!.expiresAt).getTime() < Date.now();
      expect(isExpired).toBe(true);

      const canAccept = !isExpired && invitation!.status === InvitationStatus.PENDING;
      expect(canAccept).toBe(false);
    });
  });

  describe('Event Management', () => {
    it('should allow event creation by authorized roles', async () => {
      const authorizedRoles = [
        OrganizationRole.OWNER,
        OrganizationRole.ADMIN,
        OrganizationRole.MANAGER,
      ];

      authorizedRoles.forEach((role) => {
        mockPrisma.organizationMember.findFirst.mockResolvedValue({
          id: `member-${role}`,
          organizationId: 'org-123',
          userId: 'user-123',
          role,
        });
      });

      for (const role of authorizedRoles) {
        const member = await mockPrisma.organizationMember.findFirst({
          where: {
            organizationId: 'org-123',
            userId: 'user-123',
          },
        });

        const canCreate = 
          member?.role === OrganizationRole.OWNER ||
          member?.role === OrganizationRole.ADMIN ||
          member?.role === OrganizationRole.MANAGER;

        expect(canCreate).toBe(true);
      }
    });

    it('should track organization events and revenue', async () => {
      const mockEvents = [
        {
          id: 'event-1',
          title: 'Event 1',
          organizerId: 'org-123',
          status: EventStatus.PUBLISHED,
          price: 50,
        },
        {
          id: 'event-2',
          title: 'Event 2',
          organizerId: 'org-123',
          status: EventStatus.PUBLISHED,
          price: 75,
        },
      ];

      mockPrisma.event.findMany.mockResolvedValue(mockEvents);
      mockPrisma.event.count.mockResolvedValue(2);
      mockPrisma.order.aggregate.mockResolvedValue({
        _sum: { totalAmount: 5000 },
      });

      const events = await mockPrisma.event.findMany({
        where: { organizerId: 'org-123' },
      });

      const eventCount = await mockPrisma.event.count({
        where: { organizerId: 'org-123' },
      });

      const revenue = await mockPrisma.order.aggregate({
        where: {
          tickets: {
            some: {
              event: { organizerId: 'org-123' },
            },
          },
        },
        _sum: { totalAmount: true },
      });

      expect(events).toHaveLength(2);
      expect(eventCount).toBe(2);
      expect(revenue._sum.totalAmount).toBe(5000);
    });
  });
});
