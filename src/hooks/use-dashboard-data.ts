'use client';

import {
    DashboardActivity,
    DashboardStats,
    OrganizerDashboardData,
    UserDashboardData
} from '@/types/dashboard';
import { useCallback, useEffect, useRef, useState } from 'react';
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Prevent duplicate fetches on re-render by tracking the last fetch key
  const lastFetchKeyRef = useRef<string>('');
  const isFetchingRef = useRef<boolean>(false);

  const fetchDashboardData = useCallback(async () => {
    if (!isAuthenticated || !user) return;

    const fetchKey = `${user.id}:${role}`;
    // Skip if a fetch for the same user/role just happened
    if (lastFetchKeyRef.current === fetchKey || isFetchingRef.current) return;

    isFetchingRef.current = true;
    lastFetchKeyRef.current = fetchKey;

    const ac = new AbortController();
    try {
      setLoading(true);
      setError(null);

      // Fetch stats based on role
      const statsResponse = await fetch(`/api/dashboard/stats?role=${role}`, {
        credentials: 'include',
        signal: ac.signal,
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
        signal: ac.signal,
      });

      if (activitiesResponse.ok) {
        const activitiesResult = await activitiesResponse.json();
        if (activitiesResult.success && activitiesResult.data) {
          setActivities(activitiesResult.data);
        }
      }

    } catch (err) {
      if (!(err instanceof DOMException && err.name === 'AbortError')) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      }
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
    }
  }, [isAuthenticated, user, role]);

  // Only (re)fetch when authentication status transitions to an authenticated user
  useEffect(() => {
    if (isAuthenticated && user) {
      // Authenticated: trigger fetch
      fetchDashboardData();
    } else {
      // Not authenticated: ensure we are not stuck in loading state
      setLoading(false);
      setStats(null);
      setActivities([]);
      lastFetchKeyRef.current = '';
    }
  }, [isAuthenticated, user?.id, role, fetchDashboardData]);

  const refreshData = () => {
    // Allow manual refresh regardless of lastFetchKey
    // Reset the key so a new fetch will be triggered
    lastFetchKeyRef.current = '';
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
