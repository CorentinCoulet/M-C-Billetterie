import { NextRequest } from 'next/server';
import * as ticketController from '@/modules/ticket/ticket.controller';
import { adaptController } from '@/utils/appRouterAdapter';
import { apiRateLimiter } from '@/middlewares/appRouterRateLimit';

/**
 * GET /api/tickets
 * Get all tickets for the authenticated user
 */
export async function GET(request: NextRequest) {
  return adaptController(request, ticketController.list, apiRateLimiter, 'GET');
}

/**
 * POST /api/tickets
 * Create a new ticket
 */
export async function POST(request: NextRequest) {
  return adaptController(request, ticketController.create, apiRateLimiter, 'POST');
}