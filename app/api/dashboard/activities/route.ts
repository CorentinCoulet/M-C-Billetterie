import { NextApiResponse, withAuth } from '@/lib/next-api-helpers';
import { DashboardService } from '@/services/dashboard.service';
import { UserRole } from '@/types/enums/user.enum';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    try {
      const role = user.role as UserRole;

      // Get recent activities
      const activities = await DashboardService.getRecentActivities(user.id, role);

      return NextApiResponse.success(activities);

    } catch (error) {
      console.error('Dashboard activities API error:', error);
      return NextApiResponse.error('Internal server error');
    }
  });
}
