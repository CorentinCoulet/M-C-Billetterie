import { logger } from '@/lib/logger';
import { createMethodHandler, NextApiResponse, withAuth } from '@/lib/next-api-helpers';
import { DashboardService } from '@/services/dashboard.service';
import { UserRole } from '@/types/enums/user.enum';
import { NextRequest } from 'next/server';

async function handleGet(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    try {
      // Get role from query params or use user's role
      const { searchParams } = new URL(request.url);
      const roleParam = searchParams.get('role');
      const role = (roleParam as UserRole) || (user.role as UserRole);

      logger.info({ userId: user.id, role, requestedRole: roleParam }, 'Fetching dashboard stats');

      // Validate role
      if (!Object.values(UserRole).includes(role)) {
        logger.warn({ userId: user.id, invalidRole: roleParam }, 'Invalid role specified for dashboard stats');
        return NextApiResponse.badRequest('Invalid role specified');
      }

      // Check if user has permission for this role
      if (user.role !== role && user.role !== UserRole.ADMIN) {
        logger.warn({ userId: user.id, userRole: user.role, requestedRole: role }, 'Insufficient permissions for dashboard stats');
        return NextApiResponse.forbidden('Insufficient permissions');
      }

      // Get dashboard stats
      const stats = await DashboardService.getDashboardStats(user.id, role);

      logger.info({ userId: user.id, role }, 'Dashboard stats retrieved successfully');

      return NextApiResponse.success(stats);

    } catch (error) {
      logger.error({ error, userId: user.id }, 'Dashboard stats API error');
      return NextApiResponse.error('Internal server error');
    }
  });
}

export const GET = createMethodHandler({
  GET: handleGet,
});
