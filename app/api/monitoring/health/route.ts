import { logger } from '@/lib/logger';
import { NextRequest } from 'next/server';
import {
    createMethodHandler,
    NextApiResponse,
    withAdminAuth
} from '../../../../src/lib/next-api-helpers';

async function handleGetHealthMetrics(request: NextRequest) {
  return withAdminAuth(request, async (req, user) => {
    try {
      // Import monitoring service
      const { monitoringService } = await import('../../../../src/lib/monitoring');

      // Get system health metrics
      const metrics = await monitoringService.getPerformanceMetrics();

      return NextApiResponse.success(metrics, 'Métriques de santé récupérées');
    } catch (error: any) {
      logger.error({ error, userId: user.id }, 'Health metrics error');
      return NextApiResponse.error('Erreur lors de la récupération des métriques', 500);
    }
  });
}

async function handleGetSystemStats(request: NextRequest) {
  return withAdminAuth(request, async (req, user) => {
    try {
      // Import monitoring service
      const { monitoringService } = await import('../../../../src/lib/monitoring');

      // Get system statistics (using performance metrics)
      const stats = await monitoringService.getPerformanceMetrics();

      return NextApiResponse.success(stats, 'Statistiques système récupérées');
    } catch (error: any) {
      logger.error({ error, userId: user.id }, 'System stats error');
      return NextApiResponse.error('Erreur lors de la récupération des statistiques', 500);
    }
  });
}

export default createMethodHandler({
  GET: handleGetHealthMetrics,
});
