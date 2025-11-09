import { cache } from '@/src/lib/cache';
import cacheHelpers from '@/src/lib/cache-helpers';
import { NextApiResponse } from '@/src/lib/next-api-helpers';
import { NextRequest } from 'next/server';

async function handlePost(request: NextRequest) {
  try {

    const startTime = Date.now();

    // Use the new cache warmup helper
    const result = await cacheHelpers.warmupCache();
    
    // Set warmup timestamp
    await cache.set('billetterie:config:warmup-timestamp', Date.now().toString(), 3600);
    
    const duration = Date.now() - startTime;
    
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
    return NextApiResponse.error('Failed to check cache status', 500);
  }
}

export async function GET(request: NextRequest) {
  return handleGet(request);
}

export async function POST(request: NextRequest) {
  return handlePost(request);
}
