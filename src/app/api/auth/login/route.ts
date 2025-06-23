import { NextRequest } from 'next/server';
import authController from '@/modules/auth/auth.controller';
import { authRateLimiter } from '@/middlewares/appRouterRateLimit';
import { adaptController } from '@/utils/appRouterAdapter';

/**
 * POST /api/auth/login
 * Login user
 */
export async function POST(request: NextRequest) {
  return adaptController(request, authController.login, authRateLimiter, 'POST');
}
