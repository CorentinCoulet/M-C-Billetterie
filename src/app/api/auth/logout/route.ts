import { NextRequest } from 'next/server';
import authController from '@/modules/auth/auth.controller';
import { apiRateLimiter } from '@/middlewares/appRouterRateLimit';
import { adaptController } from '@/utils/appRouterAdapter';

/**
 * POST /api/auth/logout
 * Logout user
 */
export async function POST(request: NextRequest) {
  return adaptController(request, authController.logout, apiRateLimiter, 'POST');
}