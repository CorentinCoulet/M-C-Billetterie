import { prisma } from '@/lib/prisma';
import {
  NextApiResponse,
  validateBody,
  withAuth
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
      return NextApiResponse.forbidden('Access denied. Only organizers can create an organization.');
    }

    const { data, error } = await validateBody(request, createOrganizerSchema);
    if (error) return error;

    try {
      const { name } = data;

      // Check if an organization with this name already exists
      const existingOrganizer = await prisma.organizer.findFirst({
        where: { name },
      });

      if (existingOrganizer) {
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

      return NextApiResponse.success(organizer, 'Organization created successfully', 201);
    } catch (error) {
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

      return NextApiResponse.success(organizations);
    } catch (error) {
      return NextApiResponse.error('Server error while retrieving organizations', 500);
    }
  });
}

export async function GET(request: NextRequest) {
  return handleGet(request);
}

export async function POST(request: NextRequest) {
  return handlePost(request);
}
