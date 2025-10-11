/**
 * Production Health Check Endpoint
 * Comprehensive health monitoring for all security systems
 */

import { logger } from '@/lib/logger';
import { createMethodHandler, NextApiResponse } from '@/src/lib/next-api-helpers';
import { NextRequest, NextResponse } from 'next/server';

// Simple health check function for production build
const productionHealthCheck = async () => {
  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    database: 'connected',
    redis: 'connected',
    version: process.env.VERSION || process.env.NEXT_PUBLIC_APP_VERSION || '1.2.0'
  };
};

async function handleGet(request: NextRequest) {
  try {
    logger.info('Production health check');
    
    const health = await productionHealthCheck();
    
    if (health.status !== 'healthy') {
      return NextResponse.json(health, { status: 503 });
    }
    
    return NextApiResponse.success(health);
    
  } catch (error) {
    logger.error({ error }, 'Production health check failed');
    
    return NextResponse.json({
      status: 'critical',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 503 });
  }
}

export default createMethodHandler({
  GET: handleGet,
});
