import { logger } from '@/lib/logger';
import { createMethodHandler, NextApiResponse } from '@/src/lib/next-api-helpers';
import { NextRequest, NextResponse } from 'next/server';
import { getHealthStatus } from '../../../../src/lib/health';

/**
 * Advanced Health Check Endpoints
 * Kubernetes-compatible liveness and readiness probes
 */

async function handleGet(request: NextRequest) {
  try {
    const { pathname } = new URL(request.url);
    
    logger.info({ pathname }, 'Health check requested');
    
    // Kubernetes liveness probe - simple check to verify the process is running
    // Returns 200 if the process is alive, regardless of dependencies
    if (pathname.endsWith('/live')) {
      return NextApiResponse.success({ 
        status: 'alive', 
        timestamp: new Date().toISOString(),
        pid: process.pid,
        uptime: Math.round(process.uptime()),
        memoryUsage: {
          heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          external: Math.round(process.memoryUsage().external / 1024 / 1024)
        },
        version: process.env.VERSION || process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0'
      });
    }
    
    // Kubernetes readiness probe - check if ready to serve requests
    // Returns 200 only if all critical dependencies are healthy
    if (pathname.endsWith('/ready')) {
      const health = await getHealthStatus();
      
      // Ready only if database is up and memory usage is acceptable
      const ready = health.checks.database.status === 'up' && 
                   health.checks.memory.status !== 'down';
      
      const result = {
        status: ready ? 'ready' : 'not_ready',
        timestamp: health.timestamp,
        uptime: health.uptime,
        version: health.version,
        critical_services: {
          database: health.checks.database.status,
          memory: health.checks.memory.status
        },
        ready
      };
      
      if (!ready) {
        return NextResponse.json(result, { status: 503 });
      }
      
      return NextApiResponse.success(result);
    }
    
    // Default comprehensive health check
    const health = await getHealthStatus();
    
    if (health.status === 'unhealthy') {
      return NextResponse.json(health, { status: 503 });
    }
    
    return NextApiResponse.success(health);
    
  } catch (error) {
    logger.error({ error }, 'Health check error');
    
    return NextResponse.json(
      { 
        status: 'unhealthy', 
        error: error instanceof Error ? error.message : 'Health check failed',
        timestamp: new Date().toISOString(),
        pid: process.pid
      },
      { status: 500 }
    );
  }
}

export default createMethodHandler({
  GET: handleGet,
});
