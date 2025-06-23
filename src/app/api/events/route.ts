import { NextRequest } from 'next/server';
import * as eventController from '@/modules/event/event.controller';
import { adaptController } from '@/utils/appRouterAdapter';
import { apiRateLimiter } from '@/middlewares/appRouterRateLimit';

/**
 * GET /api/events
 * Get all events
 */
export async function GET(request: NextRequest) {
  return adaptController(request, eventController.list, apiRateLimiter, 'GET');
}

/**
 * POST /api/events
 * Create a new event
 */
export async function POST(request: NextRequest) {
  return adaptController(request, eventController.create, apiRateLimiter, 'POST');
}