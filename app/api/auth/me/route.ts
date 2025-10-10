import { NextRequest } from 'next/server';
import { logger } from '../../../../lib/logger';
import { createMethodHandler, NextApiResponse, withAuth } from '../../../../src/lib/next-api-helpers';

async function handleGet(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    // Transform user data to match DashboardUser interface
    const dashboardUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isVerified: user.isVerified,
      lastLogin: user.lastLogin || null,
      permissions: [], // Add permissions if needed later
    };

    logger.debug({ userId: user.id }, 'User profile retrieved');

    return NextApiResponse.success(dashboardUser, 'Profil utilisateur récupéré');
  });
}

async function handlePost(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    try {
      // Import auth service
      const authServiceModule = await import('../../../../src/modules/auth/auth.service');
      const authService = authServiceModule.default;

      // Get token from request
      const authHeader = req.headers.get('authorization');
      const token = authHeader?.replace('Bearer ', '') || 
                    req.cookies.get('auth-token')?.value;

      if (token) {
        await authService.logout(token);
      }

      logger.info({ userId: user.id }, 'User logged out successfully');

      // Create response and clear cookie
      const response = NextApiResponse.success(null, 'Déconnexion réussie');
      response.cookies.set('auth-token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 0, // Expire immediately
      });

      return response;
    } catch (error: any) {
      logger.error({ error, userId: user.id }, 'Logout error');
      return NextApiResponse.error('Erreur lors de la déconnexion', 500);
    }
  });
}

export default createMethodHandler({
  GET: handleGet,
  POST: handlePost,
});
