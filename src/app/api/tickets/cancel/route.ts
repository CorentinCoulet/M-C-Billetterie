import { NextRequest } from 'next/server';
import * as ticketController from '@/modules/ticket/ticket.controller';
import { adaptController } from '@/utils/appRouterAdapter';
import { apiRateLimiter } from '@/middlewares/appRouterRateLimit';

/**
 * POST /api/tickets/cancel
 * Cancel a ticket
 */
export async function POST(request: NextRequest) {
  return adaptController(request, ticketController.cancel, apiRateLimiter, 'POST');
}