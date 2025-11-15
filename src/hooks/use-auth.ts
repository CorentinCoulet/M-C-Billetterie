'use client';

import { DashboardUser } from '@/types/dashboard';
import { UserRole } from '@/types/enums/user.enum';
import { useEffect, useState } from 'react';

interface UseAuthReturn {
  user: DashboardUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<DashboardUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/auth/me', {
          method: 'GET',
          credentials: 'include',
        });

        if (response.ok) {
          const result = await response.json();
          // Handle API response format with success property
          if (result.success && result.data) {
            setUser(result.data);
          } else {
            setUser(null);
          }
        } else {
          setUser(null);
        }
      } catch (err) {
        setError('Failed to fetch user data');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  return {
    user,
    isAuthenticated: !!user,
    loading,
    error,
  };
}

export function useAuthRole() {
  const { user, isAuthenticated, loading, error } = useAuth();
  const role = (user?.role as UserRole) || UserRole.USER;
  
  return {
    user,
    isAuthenticated,
    loading,
    error,
    role,
    isUser: role === UserRole.USER,
    isOrganizer: role === UserRole.ORGANIZER,
    isAdmin: role === UserRole.ADMIN,
    canCreateEvents: role === UserRole.ORGANIZER || role === UserRole.ADMIN,
    canModerateContent: role === UserRole.ADMIN,
    hasRole: (requiredRole: UserRole) => role === requiredRole,
    hasAnyRole: (roles: UserRole[]) => roles.includes(role),
  };
}
