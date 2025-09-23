import { logger } from '@/lib/logger';
import { sentryService } from '@/lib/sentryService';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const healthCheck = sentryService.healthCheck();
    
    logger.info({ result: healthCheck }, 'Sentry health check requested');
    
    return NextResponse.json({
      service: 'sentry',
      ...healthCheck,
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    }, {
      status: healthCheck.status === 'healthy' ? 200 : 503
    });
    
  } catch (error) {
    logger.error({ error }, 'Sentry health check failed');
    
    return NextResponse.json({
      service: 'sentry',
      status: 'unhealthy',
      enabled: false,
      message: `Health check error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      timestamp: new Date().toISOString()
    }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, message, level, tags, extra, user } = body;
    
    if (!type || !message) {
      return NextResponse.json({
        error: 'Missing required fields: type and message'
      }, { status: 400 });
    }
    
    switch (type) {
      case 'test-error':
        const testError = new Error(message);
        const errorId = sentryService.captureException(testError, {
          tags: { test: 'true', ...tags },
          extra,
          user,
        });
        
        return NextResponse.json({
          success: true,
          message: 'Test error sent to Sentry',
          errorId,
          timestamp: new Date().toISOString()
        });
        
      case 'test-message':
        const messageId = sentryService.captureMessage(
          message,
          level || 'info',
          {
            tags: { test: 'true', ...tags },
            extra,
            user,
          }
        );
        
        return NextResponse.json({
          success: true,
          message: 'Test message sent to Sentry',
          messageId,
          timestamp: new Date().toISOString()
        });
        
      case 'business-metric':
        const { metric, value } = body;
        if (!metric || value === undefined) {
          return NextResponse.json({
            error: 'Missing required fields for business metric: metric and value'
          }, { status: 400 });
        }
        
        sentryService.trackBusinessMetric(
          metric,
          value,
          tags,
          user?.id
        );
        
        return NextResponse.json({
          success: true,
          message: 'Business metric tracked',
          metric,
          value,
          timestamp: new Date().toISOString()
        });
        
      default:
        return NextResponse.json({
          error: `Unknown test type: ${type}. Supported types: test-error, test-message, business-metric`
        }, { status: 400 });
    }
    
  } catch (error) {
    logger.error({ error }, 'Sentry test endpoint error');
    
    return NextResponse.json({
      success: false,
      message: 'Failed to process Sentry test',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
