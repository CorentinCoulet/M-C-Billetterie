import { create } from 'zustand';
import { User } from '@prisma/client';

// Define the shape of our application state
interface AppState {
  // Auth state
  user: Omit<User, 'password'> | null;
  isAuthenticated: boolean;
  
  // UI state
  theme: 'light' | 'dark';
  sidebarOpen: boolean;
  
  // Actions
  setUser: (user: Omit<User, 'password'> | null) => void;
  clearUser: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
}

// Create the store
export const useAppStore = create<AppState>((set) => ({
  // Initial state
  user: null,
  isAuthenticated: false,
  theme: 'light',
  sidebarOpen: false,
  
  // Actions
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  clearUser: () => set({ user: null, isAuthenticated: false }),
  setTheme: (theme) => set({ theme }),
  toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
}));

export default useAppStore;