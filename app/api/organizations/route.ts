import { verifyToken } from '@/lib/jwt';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// JWT Payload interface
interface JWTPayload {
  userId: string;
  email?: string;
  role?: string;
  iat?: number;
  exp?: number;
}

// Validation schema for organization creation
const createOrganizerSchema = z.object({
  name: z.string().min(3, 'Name must contain at least 3 characters').max(100),
});

/**
 * POST /api/organizations
 * Create a new organization
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const payload = await verifyToken<JWTPayload>(token);
    
    if (!payload?.userId) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Verify that the user exists and has ORGANIZER or ADMIN role
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (user.role !== 'ORGANIZER' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Access denied. Only organizers can create an organization.' },
        { status: 403 }
      );
    }

    // Parse and validate body
    const body = await request.json();
    const validation = createOrganizerSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid data', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { name } = validation.data;

    // Check if an organization with this name already exists
    const existingOrganizer = await prisma.organizer.findFirst({
      where: { name },
    });

    if (existingOrganizer) {
      return NextResponse.json(
        { error: 'An organization with this name already exists' },
        { status: 409 }
      );
    }

    // Create the organization and add the user as owner
    const organizer = await prisma.organizer.create({
      data: {
        name,
        team: {
          create: {
            userId: payload.userId,
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

    return NextResponse.json(organizer, { status: 201 });
  } catch (error) {
    console.error('Error creating organizer:', error);
    return NextResponse.json(
      { error: 'Server error while creating organization' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/organizations
 * Retrieve user's organizations
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const payload = await verifyToken<JWTPayload>(token);
    
    if (!payload?.userId) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Retrieve organizations where the user is a member
    const organizations = await prisma.organizer.findMany({
      where: {
        team: {
          some: {
            userId: payload.userId,
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

    return NextResponse.json(organizations, { status: 200 });
  } catch (error) {
    console.error('Error fetching organizations:', error);
    return NextResponse.json(
      { error: 'Server error while retrieving organizations' },
      { status: 500 }
    );
  }
}
