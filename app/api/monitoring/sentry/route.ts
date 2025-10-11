import { logger } from '@/lib/logger';
import { sentryService } from '@/lib/sentryService';
import { createMethodHandler, NextApiResponse } from '@/src/lib/next-api-helpers';
import { NextRequest, NextResponse } from 'next/server';

async function handleGet(request: NextRequest) {
  try {
    const healthCheck = sentryService.healthCheck();
    
    logger.info({ 
      result: healthCheck,
      pathname: '/api/monitoring/sentry' 
    }, 'Sentry health check requested');
    
    // Use NextResponse for non-200 status codes
    return NextResponse.json({
      service: 'sentry',
      ...healthCheck,
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    }, {
      status: healthCheck.status === 'healthy' ? 200 : 503
    });
    
  } catch (error) {
    logger.error({ 
      error,
      pathname: '/api/monitoring/sentry' 
    }, 'Sentry health check failed');
    
    return NextResponse.json({
      service: 'sentry',
      status: 'unhealthy',
      enabled: false,
      message: `Health check error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      timestamp: new Date().toISOString()
    }, { status: 503 });
  }
}

async function handlePost(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, message, level, tags, extra, user } = body;
    
    logger.info({ 
      type,
      pathname: '/api/monitoring/sentry' 
    }, 'Sentry test requested');
    
    if (!type || !message) {
      return NextApiResponse.error('Missing required fields: type and message', 400);
    }
    
    switch (type) {
      case 'test-error':
        const testError = new Error(message);
        const errorId = sentryService.captureException(testError, {
          tags: { test: 'true', ...tags },
          extra,
          user,
        });
        
        return NextApiResponse.success({
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
        
        return NextApiResponse.success({
          message: 'Test message sent to Sentry',
          messageId,
          timestamp: new Date().toISOString()
        });
        
      case 'business-metric':
        const { metric, value } = body;
        if (!metric || value === undefined) {
          return NextApiResponse.error('Missing required fields for business metric: metric and value', 400);
        }
        
        sentryService.trackBusinessMetric(
          metric,
          value,
          tags,
          user?.id
        );
        
        return NextApiResponse.success({
          message: 'Business metric tracked',
          metric,
          value,
          timestamp: new Date().toISOString()
        });
        
      default:
        return NextApiResponse.error(`Unknown test type: ${type}. Supported types: test-error, test-message, business-metric`, 400);
    }
    
  } catch (error) {
    logger.error({ 
      error,
      pathname: '/api/monitoring/sentry' 
    }, 'Sentry test endpoint error');
    
    return NextApiResponse.error('Failed to process Sentry test', 500);
  }
}

export default createMethodHandler({
  GET: handleGet,
  POST: handlePost,
});
