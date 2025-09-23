import { NextRequest, NextResponse } from 'next/server';
import { sendWelcomeEmail } from '../../../../../src/modules/email/email.service';
import type { UserWithRelations } from '../../../../../src/types/user';

/**
 * Test endpoint for sending welcome emails
 * Only available in development mode
 */
export async function POST(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Test endpoints not available in production' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { email = 'test@example.com', name = 'Test User' } = body;

    // Create a test user object
    const testUser: UserWithRelations = {
      id: 'test-user-' + Date.now(),
      name,
      email,
      password: 'hashed',
      role: 'USER',
      isVerified: true,
      lastLogin: new Date(),
      blocked: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await sendWelcomeEmail(testUser, 'TESTCODE20');

    return NextResponse.json({
      success: true,
      message: 'Welcome email sent successfully',
      recipient: email,
    });

  } catch (error) {
    console.error('Error sending welcome email:', error);
    return NextResponse.json(
      { error: 'Failed to send welcome email', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: '/api/test/emails/welcome',
    description: 'Send test welcome email',
    method: 'POST',
    body: {
      email: 'recipient@example.com',
      name: 'Recipient Name'
    },
    note: 'Only available in development mode'
  });
}
