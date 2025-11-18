import { logger } from '@/lib/logger';
import { NextRequest } from 'next/server';
import { NextApiResponse, withAuth } from '../../../../src/lib/next-api-helpers';

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

    logger.debug('User profile retrieved', { userId: user.id });

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

      logger.info('User logged out successfully', { userId: user.id });

      // Create response and clear cookie
      const response = NextApiResponse.success(null, 'Déconnexion réussie');
      response.cookies.set('auth-token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 0, // Expire immediately
      });

    return response;
    } catch (error: any) {
      logger.error('Logout error', { error, userId: user.id });
      return NextApiResponse.error('Erreur lors de la déconnexion', 500);
    }
  });
}

export async function GET(request: NextRequest) {
  return handleGet(request);
}

export async function POST(request: NextRequest) {
  return handlePost(request);
}

// Export par défaut pour compatibilité avec certains tests (Jest)
export default async function handler(request: NextRequest) {
  if (request.method === 'GET') {
    return handleGet(request);
  }
  if (request.method === 'POST') {
    return handlePost(request);
  }
  return NextApiResponse.error('Method Not Allowed', 405);
}
