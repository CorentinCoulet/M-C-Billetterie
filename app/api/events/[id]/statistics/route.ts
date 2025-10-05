import { NextRequest } from 'next/server';
import {
    createMethodHandler,
    NextApiResponse,
    withAdminAuth
} from '../../../../../src/lib/next-api-helpers';

async function handleGetEventStatistics(request: NextRequest, { params }: { params: { id: string } }) {
  return withAdminAuth(request, async (req, user) => {
    try {
      const { id } = params;

      // Import event service
      const eventServiceModule = await import('../../../../../src/modules/event/event.service');

      // Get event statistics
      const stats = await eventServiceModule.getStatistics(id);

      return NextApiResponse.success(stats, 'Statistiques récupérées');
    } catch (error: any) {
      console.error('Get event statistics error:', error);
      return NextApiResponse.error('Erreur lors de la récupération des statistiques', 500);
    }
  });
}

export default createMethodHandler({
  GET: handleGetEventStatistics,
});
