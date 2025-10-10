import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import {
  createMethodHandler,
  NextApiResponse,
  validateBody,
  withAuth,
} from '@/src/lib/next-api-helpers';
import { NextRequest } from 'next/server';
import { z } from 'zod';

// Validation schema for organization creation
const createOrganizerSchema = z.object({
  name: z.string().min(3, 'Name must contain at least 3 characters').max(100),
});

/**
 * POST /api/organizations
 * Create a new organization (ORGANIZER or ADMIN only)
 */
async function handlePost(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    // Verify role
    if (user.role !== 'ORGANIZER' && user.role !== 'ADMIN') {
      logger.warn({ userId: user.id, role: user.role }, 'User attempted to create organization without proper role');
      return NextApiResponse.forbidden('Access denied. Only organizers can create an organization.');
    }

    const { data, error } = await validateBody(request, createOrganizerSchema);
    if (error) return error;

    try {
      const { name } = data;

      logger.info({ userId: user.id, organizationName: name }, 'Creating new organization');

      // Check if an organization with this name already exists
      const existingOrganizer = await prisma.organizer.findFirst({
        where: { name },
      });

      if (existingOrganizer) {
        logger.warn({ userId: user.id, organizationName: name }, 'Organization name already exists');
        return NextApiResponse.error('An organization with this name already exists', 409);
      }

      // Create the organization and add the user as owner
      const organizer = await prisma.organizer.create({
        data: {
          name,
          team: {
            create: {
              userId: user.id,
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
                  email: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      logger.info({ userId: user.id, organizationId: organizer.id }, 'Organization created successfully');

      return NextApiResponse.success(organizer, 'Organization created successfully', 201);
    } catch (error) {
      logger.error({ error, userId: user.id }, 'Error creating organizer');
      return NextApiResponse.error('Server error while creating organization', 500);
    }
  });
}

/**
 * GET /api/organizations
 * Retrieve user's organizations
 */
async function handleGet(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    try {
      logger.info({ userId: user.id }, 'Fetching user organizations');

      // Retrieve organizations where the user is a member
      const organizations = await prisma.organizer.findMany({
        where: {
          team: {
            some: {
              userId: user.id,
            },
          },
        },
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
          events: {
            select: {
              id: true,
              title: true,
              date: true,
              isPublished: true,
            },
            orderBy: {
              date: 'desc',
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      logger.info({ userId: user.id, count: organizations.length }, 'Organizations retrieved successfully');

      return NextApiResponse.success(organizations);
    } catch (error) {
      logger.error({ error, userId: user.id }, 'Error fetching organizations');
      return NextApiResponse.error('Server error while retrieving organizations', 500);
    }
  });
}

export default createMethodHandler({
  GET: handleGet,
  POST: handlePost,
});
