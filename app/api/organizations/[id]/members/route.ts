import { verifyToken } from '@/lib/jwt';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// JWT Payload interface
interface JWTPayload {
  userId: string;
  email: string;
  role?: string;
  iat?: number;
  exp?: number;
}

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
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Check authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthenticated' },
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

    // Check if user is a member of the organization
    const { hasPermission } = await checkPermission(
      id,
      payload.userId,
      ['OWNER', 'ADMIN', 'MANAGER', 'MEMBER', 'VIEWER']
    );

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
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

    return NextResponse.json(members, { status: 200 });
  } catch (error) {
    console.error('Error fetching members:', error);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/organizations/:id/members
 * Add a member to the organization
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Check authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthenticated' },
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

    // Check permissions (OWNER, ADMIN, or MANAGER can add members)
    const { hasPermission } = await checkPermission(
      id,
      payload.userId,
      ['OWNER', 'ADMIN', 'MANAGER']
    );

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Access denied. Only owners, administrators, and managers can add members.' },
        { status: 403 }
      );
    }

    // Parse and validate body
    const body = await request.json();
    const validation = addMemberSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid data', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { userId, role } = validation.data;

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user is not already a member
    const existingMember = await prisma.teamMember.findFirst({
      where: {
        organizerId: id,
        userId,
      },
    });

    if (existingMember) {
      return NextResponse.json(
        { error: 'This user is already a member of the organization' },
        { status: 409 }
      );
    }

    // Add member
    const member = await prisma.teamMember.create({
      data: {
        organizerId: id,
        userId,
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

    return NextResponse.json(member, { status: 201 });
  } catch (error) {
    console.error('Error adding member:', error);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/organizations/:id/members/:userId
 * Remove a member from the organization
 */
export async function DELETE(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const { id } = context.params;
    
    // Extract userId from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const userIdToRemove = pathParts[pathParts.length - 1];

    if (!userIdToRemove) {
      return NextResponse.json(
        { error: 'User ID missing' },
        { status: 400 }
      );
    }

    // Check authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthenticated' },
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

    // Check permissions
    const { hasPermission } = await checkPermission(
      id,
      payload.userId,
      ['OWNER', 'ADMIN', 'MANAGER']
    );

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Check if member exists
    const memberToRemove = await prisma.teamMember.findFirst({
      where: {
        organizerId: id,
        userId: userIdToRemove,
      },
    });

    if (!memberToRemove) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      );
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
        return NextResponse.json(
          { error: 'Cannot remove the last owner of the organization' },
          { status: 400 }
        );
      }
    }

    // Remove member
    await prisma.teamMember.delete({
      where: { id: memberToRemove.id },
    });

    return NextResponse.json(
      { message: 'Member removed successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error removing member:', error);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}
