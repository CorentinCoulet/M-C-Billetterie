import { NextRequest } from 'next/server';
import authController from '@/modules/auth/auth.controller';
import { authRateLimiter } from '@/middlewares/appRouterRateLimit';
import { adaptController } from '@/utils/appRouterAdapter';

/**
 * POST /api/auth/register
 * Register a new user
 */
export async function POST(request: NextRequest) {
  return adaptController(request, authController.register, authRateLimiter, 'POST');
}