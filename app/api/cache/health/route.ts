/**
 * Cache Health Check and Metrics Endpoint
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '../../../../lib/logger';
import { cache } from '../../../../src/lib/cache';
import { monitoringService } from '../../../../src/lib/monitoring';
import { createMethodHandler, NextApiResponse } from '../../../../src/lib/next-api-helpers';

async function handleGet(request: NextRequest) {
  try {
    logger.info('Checking cache health');

    // Get cache statistics
    const stats = await cache.getStats();
    const health = await cache.healthCheck();
    
    // Record metrics
    monitoringService.recordBusinessEvent('cache_health_check', 1, {
      redis: health.redis ? 'healthy' : 'unhealthy',
      memory: health.memory ? 'healthy' : 'unhealthy'
    });

    logger.info({ health, stats }, 'Cache health check completed');

    return NextResponse.json({
      status: health.healthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      cache: {
        redis: {
          connected: stats.redis.connected,
          memory_usage: stats.redis.memory,
          keys_count: stats.redis.keys,
          healthy: health.redis
        },
        memory: {
          size: stats.memory.size,
          max_size: stats.memory.maxSize,
          healthy: health.memory
        },
        overall: {
          healthy: health.healthy,
          fallback_enabled: !health.redis && health.memory
        }
      }
    }, { 
      status: health.healthy ? 200 : 503,
      headers: {
        'Cache-Control': 'no-cache',
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    logger.error({ error }, 'Cache health check failed');
    
    return NextApiResponse.error('Cache health check failed', 500, {
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export const GET = createMethodHandler({
  GET: handleGet,
});
