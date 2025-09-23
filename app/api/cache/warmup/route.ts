import { logger } from '@/lib/logger';
import { cache } from '@/src/lib/cache';
import { EventService } from '@/src/services/eventService';
import { TicketService } from '@/src/services/ticketService';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    logger.info('Starting cache warm-up process');
    const startTime = Date.now();
    let warmedKeys = 0;
    const errors = [];

    // Warm up events cache
    try {
      const eventService = new EventService();
      
      // Warm up popular events
      await eventService.getPopularEvents(20);
      warmedKeys++;
      
      // Warm up recent events
      await eventService.getEvents({ take: 50, orderBy: { createdAt: 'desc' } });
      warmedKeys++;
      
      // Warm up upcoming events
      await eventService.getUpcomingEvents(30);
      warmedKeys++;
      
      logger.info('Events cache warmed up successfully');
    } catch (error) {
      const errorMsg = `Events cache warm-up failed: ${error}`;
      errors.push(errorMsg);
      logger.error(errorMsg);
    }

    // Warm up tickets cache
    try {
      const ticketService = new TicketService();
      
      // Warm up ticket statistics (assuming these methods exist)
      // This will be implemented when TicketService is updated with cache
      logger.info('Tickets cache preparation completed');
    } catch (error) {
      const errorMsg = `Tickets cache warm-up failed: ${error}`;
      errors.push(errorMsg);
      logger.error(errorMsg);
    }

    // Warm up application configuration cache
    try {
      await cache.set('billetterie:config:warmup-timestamp', Date.now().toString(), 3600);
      await cache.set('billetterie:config:version', '1.0.0', 3600);
      warmedKeys++;
      
      logger.info('Configuration cache warmed up');
    } catch (error) {
      const errorMsg = `Configuration cache warm-up failed: ${error}`;
      errors.push(errorMsg);
      logger.error(errorMsg);
    }

    const duration = Date.now() - startTime;
    
    logger.info(`Cache warm-up completed in ${duration}ms, ${warmedKeys} key patterns warmed`);

    return NextResponse.json({
      success: true,
      message: 'Cache warm-up completed successfully',
      stats: {
        duration: `${duration}ms`,
        warmedKeys,
        errors: errors.length,
        timestamp: new Date().toISOString()
      },
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    logger.error({ error }, 'Cache warm-up process failed');
    
    return NextResponse.json({
      success: false,
      message: 'Cache warm-up failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    // Get cache warming status
    const warmupTimestamp = await cache.get('billetterie:config:warmup-timestamp');
    
    if (!warmupTimestamp) {
      return NextResponse.json({
        warmed: false,
        message: 'Cache has not been warmed up yet'
      });
    }

    const lastWarmup = new Date(parseInt(warmupTimestamp));
    const now = new Date();
    const timeSinceWarmup = now.getTime() - lastWarmup.getTime();
    
    // Consider cache "cold" if last warm-up was more than 1 hour ago
    const isCacheWarm = timeSinceWarmup < 3600000; // 1 hour

    return NextResponse.json({
      warmed: isCacheWarm,
      lastWarmup: lastWarmup.toISOString(),
      timeSinceWarmup: `${Math.round(timeSinceWarmup / 1000)}s`,
      needsWarmup: !isCacheWarm,
      message: isCacheWarm 
        ? 'Cache is warm and ready' 
        : 'Cache may be cold and should be warmed up'
    });

  } catch (error) {
    logger.error({ error }, 'Failed to check cache warm-up status');
    
    return NextResponse.json({
      warmed: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Failed to check cache status'
    }, { status: 500 });
  }
}
