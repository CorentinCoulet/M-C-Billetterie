import { NextApiResponse, withAuth } from '@/lib/next-api-helpers';
import { DashboardService } from '@/services/dashboard.service';
import { UserRole } from '@/types/enums/user.enum';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    try {
      // Get role from query params or use user's role
      const { searchParams } = new URL(request.url);
      const roleParam = searchParams.get('role');
      const role = (roleParam as UserRole) || (user.role as UserRole);

      // Validate role
      if (!Object.values(UserRole).includes(role)) {
        return NextApiResponse.badRequest('Invalid role specified');
      }

      // Check if user has permission for this role
      if (user.role !== role && user.role !== UserRole.ADMIN) {
        return NextApiResponse.forbidden('Insufficient permissions');
      }

      // Get dashboard stats
      const stats = await DashboardService.getDashboardStats(user.id, role);

      return NextApiResponse.success(stats);

    } catch (error) {
      console.error('Dashboard stats API error:', error);
      return NextApiResponse.error('Internal server error');
    }
  });
}
