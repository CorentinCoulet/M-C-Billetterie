import { logger } from '@/lib/logger';
import { createMethodHandler, NextApiResponse } from '@/src/lib/next-api-helpers';
import { NextRequest } from 'next/server';
import { sendWelcomeEmail } from '../../../../../src/modules/email/email.service';
import type { UserWithRelations } from '../../../../../src/types/user';

/**
 * Test endpoint for sending welcome emails
 * Only available in development mode
 */
async function handlePost(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    logger.warn({ 
      pathname: '/api/test/emails/welcome' 
    }, 'Attempt to access test endpoint in production');
    return NextApiResponse.error('Test endpoints not available in production', 403);
  }

  let email = 'test@example.com';
  
  try {
    const body = await request.json();
    const bodyData = body as { email?: string; name?: string };
    email = bodyData.email || 'test@example.com';
    const name = bodyData.name || 'Test User';

    logger.info({ 
      email,
      name,
      pathname: '/api/test/emails/welcome' 
    }, 'Sending test welcome email');

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

    logger.info({ 
      email,
      pathname: '/api/test/emails/welcome' 
    }, 'Test welcome email sent successfully');

    return NextApiResponse.success({
      message: 'Welcome email sent successfully',
      recipient: email,
    });

  } catch (error) {
    logger.error({ 
      error,
      email,
      pathname: '/api/test/emails/welcome' 
    }, 'Error sending welcome email');
    return NextApiResponse.error('Failed to send welcome email', 500);
  }
}

async function handleGet(request: NextRequest) {
  logger.info({ 
    pathname: '/api/test/emails/welcome' 
  }, 'Welcome email test info accessed');
  
  return NextApiResponse.success({
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

export default createMethodHandler({
  GET: handleGet,
  POST: handlePost,
});
