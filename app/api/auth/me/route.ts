import { NextRequest } from 'next/server';
import { NextApiResponse, withAuth } from '../../../../src/lib/next-api-helpers';

export async function GET(request: NextRequest) {
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

    return NextApiResponse.success(dashboardUser, 'Profil utilisateur récupéré');
  });
}

export async function POST(request: NextRequest) {
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
      console.error('Logout error:', error);
      return NextApiResponse.error('Erreur lors de la déconnexion', 500);
    }
  });
}
