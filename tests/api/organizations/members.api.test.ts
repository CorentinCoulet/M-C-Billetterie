/**
 * API Tests - Organization Members
 * 
 * Tests for organization member management endpoints
 * - GET /api/organizations/:id/members - List members
 * - POST /api/organizations/:id/members - Add a member
 * - DELETE /api/organizations/:id/members/:userId - Remove a member
 */

import * as jwt from '@/lib/jwt';
import { prisma } from '@/lib/prisma';
import { NextRequest } from 'next/server';
import {
    POST as addMember,
    GET as getMembers,
    DELETE as removeMember,
} from '../../../app/api/organizations/[id]/members/route';

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    organizer: {
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    teamMember: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  },
}));

// Mock JWT
jest.mock('@/lib/jwt', () => ({
  verifyToken: jest.fn(),
}));

describe('API Organizations - Members Management', () => {
  const mockUserId = 'user-123';
  const mockOrganizerId = 'org-456';
  const mockToken = 'valid-token';

  beforeEach(() => {
    jest.clearAllMocks();
    (jwt.verifyToken as jest.Mock).mockResolvedValue({ userId: mockUserId });
  });

  describe('GET /api/organizations/:id/members - List Members', () => {
    it('should return members list for authorized user', async () => {
      const mockOrganizer = {
        id: mockOrganizerId,
        name: 'Test Organization',
      };

      const mockMembers = [
        {
          id: 'member-1',
          organizerId: mockOrganizerId,
          userId: mockUserId,
          role: 'OWNER',
          joinedAt: new Date(),
          user: {
            id: mockUserId,
            email: 'owner@test.com',
            name: 'Owner User',
            role: 'ORGANIZER',
          },
        },
        {
          id: 'member-2',
          organizerId: mockOrganizerId,
          userId: 'user-789',
          role: 'MEMBER',
          joinedAt: new Date(),
          user: {
            id: 'user-789',
            email: 'member@test.com',
            name: 'Member User',
            role: 'USER',
          },
        },
      ];

      (prisma.organizer.findUnique as jest.Mock).mockResolvedValue(mockOrganizer);
      (prisma.teamMember.findFirst as jest.Mock).mockResolvedValue({
        id: 'member-1',
        role: 'OWNER',
      });
      (prisma.teamMember.findMany as jest.Mock).mockResolvedValue(mockMembers);

      const request = new NextRequest(
        `http://localhost/api/organizations/${mockOrganizerId}/members`,
        {
          method: 'GET',
          headers: {
            'authorization': `Bearer ${mockToken}`,
          },
        }
      );

      const response = await getMembers(request, { params: { id: mockOrganizerId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(2);
      expect(data[0].role).toBe('OWNER');
      expect(data[1].role).toBe('MEMBER');
    });

    it('should reject if organization not found', async () => {
      (prisma.organizer.findUnique as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest(
        `http://localhost/api/organizations/${mockOrganizerId}/members`,
        {
          method: 'GET',
          headers: {
            'authorization': `Bearer ${mockToken}`,
          },
        }
      );

      const response = await getMembers(request, { params: { id: mockOrganizerId } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain('not found');
    });

    it('should reject if user is not a member', async () => {
      const mockOrganizer = {
        id: mockOrganizerId,
        name: 'Test Organization',
      };

      (prisma.organizer.findUnique as jest.Mock).mockResolvedValue(mockOrganizer);
      (prisma.teamMember.findFirst as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest(
        `http://localhost/api/organizations/${mockOrganizerId}/members`,
        {
          method: 'GET',
          headers: {
            'authorization': `Bearer ${mockToken}`,
          },
        }
      );

      const response = await getMembers(request, { params: { id: mockOrganizerId } });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('Access denied');
    });
  });

  describe('POST /api/organizations/:id/members - Add Member', () => {
    it('should add member with OWNER permission', async () => {
      const mockOrganizer = {
        id: mockOrganizerId,
        name: 'Test Organization',
      };

      const mockUser = {
        id: 'new-user-123',
        email: 'newuser@test.com',
        name: 'New User',
        role: 'USER',
      };

      const mockNewMember = {
        id: 'member-new',
        organizerId: mockOrganizerId,
        userId: 'new-user-123',
        role: 'MEMBER',
        joinedAt: new Date(),
        user: mockUser,
      };

      (prisma.organizer.findUnique as jest.Mock).mockResolvedValue(mockOrganizer);
      (prisma.teamMember.findFirst as jest.Mock)
        .mockResolvedValueOnce({ id: 'member-1', role: 'OWNER' }) // Permission check
        .mockResolvedValueOnce(null); // Existing member check
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.teamMember.create as jest.Mock).mockResolvedValue(mockNewMember);

      const request = new NextRequest(
        `http://localhost/api/organizations/${mockOrganizerId}/members`,
        {
          method: 'POST',
          headers: {
            'authorization': `Bearer ${mockToken}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            userId: 'new-user-123',
            role: 'MEMBER',
          }),
        }
      );

      const response = await addMember(request, { params: { id: mockOrganizerId } });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.userId).toBe('new-user-123');
      expect(data.role).toBe('MEMBER');
    });

    it('should allow ADMIN to add member', async () => {
      const mockOrganizer = {
        id: mockOrganizerId,
        name: 'Test Organization',
      };

      const mockUser = {
        id: 'new-user-123',
        email: 'newuser@test.com',
        role: 'USER',
      };

      const mockNewMember = {
        id: 'member-new',
        organizerId: mockOrganizerId,
        userId: 'new-user-123',
        role: 'MEMBER',
        user: mockUser,
      };

      (prisma.organizer.findUnique as jest.Mock).mockResolvedValue(mockOrganizer);
      (prisma.teamMember.findFirst as jest.Mock)
        .mockResolvedValueOnce({ id: 'member-1', role: 'ADMIN' })
        .mockResolvedValueOnce(null);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.teamMember.create as jest.Mock).mockResolvedValue(mockNewMember);

      const request = new NextRequest(
        `http://localhost/api/organizations/${mockOrganizerId}/members`,
        {
          method: 'POST',
          headers: {
            'authorization': `Bearer ${mockToken}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            userId: 'new-user-123',
            role: 'MEMBER',
          }),
        }
      );

      const response = await addMember(request, { params: { id: mockOrganizerId } });

      expect(response.status).toBe(201);
    });

    it('should allow MANAGER to add member', async () => {
      const mockOrganizer = {
        id: mockOrganizerId,
        name: 'Test Organization',
      };

      const mockUser = {
        id: 'new-user-123',
        email: 'newuser@test.com',
        role: 'USER',
      };

      const mockNewMember = {
        id: 'member-new',
        organizerId: mockOrganizerId,
        userId: 'new-user-123',
        role: 'MEMBER',
        user: mockUser,
      };

      (prisma.organizer.findUnique as jest.Mock).mockResolvedValue(mockOrganizer);
      (prisma.teamMember.findFirst as jest.Mock)
        .mockResolvedValueOnce({ id: 'member-1', role: 'MANAGER' })
        .mockResolvedValueOnce(null);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.teamMember.create as jest.Mock).mockResolvedValue(mockNewMember);

      const request = new NextRequest(
        `http://localhost/api/organizations/${mockOrganizerId}/members`,
        {
          method: 'POST',
          headers: {
            'authorization': `Bearer ${mockToken}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            userId: 'new-user-123',
            role: 'MEMBER',
          }),
        }
      );

      const response = await addMember(request, { params: { id: mockOrganizerId } });

      expect(response.status).toBe(201);
    });

    it('should reject if user does not have permission', async () => {
      const mockOrganizer = {
        id: mockOrganizerId,
        name: 'Test Organization',
      };

      (prisma.organizer.findUnique as jest.Mock).mockResolvedValue(mockOrganizer);
      (prisma.teamMember.findFirst as jest.Mock).mockResolvedValue({
        id: 'member-1',
        role: 'MEMBER',
      });

      const request = new NextRequest(
        `http://localhost/api/organizations/${mockOrganizerId}/members`,
        {
          method: 'POST',
          headers: {
            'authorization': `Bearer ${mockToken}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            userId: 'new-user-123',
            role: 'MEMBER',
          }),
        }
      );

      const response = await addMember(request, { params: { id: mockOrganizerId } });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('Access denied');
    });

    it('should reject if user to add not found', async () => {
      const mockOrganizer = {
        id: mockOrganizerId,
        name: 'Test Organization',
      };

      (prisma.organizer.findUnique as jest.Mock).mockResolvedValue(mockOrganizer);
      (prisma.teamMember.findFirst as jest.Mock)
        .mockResolvedValueOnce({ id: 'member-1', role: 'OWNER' })
        .mockResolvedValueOnce(null);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest(
        `http://localhost/api/organizations/${mockOrganizerId}/members`,
        {
          method: 'POST',
          headers: {
            'authorization': `Bearer ${mockToken}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            userId: 'unknown-user',
            role: 'MEMBER',
          }),
        }
      );

      const response = await addMember(request, { params: { id: mockOrganizerId } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain('User not found');
    });

    it('should reject if user is already a member', async () => {
      const mockOrganizer = {
        id: mockOrganizerId,
        name: 'Test Organization',
      };

      const mockUser = {
        id: 'existing-user',
        email: 'existing@test.com',
        role: 'USER',
      };

      (prisma.organizer.findUnique as jest.Mock).mockResolvedValue(mockOrganizer);
      (prisma.teamMember.findFirst as jest.Mock)
        .mockResolvedValueOnce({ id: 'member-1', role: 'OWNER' })
        .mockResolvedValueOnce({ id: 'member-2', role: 'MEMBER' });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const request = new NextRequest(
        `http://localhost/api/organizations/${mockOrganizerId}/members`,
        {
          method: 'POST',
          headers: {
            'authorization': `Bearer ${mockToken}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            userId: 'existing-user',
            role: 'MEMBER',
          }),
        }
      );

      const response = await addMember(request, { params: { id: mockOrganizerId } });
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toContain('already a member');
    });

    it('should reject if role is invalid', async () => {
      const mockOrganizer = {
        id: mockOrganizerId,
        name: 'Test Organization',
      };

      (prisma.organizer.findUnique as jest.Mock).mockResolvedValue(mockOrganizer);
      (prisma.teamMember.findFirst as jest.Mock).mockResolvedValue({
        id: 'member-1',
        role: 'OWNER',
      });

      const request = new NextRequest(
        `http://localhost/api/organizations/${mockOrganizerId}/members`,
        {
          method: 'POST',
          headers: {
            'authorization': `Bearer ${mockToken}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            userId: 'new-user-123',
            role: 'INVALID_ROLE',
          }),
        }
      );

      const response = await addMember(request, { params: { id: mockOrganizerId } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('invalid');
    });
  });

  describe('DELETE /api/organizations/:id/members/:userId - Remove Member', () => {
    it('should remove member with OWNER permission', async () => {
      const mockOrganizer = {
        id: mockOrganizerId,
        name: 'Test Organization',
      };

      const mockMemberToRemove = {
        id: 'member-to-remove',
        organizerId: mockOrganizerId,
        userId: 'user-to-remove',
        role: 'MEMBER',
      };

      (prisma.organizer.findUnique as jest.Mock).mockResolvedValue(mockOrganizer);
      (prisma.teamMember.findFirst as jest.Mock)
        .mockResolvedValueOnce({ id: 'member-1', role: 'OWNER' })
        .mockResolvedValueOnce(mockMemberToRemove);
      (prisma.teamMember.delete as jest.Mock).mockResolvedValue(mockMemberToRemove);

      const request = new NextRequest(
        `http://localhost/api/organizations/${mockOrganizerId}/members/user-to-remove`,
        {
          method: 'DELETE',
          headers: {
            'authorization': `Bearer ${mockToken}`,
          },
        }
      );

      const response = await removeMember(request, { params: { id: mockOrganizerId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toContain('successfully removed');
    });

    it('should reject if trying to remove last OWNER', async () => {
      const mockOrganizer = {
        id: mockOrganizerId,
        name: 'Test Organization',
      };

      const mockOwnerToRemove = {
        id: 'owner-to-remove',
        organizerId: mockOrganizerId,
        userId: 'owner-user',
        role: 'OWNER',
      };

      (prisma.organizer.findUnique as jest.Mock).mockResolvedValue(mockOrganizer);
      (prisma.teamMember.findFirst as jest.Mock)
        .mockResolvedValueOnce({ id: 'member-1', role: 'OWNER' })
        .mockResolvedValueOnce(mockOwnerToRemove);
      (prisma.teamMember.count as jest.Mock).mockResolvedValue(1);

      const request = new NextRequest(
        `http://localhost/api/organizations/${mockOrganizerId}/members/owner-user`,
        {
          method: 'DELETE',
          headers: {
            'authorization': `Bearer ${mockToken}`,
          },
        }
      );

      const response = await removeMember(request, { params: { id: mockOrganizerId } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('last owner');
    });

    it('should reject if user does not have permission', async () => {
      const mockOrganizer = {
        id: mockOrganizerId,
        name: 'Test Organization',
      };

      (prisma.organizer.findUnique as jest.Mock).mockResolvedValue(mockOrganizer);
      (prisma.teamMember.findFirst as jest.Mock).mockResolvedValue({
        id: 'member-1',
        role: 'VIEWER',
      });

      const request = new NextRequest(
        `http://localhost/api/organizations/${mockOrganizerId}/members/user-to-remove`,
        {
          method: 'DELETE',
          headers: {
            'authorization': `Bearer ${mockToken}`,
          },
        }
      );

      const response = await removeMember(request, { params: { id: mockOrganizerId } });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('Access denied');
    });

    it('should reject if member to remove not found', async () => {
      const mockOrganizer = {
        id: mockOrganizerId,
        name: 'Test Organization',
      };

      (prisma.organizer.findUnique as jest.Mock).mockResolvedValue(mockOrganizer);
      (prisma.teamMember.findFirst as jest.Mock)
        .mockResolvedValueOnce({ id: 'member-1', role: 'OWNER' })
        .mockResolvedValueOnce(null);

      const request = new NextRequest(
        `http://localhost/api/organizations/${mockOrganizerId}/members/unknown-user`,
        {
          method: 'DELETE',
          headers: {
            'authorization': `Bearer ${mockToken}`,
          },
        }
      );

      const response = await removeMember(request, { params: { id: mockOrganizerId } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain('Member not found');
    });
  });
});
