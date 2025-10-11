import { logger } from '@/lib/logger';
import { createMethodHandler, NextApiResponse } from '@/src/lib/next-api-helpers';
import { NextRequest, NextResponse } from 'next/server';
import { getHealthStatus } from '../../../../src/lib/health';

/**
 * Kubernetes Readiness Probe
 * Checks if the application is ready to serve traffic
 */

async function handleGet(request: NextRequest) {
  try {
    logger.info('Readiness probe check');
    
    const health = await getHealthStatus();
    
    // Ready only if critical services are operational
    const criticalServices = {
      database: health.checks.database.status === 'up',
      memory: health.checks.memory.status !== 'down',
      disk: health.checks.disk.status !== 'down'
    };
    
    const ready = Object.values(criticalServices).every(Boolean);
    
    const result = {
      status: ready ? 'ready' : 'not_ready',
      timestamp: health.timestamp,
      uptime: health.uptime,
      version: health.version,
      environment: health.environment,
      critical_services: criticalServices,
      ready,
      details: {
        database_response_time: health.checks.database.responseTime,
        memory_usage: health.checks.memory.details,
        disk_status: health.checks.disk.message
      }
    };
    
    if (!ready) {
      logger.warn({ criticalServices }, 'Application not ready');
      return NextResponse.json(result, { status: 503 });
    }
    
    return NextApiResponse.success(result);
    
  } catch (error) {
    logger.error({ error }, 'Readiness probe error');
    
    return NextResponse.json(
      { 
        status: 'not_ready', 
        error: error instanceof Error ? error.message : 'Readiness check failed',
        timestamp: new Date().toISOString(),
        ready: false
      },
      { status: 503 }
    );
  }
}

export default createMethodHandler({
  GET: handleGet,
});
