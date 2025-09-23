/**
 * Cache Health Check and Metrics Endpoint
 */

import { NextRequest, NextResponse } from 'next/server';
import { cache } from '../../../../src/lib/cache';
import { monitoringService } from '../../../../src/lib/monitoring';

export async function GET(request: NextRequest) {
  try {
    // Get cache statistics
    const stats = await cache.getStats();
    const health = await cache.healthCheck();
    
    // Record metrics
    monitoringService.recordBusinessEvent('cache_health_check', 1, {
      redis: health.redis ? 'healthy' : 'unhealthy',
      memory: health.memory ? 'healthy' : 'unhealthy'
    });

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
    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Cache health check failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
