import { logger } from '@/lib/logger';
import { NextRequest } from 'next/server';
import { NextApiResponse } from '../../../../src/lib/next-api-helpers';

async function handleLogout(request: NextRequest) {
  try {
    // Récupère le token depuis l'en-tête Authorization ou le cookie httpOnly
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '') ||
                  request.cookies.get('auth-token')?.value;

    // Tente d'invalider la session côté serveur si un service est disponible
    if (token) {
      try {
        const authServiceModule = await import('../../../../src/modules/auth/auth.service');
        const authService = authServiceModule.default;
        await authService.logout(token);
      } catch (e) {
        // Ne bloque pas la déconnexion si l'invalidation serveur échoue
        logger.warn?.('Auth service logout failed, proceeding to clear cookie only');
      }
    }

    // Réponse OK et purge du cookie httpOnly côté serveur
    const response = NextApiResponse.success(null, 'Déconnexion réussie');
    response.cookies.set('auth-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 0, // Expire immédiatement
    });

    return response;
  } catch (error: any) {
    logger.error('Logout error', { error });
    // Même en cas d'erreur, on force la suppression du cookie pour éviter l'auto-reconnexion
    const response = NextApiResponse.error('Erreur lors de la déconnexion', 500);
    response.cookies.set('auth-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 0,
    });
    return response;
  }
}

export async function POST(request: NextRequest) {
  return handleLogout(request);
}
