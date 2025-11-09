import { NextRequest } from 'next/server';
import {
  NextApiResponse,
  withAdminAuth
} from '../../../../../src/lib/next-api-helpers';

async function handleGetEventStatistics(request: NextRequest, { params }: { params: { id: string } }) {
  return withAdminAuth(request, async (req, user) => {
    const { id } = params;
    
    try {
      // Import event service
      const eventServiceModule = await import('../../../../../src/modules/event/event.service');

      // Get event statistics
      const stats = await eventServiceModule.getStatistics(id);

      return NextApiResponse.success(stats, 'Statistiques récupérées');
    } catch (error: any) {
      return NextApiResponse.error('Erreur lors de la récupération des statistiques', 500);
    }
  });
}

export async function GET(request: NextRequest, context: { params: { id: string } }) {
  return handleGetEventStatistics(request, context);
}
