import { NextRequest } from 'next/server';
import * as eventController from '@/modules/event/event.controller';
import { adaptController } from '@/utils/appRouterAdapter';
import { apiRateLimiter } from '@/middlewares/appRouterRateLimit';

/**
 * GET /api/events/featured
 * Get featured events
 */
export async function GET(request: NextRequest) {
  return adaptController(request, eventController.getFeaturedEvents, apiRateLimiter, 'GET');
}