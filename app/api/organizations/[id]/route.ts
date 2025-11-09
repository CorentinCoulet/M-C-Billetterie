import { prisma } from '@/lib/prisma';
import {
  NextApiResponse,
  validateBody,
  withAuth
} from '@/src/lib/next-api-helpers';
import { NextRequest } from 'next/server';
import { z } from 'zod';

// Validation schema for update
const updateOrganizerSchema = z.object({
  name: z.string().min(3).max(100).optional(),
});

// Helper to check permissions
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
 * GET /api/organizations/:id
 * Retrieve organization details
 */
async function handleGet(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (req, user) => {
    try {
      const { id } = await params;
      // Check if organization exists
      const organizer = await prisma.organizer.findUnique({
        where: { id },
        include: {
          team: {
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
          },
          events: {
            select: {
              id: true,
              title: true,
              date: true,
              location: true,
              isPublished: true,
              isCancelled: true,
            },
            orderBy: {
              date: 'desc',
            },
          },
        },
      });

      if (!organizer) {
        return NextApiResponse.notFound('Organization not found');
      }

      // Check if user is a member of the organization
      const isMember = organizer.team.some(
        (member) => member.userId === user.id
      );

      if (!isMember) {
        return NextApiResponse.forbidden('Access denied');
      }
      return NextApiResponse.success(organizer);
    } catch (error) {
      return NextApiResponse.error('Server error', 500);
    }
  });
}

/**
 * PUT /api/organizations/:id
 * Update an organization (OWNER or ADMIN only)
 */
async function handlePut(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (req, user) => {
    try {
      const { id } = await params;

      // Check if organization exists
      const organizer = await prisma.organizer.findUnique({
        where: { id },
      });

      if (!organizer) {
        return NextApiResponse.notFound('Organization not found');
      }

      // Check permissions (OWNER or ADMIN)
      const { hasPermission } = await checkPermission(
        id,
        user.id,
        ['OWNER', 'ADMIN']
      );

      if (!hasPermission) {
        return NextApiResponse.forbidden('Access denied. Only owners and administrators can modify the organization.');
      }

      // Validate body
      const { data, error } = await validateBody(request, updateOrganizerSchema);
      if (error) return error;

      const { name } = data;

      // If name changes, check if it already exists
      if (name && name !== organizer.name) {
        const existingOrganizer = await prisma.organizer.findFirst({
          where: { 
            name,
            id: { not: id },
          },
        });

        if (existingOrganizer) {
          return NextApiResponse.error('An organization with this name already exists', 409);
        }
      }

      // Update organization
      const updatedOrganizer = await prisma.organizer.update({
        where: { id },
        data,
        include: {
          team: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      return NextApiResponse.success(updatedOrganizer, 'Organization updated successfully');
    } catch (error) {
      return NextApiResponse.error('Server error', 500);
    }
  });
}

/**
 * DELETE /api/organizations/:id
 * Delete an organization (OWNER only)
 */
async function handleDelete(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (req, user) => {
    try {
      const { id } = await params;
      // Check if organization exists
      const organizer = await prisma.organizer.findUnique({
        where: { id },
        include: {
          events: true,
        },
      });

      if (!organizer) {
        return NextApiResponse.notFound('Organization not found');
      }

      // Check permissions (OWNER only)
      const { hasPermission } = await checkPermission(
        id,
        user.id,
        ['OWNER']
      );

      if (!hasPermission) {
        return NextApiResponse.forbidden('Access denied. Only the owner can delete the organization.');
      }

      // Check if there are no active events
      const activeEvents = organizer.events.filter(
        (event) => !event.isCancelled && new Date(event.date) > new Date()
      );

      if (activeEvents.length > 0) {
        return NextApiResponse.error('Cannot delete an organization with active events', 400);
      }

      // Delete organization (cascade delete for team members)
      await prisma.organizer.delete({
        where: { id },
      });

      return NextApiResponse.success({ message: 'Organization deleted successfully' });
    } catch (error) {
      return NextApiResponse.error('Server error', 500);
    }
  });
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return handleGet(request, context);
}

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return handlePut(request, context);
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return handleDelete(request, context);
}
