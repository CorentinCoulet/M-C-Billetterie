import { logger } from '@/lib/logger';
import { createMethodHandler, NextApiResponse } from '@/src/lib/next-api-helpers';
import * as Sentry from '@sentry/nextjs';
import { NextRequest } from 'next/server';

/**
 * Test endpoint for Sentry error tracking
 * Only available in development/staging environments
 * 
 * Usage:
 * GET /api/sentry/test - Test Sentry integration
 * POST /api/sentry/test - Test error capture with custom data
 */

async function handleGet(request: NextRequest) {
  // Only allow in non-production environments
  if (process.env.NODE_ENV === 'production') {
    logger.warn({ 
      pathname: '/api/sentry/test' 
    }, 'Attempt to access test endpoint in production');
    return NextApiResponse.error('Test endpoint not available in production', 403);
  }

  try {
    // Test Sentry configuration
    const sentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
    
    logger.info({ 
      configured: !!sentryDsn,
      pathname: '/api/sentry/test' 
    }, 'Sentry test endpoint accessed');
    
    if (!sentryDsn) {
      return NextApiResponse.success({
        status: 'error',
        message: 'Sentry DSN not configured',
        configured: false,
        environment: process.env.NODE_ENV,
        timestamp: new Date().toISOString()
      });
    }

    // Test basic Sentry functionality
    Sentry.addBreadcrumb({
      message: 'Sentry test endpoint called',
      level: 'info',
      timestamp: Date.now() / 1000,
    });

    // Capture a test message
    const eventId = Sentry.captureMessage('Sentry test message from API', 'info');

    logger.info({ eventId }, 'Sentry test message captured');

    return NextApiResponse.success({
      status: 'success',
      message: 'Sentry is properly configured and working',
      configured: true,
      dsn: sentryDsn.substring(0, 20) + '...',
      environment: process.env.NODE_ENV,
      eventId,
      timestamp: new Date().toISOString(),
      tips: [
        'Check your Sentry dashboard for the test message',
        'Try POST to this endpoint to test error capture',
        'Remove this endpoint in production'
      ]
    });

  } catch (error) {
    // This error will be captured by Sentry
    Sentry.captureException(error);
    logger.error({ 
      error,
      pathname: '/api/sentry/test' 
    }, 'Error testing Sentry integration');
    
    return NextApiResponse.error('Error testing Sentry integration', 500);
  }
}

async function handlePost(request: NextRequest) {
  // Only allow in non-production environments
  if (process.env.NODE_ENV === 'production') {
    logger.warn({ 
      pathname: '/api/sentry/test' 
    }, 'Attempt to access test endpoint in production');
    return NextApiResponse.error('Test endpoint not available in production', 403);
  }

  try {
    const body = await request.json();
    const { testType = 'error', message = 'Test error from API', level = 'error', tags, extra } = body;

    logger.info({ 
      testType,
      level,
      pathname: '/api/sentry/test' 
    }, 'Sentry test POST requested');

    // Set user context for this test
    Sentry.setUser({
      id: 'test-user',
      email: 'test@example.com',
      role: 'tester'
    });

    // Add custom tags
    if (tags) {
      Object.entries(tags).forEach(([key, value]) => {
        Sentry.setTag(key as string, value as string);
      });
    }

    // Add extra context
    if (extra) {
      Sentry.setExtra('testData', extra);
    }

    let eventId: string;

    switch (testType) {
      case 'message':
        eventId = Sentry.captureMessage(message, level as any);
        break;

      case 'exception':
        const testError = new Error(message);
        testError.name = 'SentryTestError';
        eventId = Sentry.captureException(testError);
        break;

      case 'custom':
        eventId = Sentry.captureEvent({
          message,
          level: level as any,
          tags: {
            testType: 'custom',
            source: 'api-test'
          },
          extra: {
            testData: extra,
            timestamp: new Date().toISOString()
          }
        });
        break;

      default:
        // Test a real error
        throw new Error(message);
    }

    logger.info({ eventId, testType }, 'Sentry test completed');

    return NextApiResponse.success({
      message: `Sentry ${testType} test completed`,
      eventId,
      testType,
      level,
      timestamp: new Date().toISOString(),
      instructions: [
        'Check your Sentry dashboard to see this event',
        'Look for the event ID: ' + eventId,
        'Review tags, context, and breadcrumbs'
      ]
    });

  } catch (error) {
    // This error will also be captured by Sentry
    const eventId = Sentry.captureException(error);
    
    logger.info({ 
      eventId,
      error: error instanceof Error ? error.message : 'Unknown error',
      pathname: '/api/sentry/test' 
    }, 'Error successfully captured by Sentry');
    
    return NextApiResponse.success({
      message: 'Error successfully captured by Sentry',
      eventId,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}

export default createMethodHandler({
  GET: handleGet,
  POST: handlePost,
});
