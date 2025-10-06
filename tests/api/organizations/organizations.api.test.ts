/**
 * API Tests - Organizations
 * 
 * Tests for organization CRUD endpoints
 * - POST /api/organizations - Create an organization
 * - GET /api/organizations - List user organizations
 * - GET /api/organizations/:id - Organization details
 * - PUT /api/organizations/:id - Update an organization
 * - DELETE /api/organizations/:id - Delete an organization
 */

import * as jwt from '@/lib/jwt';
import { prisma } from '@/lib/prisma';
import { NextRequest } from 'next/server';
import {
  DELETE as deleteOrganization,
  GET as getOrganization,
  PUT as updateOrganization,
} from '../../../app/api/organizations/[id]/route';
import { POST as createOrganization, GET as listOrganizations } from '../../../app/api/organizations/route';

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
    organizer: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    teamMember: {
      findFirst: jest.fn(),
    },
  },
}));

// Mock JWT
jest.mock('@/lib/jwt', () => ({
  verifyToken: jest.fn(),
}));

describe('API Organizations - CRUD Operations', () => {
  const mockUserId = 'user-123';
  const mockOrganizerId = 'org-456';
  const mockToken = 'valid-token';

  beforeEach(() => {
    jest.clearAllMocks();
    (jwt.verifyToken as jest.Mock).mockResolvedValue({ userId: mockUserId });
  });

  describe('POST /api/organizations - Create Organization', () => {
    it('should create organization with valid data', async () => {
      const mockUser = {
        id: mockUserId,
        email: 'organizer@test.com',
        role: 'ORGANIZER',
      };

      const mockOrganizer = {
        id: mockOrganizerId,
        name: 'Test Organization',
        createdAt: new Date(),
        updatedAt: new Date(),
        team: [
          {
            id: 'team-1',
            userId: mockUserId,
            role: 'OWNER',
            user: {
              id: mockUserId,
              email: 'organizer@test.com',
              name: 'Test User',
            },
          },
        ],
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.organizer.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.organizer.create as jest.Mock).mockResolvedValue(mockOrganizer);

      const request = new NextRequest('http://localhost/api/organizations', {
        method: 'POST',
        headers: {
          'authorization': `Bearer ${mockToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ name: 'Test Organization' }),
      });

      const response = await createOrganization(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toMatchObject({
        id: mockOrganizerId,
        name: 'Test Organization',
      });
      expect(data.team).toHaveLength(1);
      expect(data.team[0].role).toBe('OWNER');
    });

    it('should reject if user is not ORGANIZER or ADMIN', async () => {
      const mockUser = {
        id: mockUserId,
        email: 'user@test.com',
        role: 'USER',
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const request = new NextRequest('http://localhost/api/organizations', {
        method: 'POST',
        headers: {
          'authorization': `Bearer ${mockToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ name: 'Test Organization' }),
      });

      const response = await createOrganization(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('Access denied');
    });

    it('should reject if organization name already exists', async () => {
      const mockUser = {
        id: mockUserId,
        email: 'organizer@test.com',
        role: 'ORGANIZER',
      };

      const existingOrg = {
        id: 'org-existing',
        name: 'Existing Organization',
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.organizer.findFirst as jest.Mock).mockResolvedValue(existingOrg);

      const request = new NextRequest('http://localhost/api/organizations', {
        method: 'POST',
        headers: {
          'authorization': `Bearer ${mockToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ name: 'Existing Organization' }),
      });

      const response = await createOrganization(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toContain('already exists');
    });

    it('should reject if name is too short', async () => {
      const mockUser = {
        id: mockUserId,
        email: 'organizer@test.com',
        role: 'ORGANIZER',
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const request = new NextRequest('http://localhost/api/organizations', {
        method: 'POST',
        headers: {
          'authorization': `Bearer ${mockToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ name: 'AB' }),
      });

      const response = await createOrganization(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('invalid');
    });

    it('should reject if not authenticated', async () => {
      const request = new NextRequest('http://localhost/api/organizations', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({ name: 'Test Organization' }),
      });

      const response = await createOrganization(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('authenticated');
    });
  });

  describe('GET /api/organizations - List Organizations', () => {
    it('should return user organizations', async () => {
      const mockOrganizations = [
        {
          id: 'org-1',
          name: 'Organization 1',
          createdAt: new Date(),
          updatedAt: new Date(),
          team: [
            {
              id: 'team-1',
              userId: mockUserId,
              role: 'OWNER',
              user: {
                id: mockUserId,
                email: 'user@test.com',
                name: 'Test User',
              },
            },
          ],
          events: [],
        },
        {
          id: 'org-2',
          name: 'Organization 2',
          createdAt: new Date(),
          updatedAt: new Date(),
          team: [
            {
              id: 'team-2',
              userId: mockUserId,
              role: 'MEMBER',
              user: {
                id: mockUserId,
                email: 'user@test.com',
                name: 'Test User',
              },
            },
          ],
          events: [],
        },
      ];

      (prisma.organizer.findMany as jest.Mock).mockResolvedValue(mockOrganizations);

      const request = new NextRequest('http://localhost/api/organizations', {
        method: 'GET',
        headers: {
          'authorization': `Bearer ${mockToken}`,
        },
      });

      const response = await listOrganizations(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(2);
      expect(data[0].name).toBe('Organization 1');
      expect(data[1].name).toBe('Organization 2');
    });

    it('should return empty array if user has no organizations', async () => {
      (prisma.organizer.findMany as jest.Mock).mockResolvedValue([]);

      const request = new NextRequest('http://localhost/api/organizations', {
        method: 'GET',
        headers: {
          'authorization': `Bearer ${mockToken}`,
        },
      });

      const response = await listOrganizations(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual([]);
    });

    it('should reject if not authenticated', async () => {
      const request = new NextRequest('http://localhost/api/organizations', {
        method: 'GET',
      });

      const response = await listOrganizations(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('authenticated');
    });
  });

  describe('GET /api/organizations/:id - Get Organization Details', () => {
    it('should return organization details for member', async () => {
      const mockOrganizer = {
        id: mockOrganizerId,
        name: 'Test Organization',
        createdAt: new Date(),
        updatedAt: new Date(),
        team: [
          {
            id: 'team-1',
            userId: mockUserId,
            role: 'MEMBER',
            user: {
              id: mockUserId,
              email: 'user@test.com',
              name: 'Test User',
              role: 'ORGANIZER',
            },
          },
        ],
        events: [],
      };

      (prisma.organizer.findUnique as jest.Mock).mockResolvedValue(mockOrganizer);

      const request = new NextRequest(`http://localhost/api/organizations/${mockOrganizerId}`, {
        method: 'GET',
        headers: {
          'authorization': `Bearer ${mockToken}`,
        },
      });

      const response = await getOrganization(request, { params: { id: mockOrganizerId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.id).toBe(mockOrganizerId);
      expect(data.name).toBe('Test Organization');
    });

    it('should reject if organization not found', async () => {
      (prisma.organizer.findUnique as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest(`http://localhost/api/organizations/unknown`, {
        method: 'GET',
        headers: {
          'authorization': `Bearer ${mockToken}`,
        },
      });

      const response = await getOrganization(request, { params: { id: 'unknown' } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain('not found');
    });

    it('should reject if user is not a member', async () => {
      const mockOrganizer = {
        id: mockOrganizerId,
        name: 'Test Organization',
        team: [
          {
            id: 'team-1',
            userId: 'other-user',
            role: 'OWNER',
          },
        ],
        events: [],
      };

      (prisma.organizer.findUnique as jest.Mock).mockResolvedValue(mockOrganizer);

      const request = new NextRequest(`http://localhost/api/organizations/${mockOrganizerId}`, {
        method: 'GET',
        headers: {
          'authorization': `Bearer ${mockToken}`,
        },
      });

      const response = await getOrganization(request, { params: { id: mockOrganizerId } });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('Access denied');
    });
  });

  describe('PUT /api/organizations/:id - Update Organization', () => {
    it('should update organization as OWNER', async () => {
      const mockOrganizer = {
        id: mockOrganizerId,
        name: 'Old Name',
      };

      const updatedOrganizer = {
        id: mockOrganizerId,
        name: 'New Name',
        team: [],
      };

      (prisma.organizer.findUnique as jest.Mock).mockResolvedValue(mockOrganizer);
      (prisma.teamMember.findFirst as jest.Mock).mockResolvedValue({
        id: 'team-1',
        role: 'OWNER',
      });
      (prisma.organizer.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.organizer.update as jest.Mock).mockResolvedValue(updatedOrganizer);

      const request = new NextRequest(`http://localhost/api/organizations/${mockOrganizerId}`, {
        method: 'PUT',
        headers: {
          'authorization': `Bearer ${mockToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ name: 'New Name' }),
      });

      const response = await updateOrganization(request, { params: { id: mockOrganizerId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.name).toBe('New Name');
    });

    it('should reject if user is not OWNER or ADMIN', async () => {
      const mockOrganizer = {
        id: mockOrganizerId,
        name: 'Test Organization',
      };

      (prisma.organizer.findUnique as jest.Mock).mockResolvedValue(mockOrganizer);
      (prisma.teamMember.findFirst as jest.Mock).mockResolvedValue({
        id: 'team-1',
        role: 'MEMBER',
      });

      const request = new NextRequest(`http://localhost/api/organizations/${mockOrganizerId}`, {
        method: 'PUT',
        headers: {
          'authorization': `Bearer ${mockToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ name: 'New Name' }),
      });

      const response = await updateOrganization(request, { params: { id: mockOrganizerId } });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('Access denied');
    });

    it('should reject if new name already exists', async () => {
      const mockOrganizer = {
        id: mockOrganizerId,
        name: 'Old Name',
      };

      const existingOrg = {
        id: 'other-org',
        name: 'Existing Name',
      };

      (prisma.organizer.findUnique as jest.Mock).mockResolvedValue(mockOrganizer);
      (prisma.teamMember.findFirst as jest.Mock).mockResolvedValue({
        id: 'team-1',
        role: 'OWNER',
      });
      (prisma.organizer.findFirst as jest.Mock).mockResolvedValue(existingOrg);

      const request = new NextRequest(`http://localhost/api/organizations/${mockOrganizerId}`, {
        method: 'PUT',
        headers: {
          'authorization': `Bearer ${mockToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ name: 'Existing Name' }),
      });

      const response = await updateOrganization(request, { params: { id: mockOrganizerId } });
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toContain('already exists');
    });
  });

  describe('DELETE /api/organizations/:id - Delete Organization', () => {
    it('should delete organization as OWNER with no active events', async () => {
      const mockOrganizer = {
        id: mockOrganizerId,
        name: 'Test Organization',
        events: [
          {
            id: 'event-1',
            isCancelled: true,
            date: new Date('2025-01-01'),
          },
        ],
      };

      (prisma.organizer.findUnique as jest.Mock).mockResolvedValue(mockOrganizer);
      (prisma.teamMember.findFirst as jest.Mock).mockResolvedValue({
        id: 'team-1',
        role: 'OWNER',
      });
      (prisma.organizer.delete as jest.Mock).mockResolvedValue(mockOrganizer);

      const request = new NextRequest(`http://localhost/api/organizations/${mockOrganizerId}`, {
        method: 'DELETE',
        headers: {
          'authorization': `Bearer ${mockToken}`,
        },
      });

      const response = await deleteOrganization(request, { params: { id: mockOrganizerId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toContain('successfully deleted');
    });

    it('should reject if user is not OWNER', async () => {
      const mockOrganizer = {
        id: mockOrganizerId,
        name: 'Test Organization',
        events: [],
      };

      (prisma.organizer.findUnique as jest.Mock).mockResolvedValue(mockOrganizer);
      (prisma.teamMember.findFirst as jest.Mock).mockResolvedValue({
        id: 'team-1',
        role: 'ADMIN',
      });

      const request = new NextRequest(`http://localhost/api/organizations/${mockOrganizerId}`, {
        method: 'DELETE',
        headers: {
          'authorization': `Bearer ${mockToken}`,
        },
      });

      const response = await deleteOrganization(request, { params: { id: mockOrganizerId } });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('owner');
    });

    it('should reject if organization has active events', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      const mockOrganizer = {
        id: mockOrganizerId,
        name: 'Test Organization',
        events: [
          {
            id: 'event-1',
            isCancelled: false,
            date: futureDate,
          },
        ],
      };

      (prisma.organizer.findUnique as jest.Mock).mockResolvedValue(mockOrganizer);
      (prisma.teamMember.findFirst as jest.Mock).mockResolvedValue({
        id: 'team-1',
        role: 'OWNER',
      });

      const request = new NextRequest(`http://localhost/api/organizations/${mockOrganizerId}`, {
        method: 'DELETE',
        headers: {
          'authorization': `Bearer ${mockToken}`,
        },
      });

      const response = await deleteOrganization(request, { params: { id: mockOrganizerId } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('active events');
    });
  });
});
