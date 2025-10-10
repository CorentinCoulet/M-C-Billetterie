import { logger } from '@/lib/logger';
import { NextRequest } from 'next/server';
import {
    createMethodHandler,
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
      logger.error({ error, userId: user.id, eventId: id }, 'Get event statistics error');
      return NextApiResponse.error('Erreur lors de la récupération des statistiques', 500);
    }
  });
}

export default createMethodHandler({
  GET: handleGetEventStatistics,
});
