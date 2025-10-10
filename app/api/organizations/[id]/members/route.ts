import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import {
  createMethodHandler,
  NextApiResponse,
  validateBody,
  withAuth
} from '@/src/lib/next-api-helpers';
import { NextRequest } from 'next/server';
import { z } from 'zod';

// Validation schema for adding a member
const addMemberSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  role: z.enum(['OWNER', 'ADMIN', 'MANAGER', 'MEMBER', 'VIEWER'], {
    errorMap: () => ({ message: 'Invalid role' }),
  }),
});

// Helper function to check permissions
async function checkPermission(
  organizerId: string,
  userId: string,
  requiredRoles: string[]
): Promise<{ hasPermission: boolean; member?: any }> {
  const member = await prisma.teamMember.findFirst({
    where: {
      organizerId,
      userId,
    },
  });

  if (!member) {
    return { hasPermission: false };
  }

  const hasPermission = requiredRoles.includes(member.role);
  return { hasPermission, member };
}

/**
 * GET /api/organizations/:id/members
 * Retrieve organization members
 */
async function handleGet(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(request, async (req, user) => {
    try {
      const { id } = params;

      logger.info({ userId: user.id, organizationId: id }, 'Fetching organization members');

      // Check if organization exists
      const organizer = await prisma.organizer.findUnique({
        where: { id },
      });

      if (!organizer) {
        logger.warn({ userId: user.id, organizationId: id }, 'Organization not found');
        return NextApiResponse.notFound('Organization not found');
      }

      // Check if user is a member of the organization
      const { hasPermission } = await checkPermission(
        id,
        user.id,
        ['OWNER', 'ADMIN', 'MANAGER', 'MEMBER', 'VIEWER']
      );

      if (!hasPermission) {
        logger.warn({ userId: user.id, organizationId: id }, 'User not member of organization');
        return NextApiResponse.forbidden('Access denied');
      }

      // Retrieve members
      const members = await prisma.teamMember.findMany({
        where: { organizerId: id },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
            },
          },
        },
        orderBy: {
          joinedAt: 'asc',
        },
      });

      logger.info({ userId: user.id, organizationId: id, memberCount: members.length }, 'Members retrieved successfully');

      return NextApiResponse.success(members);
    } catch (error) {
      logger.error({ error, userId: user.id }, 'Error fetching members');
      return NextApiResponse.error('Server error', 500);
    }
  });
}

/**
 * POST /api/organizations/:id/members
 * Add a member to the organization
 */
async function handlePost(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(request, async (req, user) => {
    try {
      const { id } = params;

      logger.info({ userId: user.id, organizationId: id }, 'Adding member to organization');

      // Check if organization exists
      const organizer = await prisma.organizer.findUnique({
        where: { id },
      });

      if (!organizer) {
        logger.warn({ userId: user.id, organizationId: id }, 'Organization not found');
        return NextApiResponse.notFound('Organization not found');
      }

      // Check permissions (OWNER, ADMIN, or MANAGER can add members)
      const { hasPermission } = await checkPermission(
        id,
        user.id,
        ['OWNER', 'ADMIN', 'MANAGER']
      );

      if (!hasPermission) {
        logger.warn({ userId: user.id, organizationId: id }, 'User lacks permission to add members');
        return NextApiResponse.forbidden('Access denied. Only owners, administrators, and managers can add members.');
      }

      // Validate body
      const { data, error } = await validateBody(request, addMemberSchema);
      if (error) return error;

      const { userId: newUserId, role } = data;

      // Check if user exists
      const newUser = await prisma.user.findUnique({
        where: { id: newUserId },
      });

      if (!newUser) {
        logger.warn({ userId: user.id, newUserId }, 'User to add not found');
        return NextApiResponse.notFound('User not found');
      }

      // Check if user is not already a member
      const existingMember = await prisma.teamMember.findFirst({
        where: {
          organizerId: id,
          userId: newUserId,
        },
      });

      if (existingMember) {
        logger.warn({ userId: user.id, newUserId, organizationId: id }, 'User already member');
        return NextApiResponse.error('This user is already a member of the organization', 409);
      }

      // Add member
      const member = await prisma.teamMember.create({
        data: {
          organizerId: id,
          userId: newUserId,
          role,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
            },
          },
        },
      });

      logger.info({ userId: user.id, newUserId, organizationId: id, role }, 'Member added successfully');

      return NextApiResponse.success(member, 'Member added successfully', 201);
    } catch (error) {
      logger.error({ error, userId: user.id }, 'Error adding member');
      return NextApiResponse.error('Server error', 500);
    }
  });
}

/**
 * DELETE /api/organizations/:id/members/:userId
 * Remove a member from the organization
 */
async function handleDelete(
  request: NextRequest,
  context: { params: { id: string } }
) {
  return withAuth(request, async (req, user) => {
    try {
      const { id } = context.params;
      
      // Extract userId from URL
      const url = new URL(request.url);
      const pathParts = url.pathname.split('/');
      const userIdToRemove = pathParts[pathParts.length - 1];

      if (!userIdToRemove) {
        logger.warn({ userId: user.id, organizationId: id }, 'Member user ID not provided');
        return NextApiResponse.error('User ID missing', 400);
      }

      logger.info({ userId: user.id, organizationId: id, userIdToRemove }, 'Removing member from organization');

      // Check if organization exists
      const organizer = await prisma.organizer.findUnique({
        where: { id },
      });

      if (!organizer) {
        logger.warn({ userId: user.id, organizationId: id }, 'Organization not found');
        return NextApiResponse.notFound('Organization not found');
      }

      // Check permissions (OWNER, ADMIN, or MANAGER can remove members)
      // Or the user can remove themselves
      const { hasPermission } = await checkPermission(
        id,
        user.id,
        ['OWNER', 'ADMIN', 'MANAGER']
      );

      const isSelf = user.id === userIdToRemove;

      if (!hasPermission && !isSelf) {
        logger.warn({ userId: user.id, organizationId: id }, 'User lacks permission to remove members');
        return NextApiResponse.forbidden('Access denied');
      }

      // Check if member exists
      const memberToRemove = await prisma.teamMember.findFirst({
        where: {
          organizerId: id,
          userId: userIdToRemove,
        },
      });

      if (!memberToRemove) {
        logger.warn({ userId: user.id, userIdToRemove, organizationId: id }, 'Member not found');
        return NextApiResponse.notFound('Member not found');
      }

      // Prevent deletion of the last owner
      if (memberToRemove.role === 'OWNER') {
        const ownerCount = await prisma.teamMember.count({
          where: {
            organizerId: id,
            role: 'OWNER',
          },
        });

        if (ownerCount === 1) {
          logger.warn({ userId: user.id, organizationId: id }, 'Cannot remove last owner');
          return NextApiResponse.error('Cannot remove the last owner of the organization', 400);
        }
      }

      // Remove member
      await prisma.teamMember.delete({
        where: { id: memberToRemove.id },
      });

      logger.info({ userId: user.id, userIdToRemove, organizationId: id }, 'Member removed successfully');

      return NextApiResponse.success(
        { message: 'Member removed successfully' }
      );
    } catch (error) {
      logger.error({ error, userId: user.id }, 'Error removing member');
      return NextApiResponse.error('Server error', 500);
    }
  });
}

export default createMethodHandler({
  GET: handleGet,
  POST: handlePost,
  DELETE: handleDelete,
});
