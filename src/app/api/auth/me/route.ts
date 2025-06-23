import { NextRequest } from 'next/server';
import authController from '@/modules/auth/auth.controller';
import { apiRateLimiter } from '@/middlewares/appRouterRateLimit';
import { adaptController } from '@/utils/appRouterAdapter';

/**
 * GET /api/auth/me
 * Get current user
 */
export async function GET(request: NextRequest) {
  return adaptController(request, authController.getCurrentUser, apiRateLimiter, 'GET');
}
