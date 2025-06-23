'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@prisma/client';
import { useAuthContext } from './AuthContext';
import NoSSR from '@/components/ui/core/NoSSR';

// Define the shape of our user context
interface UserContextType {
  profile: Omit<User, 'password'> | null;
  loading: boolean;
  error: string | null;
  updateProfile: (data: Partial<User>) => Promise<void>;
  clearError: () => void;
}

// Create the context with a default value
const UserContext = createContext<UserContextType | undefined>(undefined);

// Props for the UserProvider component
interface UserProviderProps {
  children: ReactNode;
}

// UserProvider component that will wrap the application
export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const { user } = useAuthContext();
  const [profile, setProfile] = useState<Omit<User, 'password'> | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState<boolean>(false);

  // Set mounted state and load user profile
  useEffect(() => {
    setMounted(true);

    if (user) {
      setProfile(user);
    } else {
      setProfile(null);
    }
  }, [user]);

  // Update user profile
  const updateProfile = async (data: Partial<User>) => {
    if (!user) {
      setError('You must be logged in to update your profile');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/users/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        credentials: 'include', // Include cookies
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update profile');
      }

      const updatedProfile = await response.json();
      setProfile(updatedProfile);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while updating profile');
      console.error('Profile update error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Clear error function
  const clearError = () => {
    setError(null);
  };

  // Create the context value object
  const contextValue: UserContextType = {
    profile,
    loading,
    error,
    updateProfile,
    clearError,
  };

  // Use NoSSR to prevent hydration mismatches
  return (
    <NoSSR fallback={<div>Loading user profile...</div>}>
      <UserContext.Provider value={contextValue}>
        {children}
      </UserContext.Provider>
    </NoSSR>
  );
};

// Custom hook to use the user context
export const useUserContext = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUserContext must be used within a UserProvider');
  }
  return context;
};

export default UserContext;
