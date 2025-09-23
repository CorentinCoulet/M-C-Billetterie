import { NextRequest } from 'next/server';
import {
    createMethodHandler,
    NextApiResponse,
    rateLimit,
    withAuth
} from '../../../../src/lib/next-api-helpers';

async function handleGDPRExport(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    // GDPR Rate limiting (5 requests per day)
    if (!rateLimit(req, 5, 24 * 60 * 60 * 1000)) {
      return NextApiResponse.error('Too many GDPR requests from this IP, try again tomorrow', 429);
    }

    try {
      // Import GDPR service
      const gdprService = await import('../../../../src/modules/gdpr/gdpr.service');

      // Export user data
      const exportData = await gdprService.exportUserData(user.id);

      return NextApiResponse.success(exportData, 'Données utilisateur exportées');
    } catch (error: any) {
      console.error('GDPR export error:', error);
      return NextApiResponse.error('Erreur lors de l\'export des données', 500);
    }
  });
}

export default createMethodHandler({
  POST: handleGDPRExport,
});
