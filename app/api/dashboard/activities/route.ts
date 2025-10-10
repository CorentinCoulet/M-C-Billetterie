import { NextApiResponse, withAuth, createMethodHandler } from '@/lib/next-api-helpers';
import { DashboardService } from '@/services/dashboard.service';
import { UserRole } from '@/types/enums/user.enum';
import { NextRequest } from 'next/server';
import { logger } from '@/lib/logger';

async function handleGet(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    try {
      const role = user.role as UserRole;

      logger.info({ userId: user.id, role }, 'Fetching recent activities');

      // Get recent activities
      const activities = await DashboardService.getRecentActivities(user.id, role);

      logger.info({ userId: user.id, activityCount: activities?.length || 0 }, 'Activities retrieved successfully');

      return NextApiResponse.success(activities);

    } catch (error) {
      logger.error({ error, userId: user.id }, 'Dashboard activities API error');
      return NextApiResponse.error('Internal server error');
    }
  });
}

export const GET = createMethodHandler({
  GET: handleGet,
});
