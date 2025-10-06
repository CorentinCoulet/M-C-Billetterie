import { verifyToken } from '@/lib/jwt';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// JWT Payload interface
interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

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
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const payload = verifyToken<JWTPayload>(token);
    
    if (!payload?.userId) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

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
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Check if user is a member of the organization
    const isMember = organizer.team.some(
      (member) => member.userId === payload.userId
    );

    if (!isMember) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    return NextResponse.json(organizer, { status: 200 });
  } catch (error) {
    console.error('Error fetching organizer:', error);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/organizations/:id
 * Update an organization
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const payload = verifyToken<JWTPayload>(token);
    
    if (!payload?.userId) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Check if organization exists
    const organizer = await prisma.organizer.findUnique({
      where: { id },
    });

    if (!organizer) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Check permissions (OWNER or ADMIN)
    const { hasPermission } = await checkPermission(
      id,
      payload.userId,
      ['OWNER', 'ADMIN']
    );

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Access denied. Only owners and administrators can modify the organization.' },
        { status: 403 }
      );
    }

    // Parse and validate body
    const body = await request.json();
    const validation = updateOrganizerSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid data', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { name } = validation.data;

    // If name changes, check if it already exists
    if (name && name !== organizer.name) {
      const existingOrganizer = await prisma.organizer.findFirst({
        where: { 
          name,
          id: { not: id },
        },
      });

      if (existingOrganizer) {
        return NextResponse.json(
          { error: 'An organization with this name already exists' },
          { status: 409 }
        );
      }
    }

    // Update organization
    const updatedOrganizer = await prisma.organizer.update({
      where: { id },
      data: validation.data,
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

    return NextResponse.json(updatedOrganizer, { status: 200 });
  } catch (error) {
    console.error('Error updating organizer:', error);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/organizations/:id
 * Delete an organization (OWNER only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const payload = verifyToken<JWTPayload>(token);
    
    if (!payload?.userId) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Check if organization exists
    const organizer = await prisma.organizer.findUnique({
      where: { id },
      include: {
        events: true,
      },
    });

    if (!organizer) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Check permissions (OWNER only)
    const { hasPermission } = await checkPermission(
      id,
      payload.userId,
      ['OWNER']
    );

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Access denied. Only the owner can delete the organization.' },
        { status: 403 }
      );
    }

    // Check if there are no active events
    const activeEvents = organizer.events.filter(
      (event) => !event.isCancelled && new Date(event.date) > new Date()
    );

    if (activeEvents.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete an organization with active events' },
        { status: 400 }
      );
    }

    // Delete organization (cascade delete for team members)
    await prisma.organizer.delete({
      where: { id },
    });

    return NextResponse.json(
      { message: 'Organization deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting organizer:', error);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}
