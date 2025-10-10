import { NextRequest } from 'next/server';
import { z } from 'zod';
import { logger } from '../../../../lib/logger';
import { createMethodHandler, NextApiResponse, validateBody } from '../../../../src/lib/next-api-helpers';

const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(1, 'Le mot de passe est requis'),
});

async function handlePost(request: NextRequest) {
  const { data, error } = await validateBody(request, loginSchema);
  if (error) return error;

  try {
    // Import auth service
    const authServiceModule = await import('../../../../src/modules/auth/auth.service');
    const authService = authServiceModule.default;

    // Get client info
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Login user
    const result = await authService.login(data.email, data.password);

    if (!result) {
      logger.warn({ email: data.email, ipAddress }, 'Failed login attempt');
      return NextApiResponse.error('Identifiants invalides', 401);
    }

    logger.info({ userId: result.user.id, ipAddress }, 'User logged in successfully');

    // Create response with user data
    const response = NextApiResponse.success(
      {
        user: result.user,
        token: result.token,
      },
      'Connexion réussie'
    );

    // Set auth cookie
    if (result.token) {
      response.cookies.set('auth-token', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });
    }

    return response;
  } catch (error: any) {
    logger.error({ error, email: data.email }, 'Login error');
    return NextApiResponse.error(
      error.message || 'Erreur lors de la connexion',
      500
    );
  }
}

export default createMethodHandler({
  POST: handlePost,
});
