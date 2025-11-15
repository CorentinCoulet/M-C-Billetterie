/**
 * Cache Health Check and Metrics Endpoint
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { cache } from '@/lib/cache';
import { monitoringService } from '@/lib/monitoring';
import { createMethodHandler, NextApiResponse } from '@/lib/next-api-helpers';

async function handleGet(_request: NextRequest) {
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

    logger.info('Cache health check completed', { health, stats });

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
    logger.error('Cache health check failed', { error });

    return NextApiResponse.error('Cache health check failed', 500, {
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export const GET = createMethodHandler({
  GET: handleGet,
});
