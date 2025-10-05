import { NextRequest } from 'next/server';
import {
    createMethodHandler,
    NextApiResponse,
    withAuth
} from '../../../../src/lib/next-api-helpers';

async function handleLogout(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    try {
      // Pour le moment, le logout côté client suffit 
      // (supprimer le token du localStorage/cookies)
      // TODO: Implémenter une blacklist de tokens côté serveur si nécessaire

      return NextApiResponse.success(null, 'Déconnexion réussie');
    } catch (error: any) {
      console.error('Logout error:', error);
      return NextApiResponse.error('Erreur lors de la déconnexion', 500);
    }
  });
}

export default createMethodHandler({
  POST: handleLogout,
});
