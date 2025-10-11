import { logger } from '@/lib/logger';
import { cache } from '@/src/lib/cache';
import cacheHelpers from '@/src/lib/cache-helpers';
import { createMethodHandler, NextApiResponse } from '@/src/lib/next-api-helpers';
import { NextRequest } from 'next/server';

async function handlePost(request: NextRequest) {
  try {
    logger.info({ 
      pathname: '/api/cache/warmup',
      method: 'POST'
    }, 'Starting cache warm-up process');
    const startTime = Date.now();

    // Use the new cache warmup helper
    const result = await cacheHelpers.warmupCache();
    
    // Set warmup timestamp
    await cache.set('billetterie:config:warmup-timestamp', Date.now().toString(), 3600);
    
    const duration = Date.now() - startTime;
    
    logger.info({ 
      duration, 
      success: result.success 
    }, `Cache warm-up completed in ${duration}ms`);

    return NextApiResponse.success({
      message: result.success ? 'Cache warm-up completed successfully' : 'Cache warm-up completed with errors',
      stats: {
        duration: `${duration}ms`,
        success: result.success,
        timestamp: new Date().toISOString()
      },
      error: result.error ? String(result.error) : undefined
    });

  } catch (error) {
    logger.error({ 
      error,
      pathname: '/api/cache/warmup' 
    }, 'Cache warm-up process failed');
    
    return NextApiResponse.error('Cache warm-up failed', 500);
  }
}

async function handleGet(request: NextRequest) {
  try {
    // Get cache warming status
    const warmupTimestamp = await cache.get('billetterie:config:warmup-timestamp');
    
    if (!warmupTimestamp) {
      return NextApiResponse.success({
        warmed: false,
        message: 'Cache has not been warmed up yet'
      });
    }

    const lastWarmup = new Date(parseInt(warmupTimestamp));
    const now = new Date();
    const timeSinceWarmup = now.getTime() - lastWarmup.getTime();
    
    // Consider cache "cold" if last warm-up was more than 1 hour ago
    const isCacheWarm = timeSinceWarmup < 3600000; // 1 hour

    logger.info({ 
      warmed: isCacheWarm, 
      lastWarmup: lastWarmup.toISOString() 
    }, 'Cache warmup status checked');

    return NextApiResponse.success({
      warmed: isCacheWarm,
      lastWarmup: lastWarmup.toISOString(),
      timeSinceWarmup: `${Math.round(timeSinceWarmup / 1000)}s`,
      needsWarmup: !isCacheWarm,
      message: isCacheWarm 
        ? 'Cache is warm and ready' 
        : 'Cache may be cold and should be warmed up'
    });

  } catch (error) {
    logger.error({ 
      error,
      pathname: '/api/cache/warmup' 
    }, 'Failed to check cache warm-up status');
    
    return NextApiResponse.error('Failed to check cache status', 500);
  }
}

export default createMethodHandler({
  GET: handleGet,
  POST: handlePost,
});
