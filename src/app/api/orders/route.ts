import { NextRequest } from 'next/server';
import * as orderController from '@/modules/order/order.controller';
import { adaptController } from '@/utils/appRouterAdapter';
import { apiRateLimiter } from '@/middlewares/appRouterRateLimit';

/**
 * GET /api/orders
 * Get all orders for the authenticated user
 */
export async function GET(request: NextRequest) {
  return adaptController(request, orderController.list, apiRateLimiter, 'GET');
}

/**
 * POST /api/orders
 * Create a new order
 */
export async function POST(request: NextRequest) {
  return adaptController(request, orderController.create, apiRateLimiter, 'POST');
}