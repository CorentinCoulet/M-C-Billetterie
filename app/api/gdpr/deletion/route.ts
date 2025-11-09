import { NextRequest } from 'next/server';
import {
  NextApiResponse,
  rateLimit,
  withAuth
} from '../../../../src/lib/next-api-helpers';

async function handleGDPRDeletion(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    // GDPR Rate limiting (5 requests per day)
    if (!rateLimit(req, 5, 24 * 60 * 60 * 1000)) {
      return NextApiResponse.error('Too many GDPR requests from this IP, try again tomorrow', 429);
    }

    try {
      // Import GDPR service
      const gdprService = await import('../../../../src/modules/gdpr/gdpr.service');

      // Delete user data
      const deleteResult = await gdprService.deleteUserData(user.id);

      return NextApiResponse.success(deleteResult, 'Demande de suppression des données traitée');
    } catch (error: any) {
      return NextApiResponse.error('Erreur lors de la suppression des données', 500);
    }
  });
}

export async function POST(request: NextRequest) {
  return handleGDPRDeletion(request);
}
