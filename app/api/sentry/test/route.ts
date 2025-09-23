import * as Sentry from '@sentry/nextjs';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Test endpoint for Sentry error tracking
 * Only available in development/staging environments
 * 
 * Usage:
 * GET /api/sentry/test - Test Sentry integration
 * POST /api/sentry/test - Test error capture with custom data
 */

export async function GET() {
  // Only allow in non-production environments
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Test endpoint not available in production' },
      { status: 403 }
    );
  }

  try {
    // Test Sentry configuration
    const sentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
    
    if (!sentryDsn) {
      return NextResponse.json({
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

    return NextResponse.json({
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
    
    return NextResponse.json({
      status: 'error',
      message: 'Error testing Sentry integration',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  // Only allow in non-production environments
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Test endpoint not available in production' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { testType = 'error', message = 'Test error from API', level = 'error', tags, extra } = body;

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

    return NextResponse.json({
      status: 'success',
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
    
    return NextResponse.json({
      status: 'success', // This is expected for testing error capture
      message: 'Error successfully captured by Sentry',
      eventId,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}
