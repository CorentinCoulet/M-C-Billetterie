import { NextRequest } from 'next/server';
import {
    createMethodHandler,
    NextApiResponse,
    rateLimit,
    withAuth
} from '../../../../src/lib/next-api-helpers';

async function handleGDPRStatus(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    // GDPR Rate limiting (5 requests per day)
    if (!rateLimit(req, 5, 24 * 60 * 60 * 1000)) {
      return NextApiResponse.error('Too many GDPR requests from this IP, try again tomorrow', 429);
    }

    try {
      // Import GDPR service
      const gdprService = await import('../../../../src/modules/gdpr/gdpr.service');

      // Get compliance status
      const status = await gdprService.getComplianceStatus(user.id);

      return NextApiResponse.success(status, 'Statut de conformité GDPR récupéré');
    } catch (error: any) {
      console.error('GDPR status error:', error);
      return NextApiResponse.error('Erreur lors de la récupération du statut GDPR', 500);
    }
  });
}

export default createMethodHandler({
  GET: handleGDPRStatus,
});
