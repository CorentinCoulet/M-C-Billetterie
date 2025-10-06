/**
 * API Tests - Organizations Service
 * 
 * Tests for organization service layer operations
 */

import { mockPrisma as prismaMock } from '../../mocks/prisma.mock';

// Mock PrismaClient before importing service
jest.mock('@prisma/client', () => {
  const prismaMock = require('../../mocks/prisma.mock').mockPrisma;
  return {
    PrismaClient: jest.fn(() => prismaMock),
  };
});

import { OrganizationService } from '../../../src/services/organizationService';

describe('Organization Service Tests', () => {
  const mockUserId = 'user-123';
  const mockOrganizerId = 'org-456';
  const mockMemberUserId = 'member-789';

  const mockUser = {
    id: mockUserId,
    name: 'Test User',
    email: 'test@example.com',
    role: 'ORGANIZER' as const,
  };

  const mockOrganization = {
    id: mockOrganizerId,
    name: 'Test Organization',
    createdAt: new Date(),
    updatedAt: new Date(),
    team: [
      {
        id: 'team-1',
        userId: mockUserId,
        organizerId: mockOrganizerId,
        role: 'OWNER' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: {
          id: mockUserId,
          name: 'Test User',
          email: 'test@example.com',
        },
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createOrganization', () => {
    it('should create organization successfully', async () => {
      prismaMock.organizer.findFirst.mockResolvedValue(null);
      prismaMock.organizer.create.mockResolvedValue(mockOrganization as any);

      const result = await OrganizationService.createOrganization({
        name: 'New Organization',
        userId: mockUserId,
      });

      expect(result).toBeDefined();
      expect(result.name).toBe('Test Organization');
      expect(prismaMock.organizer.create).toHaveBeenCalled();
    });

    it('should throw error if organization name already exists', async () => {
      prismaMock.organizer.findFirst.mockResolvedValue(mockOrganization as any);

      await expect(
        OrganizationService.createOrganization({
          name: 'Test Organization',
          userId: mockUserId,
        })
      ).rejects.toThrow('An organization with this name already exists');
    });
  });

  describe('getUserOrganizations', () => {
    it('should return user organizations', async () => {
      prismaMock.organizer.findMany.mockResolvedValue([
        {
          ...mockOrganization,
          team: [{ role: 'OWNER' }],
        },
      ] as any);

      const result = await OrganizationService.getUserOrganizations(mockUserId);

      expect(result).toHaveLength(1);
      expect(result[0].userRole).toBe('OWNER');
    });

    it('should return empty array if user has no organizations', async () => {
      prismaMock.organizer.findMany.mockResolvedValue([]);

      const result = await OrganizationService.getUserOrganizations(mockUserId);

      expect(result).toEqual([]);
    });
  });

  describe('getOrganizationById', () => {
    it('should return organization for authorized member', async () => {
      prismaMock.teamMember.findFirst.mockResolvedValue({
        role: 'OWNER',
      } as any);
      prismaMock.organizer.findUnique.mockResolvedValue(mockOrganization as any);

      const result = await OrganizationService.getOrganizationById(
        mockOrganizerId,
        mockUserId
      );

      expect(result).toBeDefined();
      expect(result.id).toBe(mockOrganizerId);
      expect(result.userRole).toBe('OWNER');
    });

    it('should throw error if user is not a member', async () => {
      prismaMock.teamMember.findFirst.mockResolvedValue(null);

      await expect(
        OrganizationService.getOrganizationById(mockOrganizerId, mockUserId)
      ).rejects.toThrow('Access denied');
    });

    it('should throw error if organization not found', async () => {
      prismaMock.teamMember.findFirst.mockResolvedValue({
        role: 'MEMBER',
      } as any);
      prismaMock.organizer.findUnique.mockResolvedValue(null);

      await expect(
        OrganizationService.getOrganizationById(mockOrganizerId, mockUserId)
      ).rejects.toThrow('Organization not found');
    });
  });

  describe('updateOrganization', () => {
    it('should update organization as OWNER', async () => {
      prismaMock.teamMember.findFirst.mockResolvedValue({
        role: 'OWNER',
      } as any);
      prismaMock.organizer.findFirst.mockResolvedValue(null);
      prismaMock.organizer.update.mockResolvedValue({
        ...mockOrganization,
        name: 'Updated Name',
      } as any);

      const result = await OrganizationService.updateOrganization(
        mockOrganizerId,
        mockUserId,
        { name: 'Updated Name' }
      );

      expect(result.name).toBe('Updated Name');
    });

    it('should throw error if user is not OWNER or ADMIN', async () => {
      prismaMock.teamMember.findFirst.mockResolvedValue({
        role: 'MEMBER',
      } as any);

      await expect(
        OrganizationService.updateOrganization(mockOrganizerId, mockUserId, {
          name: 'New Name',
        })
      ).rejects.toThrow('Access denied');
    });

    it('should throw error if new name already exists', async () => {
      prismaMock.teamMember.findFirst.mockResolvedValue({
        role: 'OWNER',
      } as any);
      prismaMock.organizer.findFirst.mockResolvedValue({
        id: 'other-org',
        name: 'Existing Name',
      } as any);

      await expect(
        OrganizationService.updateOrganization(mockOrganizerId, mockUserId, {
          name: 'Existing Name',
        })
      ).rejects.toThrow('An organization with this name already exists');
    });
  });

  describe('deleteOrganization', () => {
    it('should delete organization as OWNER with no active events', async () => {
      prismaMock.teamMember.findFirst.mockResolvedValue({
        role: 'OWNER',
      } as any);
      prismaMock.event.count.mockResolvedValue(0);
      prismaMock.organizer.delete.mockResolvedValue(mockOrganization as any);

      const result = await OrganizationService.deleteOrganization(
        mockOrganizerId,
        mockUserId
      );

      expect(result.message).toContain('successfully deleted');
      expect(prismaMock.organizer.delete).toHaveBeenCalled();
    });

    it('should throw error if user is not OWNER', async () => {
      prismaMock.teamMember.findFirst.mockResolvedValue({
        role: 'ADMIN',
      } as any);

      await expect(
        OrganizationService.deleteOrganization(mockOrganizerId, mockUserId)
      ).rejects.toThrow('Only the owner can delete');
    });

    it('should throw error if organization has active events', async () => {
      prismaMock.teamMember.findFirst.mockResolvedValue({
        role: 'OWNER',
      } as any);
      prismaMock.event.count.mockResolvedValue(3);

      await expect(
        OrganizationService.deleteOrganization(mockOrganizerId, mockUserId)
      ).rejects.toThrow('Cannot delete organization with active events');
    });
  });

  describe('getOrganizationMembers', () => {
    it('should return members list for authorized user', async () => {
      const mockMembers = [
        {
          id: 'team-1',
          userId: mockUserId,
          organizerId: mockOrganizerId,
          role: 'OWNER' as const,
          user: mockUser,
        },
        {
          id: 'team-2',
          userId: mockMemberUserId,
          organizerId: mockOrganizerId,
          role: 'MEMBER' as const,
          user: {
            id: mockMemberUserId,
            name: 'Member User',
            email: 'member@example.com',
          },
        },
      ];

      prismaMock.teamMember.findFirst.mockResolvedValue({
        role: 'OWNER',
      } as any);
      prismaMock.teamMember.findMany.mockResolvedValue(mockMembers as any);

      const result = await OrganizationService.getOrganizationMembers(
        mockOrganizerId,
        mockUserId
      );

      expect(result).toHaveLength(2);
      expect(result[0].role).toBe('OWNER');
    });

    it('should throw error if user is not a member', async () => {
      prismaMock.teamMember.findFirst.mockResolvedValue(null);

      await expect(
        OrganizationService.getOrganizationMembers(mockOrganizerId, mockUserId)
      ).rejects.toThrow('Access denied');
    });
  });

  describe('addMember', () => {
    it('should add member with OWNER permission', async () => {
      prismaMock.teamMember.findFirst
        .mockResolvedValueOnce({ role: 'OWNER' } as any) // Requesting user
        .mockResolvedValueOnce(null); // Member doesn't exist

      prismaMock.user.findUnique.mockResolvedValue({
        id: mockMemberUserId,
        name: 'New Member',
        email: 'newmember@example.com',
      } as any);

      prismaMock.teamMember.create.mockResolvedValue({
        id: 'team-new',
        userId: mockMemberUserId,
        organizerId: mockOrganizerId,
        role: 'MEMBER',
        user: {
          id: mockMemberUserId,
          name: 'New Member',
          email: 'newmember@example.com',
        },
      } as any);

      const result = await OrganizationService.addMember(
        mockOrganizerId,
        mockUserId,
        { userId: mockMemberUserId, role: 'MEMBER' }
      );

      expect(result).toBeDefined();
      expect(result.userId).toBe(mockMemberUserId);
    });

    it('should throw error if user does not have permission', async () => {
      prismaMock.teamMember.findFirst.mockResolvedValue({
        role: 'VIEWER',
      } as any);

      await expect(
        OrganizationService.addMember(mockOrganizerId, mockUserId, {
          userId: mockMemberUserId,
          role: 'MEMBER',
        })
      ).rejects.toThrow('Access denied');
    });

    it('should throw error if user to add not found', async () => {
      prismaMock.teamMember.findFirst.mockResolvedValue({
        role: 'OWNER',
      } as any);
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(
        OrganizationService.addMember(mockOrganizerId, mockUserId, {
          userId: 'unknown',
          role: 'MEMBER',
        })
      ).rejects.toThrow('User not found');
    });

    it('should throw error if user is already a member', async () => {
      prismaMock.teamMember.findFirst
        .mockResolvedValueOnce({ role: 'OWNER' } as any)
        .mockResolvedValueOnce({ id: 'existing' } as any);

      prismaMock.user.findUnique.mockResolvedValue({
        id: mockMemberUserId,
      } as any);

      await expect(
        OrganizationService.addMember(mockOrganizerId, mockUserId, {
          userId: mockMemberUserId,
          role: 'MEMBER',
        })
      ).rejects.toThrow('already a member');
    });

    it('should throw error if role is invalid', async () => {
      // First call: check requesting user's membership
      prismaMock.teamMember.findFirst.mockResolvedValueOnce({
        role: 'OWNER',
      } as any);

      await expect(
        OrganizationService.addMember(mockOrganizerId, mockUserId, {
          userId: mockMemberUserId,
          role: 'INVALID_ROLE' as any,
        })
      ).rejects.toThrow('Invalid role');
    });
  });

  describe('removeMember', () => {
    it('should remove member with OWNER permission', async () => {
      prismaMock.teamMember.findFirst
        .mockResolvedValueOnce({ role: 'OWNER' } as any) // Requesting user
        .mockResolvedValueOnce({
          id: 'team-member',
          role: 'MEMBER',
        } as any); // Member to remove

      prismaMock.teamMember.delete.mockResolvedValue({} as any);

      const result = await OrganizationService.removeMember(
        mockOrganizerId,
        mockUserId,
        mockMemberUserId
      );

      expect(result.message).toContain('successfully removed');
      expect(prismaMock.teamMember.delete).toHaveBeenCalled();
    });

    it('should throw error if trying to remove last OWNER', async () => {
      prismaMock.teamMember.findFirst
        .mockResolvedValueOnce({ role: 'OWNER' } as any)
        .mockResolvedValueOnce({
          id: 'team-owner',
          role: 'OWNER',
        } as any);

      prismaMock.teamMember.count.mockResolvedValue(1);

      await expect(
        OrganizationService.removeMember(
          mockOrganizerId,
          mockUserId,
          mockMemberUserId
        )
      ).rejects.toThrow('Cannot remove the last owner');
    });

    it('should throw error if user does not have permission', async () => {
      prismaMock.teamMember.findFirst.mockResolvedValue({
        role: 'MEMBER',
      } as any);

      await expect(
        OrganizationService.removeMember(
          mockOrganizerId,
          mockUserId,
          mockMemberUserId
        )
      ).rejects.toThrow('Access denied');
    });

    it('should throw error if member to remove not found', async () => {
      prismaMock.teamMember.findFirst
        .mockResolvedValueOnce({ role: 'OWNER' } as any)
        .mockResolvedValueOnce(null);

      await expect(
        OrganizationService.removeMember(
          mockOrganizerId,
          mockUserId,
          'unknown'
        )
      ).rejects.toThrow('Member not found');
    });
  });
});
