import { NextRequest } from 'next/server';
import * as eventController from '@/modules/event/event.controller';
import { adaptController } from '@/utils/appRouterAdapter';
import { apiRateLimiter } from '@/middlewares/appRouterRateLimit';

/**
 * POST /api/events/[id]/validate-ticket
 * Validate a ticket for an event
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  // Add the id to the request query params
  const url = new URL(request.url);
  url.searchParams.set('id', params.id);
  const modifiedRequest = new NextRequest(url, {
    headers: request.headers,
    method: request.method,
    body: request.body,
    cache: request.cache,
    credentials: request.credentials,
    integrity: request.integrity,
    keepalive: request.keepalive,
    mode: request.mode,
    redirect: request.redirect,
    referrer: request.referrer,
    referrerPolicy: request.referrerPolicy,
  });

  return adaptController(modifiedRequest, eventController.validateTicket, apiRateLimiter, 'POST');
}