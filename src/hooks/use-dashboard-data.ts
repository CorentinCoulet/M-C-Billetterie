'use client';

import {
    DashboardActivity,
    DashboardStats,
    OrganizerDashboardData,
    UserDashboardData
} from '@/types/dashboard';
import { useEffect, useState } from 'react';
import { useAuthRole } from './use-auth';

interface UseDashboardDataReturn {
  stats: DashboardStats | null;
  activities: DashboardActivity[];
  loading: boolean;
  error: string | null;
  refreshData: () => void;
}

export function useDashboardData(): UseDashboardDataReturn {
  const { role, user, isAuthenticated } = useAuthRole();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activities, setActivities] = useState<DashboardActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    if (!isAuthenticated || !user) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch stats based on role
      const statsResponse = await fetch(`/api/dashboard/stats?role=${role}`, {
        credentials: 'include',
      });

      if (!statsResponse.ok) {
        throw new Error('Failed to fetch dashboard stats');
      }

      const statsResult = await statsResponse.json();
      if (statsResult.success && statsResult.data) {
        setStats(statsResult.data);
      }

      // Fetch activities
      const activitiesResponse = await fetch('/api/dashboard/activities', {
        credentials: 'include',
      });

      if (activitiesResponse.ok) {
        const activitiesResult = await activitiesResponse.json();
        if (activitiesResult.success && activitiesResult.data) {
          setActivities(activitiesResult.data);
        }
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [role, user, isAuthenticated]);

  const refreshData = () => {
    fetchDashboardData();
  };

  return {
    stats,
    activities,
    loading,
    error,
    refreshData,
  };
}

// Hook spécialisé pour les données utilisateur
export function useUserDashboardData(): UserDashboardData | null {
  const { stats } = useDashboardData();
  const { isUser } = useAuthRole();

  if (!isUser || !stats) return null;

  return {
    upcomingEvents: stats.upcomingEvents || 0,
    totalTickets: stats.totalTickets || 0,
    recentOrders: stats.recentOrders || 0,
    notifications: stats.notifications || 0,
    favoriteEvents: stats.favoriteEvents || [],
    recentActivity: stats.recentActivity || [],
  };
}

// Hook spécialisé pour les données organisateur
export function useOrganizerDashboardData(): OrganizerDashboardData | null {
  const { stats } = useDashboardData();
  const { isOrganizer } = useAuthRole();

  if (!isOrganizer || !stats) return null;

  return {
    totalEvents: stats.totalEvents || 0,
    totalRevenue: stats.totalRevenue || 0,
    totalParticipants: stats.totalParticipants || 0,
    activeEvents: stats.activeEvents || 0,
    recentSales: stats.recentSales || [],
    topEvents: stats.topEvents || [],
  };
}

// Hook spécialisé pour les données admin
export function useAdminDashboardData() {
  const { stats, loading, error, refreshData } = useDashboardData();
  const { isAdmin } = useAuthRole();

  const adminData = isAdmin && stats ? {
    totalUsers: stats.totalUsers || 0,
    platformRevenue: stats.platformRevenue || 0,
    systemHealth: stats.systemHealth || 100,
    securityAlerts: stats.securityAlerts || 0,
    recentUsers: stats.recentUsers || [],
    systemMetrics: stats.systemMetrics || [],
  } : null;

  return {
    stats: adminData,
    isLoading: loading,
    error,
    refreshData,
  };
}
