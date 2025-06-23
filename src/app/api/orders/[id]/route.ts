import { NextRequest } from 'next/server';
import * as orderController from '@/modules/order/order.controller';
import { adaptController } from '@/utils/appRouterAdapter';
import { apiRateLimiter } from '@/middlewares/appRouterRateLimit';

/**
 * GET /api/orders/[id]
 * Get an order by ID
 */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
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

  return adaptController(modifiedRequest, orderController.getById, apiRateLimiter, 'GET');
}

/**
 * PUT /api/orders/[id]
 * Update an order status
 */
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
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

  return adaptController(modifiedRequest, orderController.updateStatus, apiRateLimiter, 'PUT');
}

/**
 * DELETE /api/orders/[id]
 * Cancel an order
 */
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
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

  return adaptController(modifiedRequest, orderController.cancel, apiRateLimiter, 'DELETE');
}