'use client';

import { useAuthContext } from '@/contexts/AuthContext';
import { useUserContext } from '@/contexts/UserContext';
import { User } from '@prisma/client';

/**
 * Custom hook that provides authentication functionality
 * This is a wrapper around the AuthContext and UserContext
 * to provide a simpler interface for authentication
 */
export function useAuth() {
  const auth = useAuthContext();
  const user = useUserContext();

  return {
    // User state
    user: auth.user,
    profile: user.profile,
    isAuthenticated: !!auth.user,
    isLoading: auth.loading || user.loading,
    error: auth.error || user.error,

    // Auth methods
    login: auth.login,
    register: auth.register,
    logout: auth.logout,

    // Profile methods
    updateProfile: user.updateProfile,

    // Utility methods
    clearError: () => {
      auth.clearError();
      user.clearError();
    },
  };
}

export default useAuth;
