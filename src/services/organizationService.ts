/**
 * Organization Service
 * Handles organization CRUD operations and member management
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface CreateOrganizationInput {
  name: string;
  userId: string;
}

export interface UpdateOrganizationInput {
  name?: string;
}

export interface AddMemberInput {
  userId: string;
  role: 'OWNER' | 'ADMIN' | 'MANAGER' | 'MEMBER' | 'VIEWER';
}

export class OrganizationService {
  /**
   * Create a new organization
   */
  static async createOrganization(data: CreateOrganizationInput) {
    const { name, userId } = data;

    // Check if organization name already exists
    const existingOrg = await prisma.organizer.findFirst({
      where: { name },
    });

    if (existingOrg) {
      throw new Error('An organization with this name already exists');
    }

    // Create organization with owner
    const organization = await prisma.organizer.create({
      data: {
        name,
        team: {
          create: {
            userId,
            role: 'OWNER',
          },
        },
      },
      include: {
        team: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    return organization;
  }

  /**
   * Get all organizations for a user
   */
  static async getUserOrganizations(userId: string) {
    const organizations = await prisma.organizer.findMany({
      where: {
        team: {
          some: {
            userId,
          },
        },
      },
      include: {
        team: {
          where: {
            userId,
          },
          select: {
            role: true,
          },
        },
      },
    });

    return organizations.map((org: any) => ({
      ...org,
      userRole: org.team[0]?.role || null,
    }));
  }

  /**
   * Get organization by ID
   */
  static async getOrganizationById(organizationId: string, userId: string) {
    // Check if user is a member
    const membership = await prisma.teamMember.findFirst({
      where: {
        organizerId: organizationId,
        userId,
      },
    });

    if (!membership) {
      throw new Error('Access denied. You are not a member of this organization.');
    }

    const organization = await prisma.organizer.findUnique({
      where: { id: organizationId },
      include: {
        team: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!organization) {
      throw new Error('Organization not found');
    }

    return {
      ...organization,
      userRole: membership.role,
    };
  }

  /**
   * Update organization
   */
  static async updateOrganization(
    organizationId: string,
    userId: string,
    data: UpdateOrganizationInput
  ) {
    // Check permissions (only OWNER and ADMIN can update)
    const membership = await prisma.teamMember.findFirst({
      where: {
        organizerId: organizationId,
        userId,
      },
    });

    if (!membership) {
      throw new Error('Access denied. You are not a member of this organization.');
    }

    if (membership.role !== 'OWNER' && membership.role !== 'ADMIN') {
      throw new Error('Access denied. Only owners and admins can update the organization.');
    }

    // If name is being changed, check for conflicts
    if (data.name) {
      const existingOrg = await prisma.organizer.findFirst({
        where: {
          name: data.name,
          NOT: {
            id: organizationId,
          },
        },
      });

      if (existingOrg) {
        throw new Error('An organization with this name already exists');
      }
    }

    const updated = await prisma.organizer.update({
      where: { id: organizationId },
      data,
      include: {
        team: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    return updated;
  }

  /**
   * Delete organization
   */
  static async deleteOrganization(organizationId: string, userId: string) {
    // Check permissions (only OWNER can delete)
    const membership = await prisma.teamMember.findFirst({
      where: {
        organizerId: organizationId,
        userId,
      },
    });

    if (!membership) {
      throw new Error('Access denied. You are not a member of this organization.');
    }

    if (membership.role !== 'OWNER') {
      throw new Error('Access denied. Only the owner can delete the organization.');
    }

    // Check for active events
    const activeEvents = await prisma.event.count({
      where: {
        organizerId: organizationId,
        isCancelled: false,
        date: {
          gte: new Date(),
        },
      },
    });

    if (activeEvents > 0) {
      throw new Error('Cannot delete organization with active events');
    }

    // Delete organization (cascade will delete team members)
    await prisma.organizer.delete({
      where: { id: organizationId },
    });

    return { message: 'Organization successfully deleted' };
  }

  /**
   * Get organization members
   */
  static async getOrganizationMembers(organizationId: string, userId: string) {
    // Check if user is a member
    const membership = await prisma.teamMember.findFirst({
      where: {
        organizerId: organizationId,
        userId,
      },
    });

    if (!membership) {
      throw new Error('Access denied. You are not a member of this organization.');
    }

    const members = await prisma.teamMember.findMany({
      where: {
        organizerId: organizationId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return members;
  }

  /**
   * Add member to organization
   */
  static async addMember(
    organizationId: string,
    requestingUserId: string,
    data: AddMemberInput
  ) {
    // Check permissions
    const membership = await prisma.teamMember.findFirst({
      where: {
        organizerId: organizationId,
        userId: requestingUserId,
      },
    });

    if (!membership) {
      throw new Error('Access denied. You are not a member of this organization.');
    }

    // Only OWNER, ADMIN, and MANAGER can add members
    if (!['OWNER', 'ADMIN', 'MANAGER'].includes(membership.role)) {
      throw new Error('Access denied. You do not have permission to add members.');
    }

    // Validate role first
    const validRoles = ['OWNER', 'ADMIN', 'MANAGER', 'MEMBER', 'VIEWER'];
    if (!validRoles.includes(data.role)) {
      throw new Error('Invalid role');
    }

    // Check if user exists
    const userToAdd = await prisma.user.findUnique({
      where: { id: data.userId },
    });

    if (!userToAdd) {
      throw new Error('User not found');
    }

    // Check if user is already a member
    const existingMember = await prisma.teamMember.findFirst({
      where: {
        organizerId: organizationId,
        userId: data.userId,
      },
    });

    if (existingMember) {
      throw new Error('User is already a member of this organization');
    }

    // Create team member
    const newMember = await prisma.teamMember.create({
      data: {
        organizerId: organizationId,
        userId: data.userId,
        role: data.role,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return newMember;
  }

  /**
   * Remove member from organization
   */
  static async removeMember(
    organizationId: string,
    requestingUserId: string,
    memberUserId: string
  ) {
    // Check permissions
    const membership = await prisma.teamMember.findFirst({
      where: {
        organizerId: organizationId,
        userId: requestingUserId,
      },
    });

    if (!membership) {
      throw new Error('Access denied. You are not a member of this organization.');
    }

    // Only OWNER, ADMIN can remove members
    if (!['OWNER', 'ADMIN'].includes(membership.role)) {
      throw new Error('Access denied. You do not have permission to remove members.');
    }

    // Check if member exists
    const memberToRemove = await prisma.teamMember.findFirst({
      where: {
        organizerId: organizationId,
        userId: memberUserId,
      },
    });

    if (!memberToRemove) {
      throw new Error('Member not found in this organization');
    }

    // Prevent removing the last owner
    if (memberToRemove.role === 'OWNER') {
      const ownerCount = await prisma.teamMember.count({
        where: {
          organizerId: organizationId,
          role: 'OWNER',
        },
      });

      if (ownerCount === 1) {
        throw new Error('Cannot remove the last owner of the organization');
      }
    }

    // Remove member
    await prisma.teamMember.delete({
      where: {
        id: memberToRemove.id,
      },
    });

    return { message: 'Member successfully removed from organization' };
  }
}

// Export individual methods for API routes
export const createOrganization = (data: CreateOrganizationInput) =>
  OrganizationService.createOrganization(data);
export const getUserOrganizations = (userId: string) =>
  OrganizationService.getUserOrganizations(userId);
export const getOrganizationById = (organizationId: string, userId: string) =>
  OrganizationService.getOrganizationById(organizationId, userId);
export const updateOrganization = (
  organizationId: string,
  userId: string,
  data: UpdateOrganizationInput
) => OrganizationService.updateOrganization(organizationId, userId, data);
export const deleteOrganization = (organizationId: string, userId: string) =>
  OrganizationService.deleteOrganization(organizationId, userId);
export const getOrganizationMembers = (organizationId: string, userId: string) =>
  OrganizationService.getOrganizationMembers(organizationId, userId);
export const addMember = (
  organizationId: string,
  requestingUserId: string,
  data: AddMemberInput
) => OrganizationService.addMember(organizationId, requestingUserId, data);
export const removeMember = (
  organizationId: string,
  requestingUserId: string,
  memberUserId: string
) => OrganizationService.removeMember(organizationId, requestingUserId, memberUserId);

export default OrganizationService;
