import { NextRequest } from 'next/server';
import authController from '@/modules/auth/auth.controller';
import { authRateLimiter } from '@/middlewares/appRouterRateLimit';
import { adaptController } from '@/utils/appRouterAdapter';

/**
 * POST /api/auth/change-password
 * Change user password
 */
export async function POST(request: NextRequest) {
  return adaptController(request, authController.changePassword, authRateLimiter, 'POST');
}