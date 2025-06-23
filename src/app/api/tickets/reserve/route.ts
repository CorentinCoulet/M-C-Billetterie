import { NextRequest } from 'next/server';
import * as ticketController from '@/modules/ticket/ticket.controller';
import { adaptController } from '@/utils/appRouterAdapter';
import { apiRateLimiter } from '@/middlewares/appRouterRateLimit';

/**
 * POST /api/tickets/reserve
 * Reserve tickets for an event
 */
export async function POST(request: NextRequest) {
  return adaptController(request, ticketController.reserve, apiRateLimiter, 'POST');
}