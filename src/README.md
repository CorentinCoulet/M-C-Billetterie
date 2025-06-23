# Frontend Architecture

This document outlines the frontend architecture of the ticketing system.

## Custom Hooks

### `useAuth`

A custom hook that provides authentication functionality. It combines the functionality of both `AuthContext` and `UserContext` to provide a simpler interface.

```tsx
import { useAuth } from '@/hooks/useAuth';

function MyComponent() {
  const { 
    user, 
    profile, 
    isAuthenticated, 
    isLoading, 
    error, 
    login, 
    register, 
    logout, 
    updateProfile, 
    clearError 
  } = useAuth();

  // Use the authentication functions and state
}
```

### `useApi`

A custom hook for making API requests. It handles authentication, loading states, and errors.

```tsx
import { useApi } from '@/hooks/useApi';

function MyComponent() {
  const api = useApi();

  const fetchData = async () => {
    // Simple GET request
    const response = await api.get('/users');
    
    // POST request with body
    const createResponse = await api.post('/users', { name: 'John Doe' });
    
    // PUT request with body
    const updateResponse = await api.put('/users/1', { name: 'Jane Doe' });
    
    // PATCH request with body
    const patchResponse = await api.patch('/users/1', { name: 'Jane Doe' });
    
    // DELETE request
    const deleteResponse = await api.delete('/users/1');
    
    // Custom request
    const customResponse = await api.request('/users', {
      method: 'GET',
      headers: { 'X-Custom-Header': 'value' },
      includeAuth: true,
    });
  };
}
```

## React Contexts

### `AuthContext`

Provides authentication state and functions to the application.

```tsx
import { AuthProvider } from '@/contexts/AuthContext';

function App() {
  return (
    <AuthProvider>
      {/* Your app components */}
    </AuthProvider>
  );
}
```

### `UserContext`

Provides user profile state and functions for updating the profile.

```tsx
import { UserProvider } from '@/contexts/UserContext';

function App() {
  return (
    <UserProvider>
      {/* Your app components */}
    </UserProvider>
  );
}
```

## State Management

The application uses Zustand for global state management.

```tsx
import { useAppStore } from '@/store';

function MyComponent() {
  // Access state
  const user = useAppStore((state) => state.user);
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);
  const theme = useAppStore((state) => state.theme);
  const sidebarOpen = useAppStore((state) => state.sidebarOpen);
  
  // Access actions
  const setUser = useAppStore((state) => state.setUser);
  const clearUser = useAppStore((state) => state.clearUser);
  const setTheme = useAppStore((state) => state.setTheme);
  const toggleTheme = useAppStore((state) => state.toggleTheme);
  const setSidebarOpen = useAppStore((state) => state.setSidebarOpen);
  const toggleSidebar = useAppStore((state) => state.toggleSidebar);
  
  // Use the state and actions
}
```

## Integration

To use all these features together, wrap your application with the providers:

```tsx
import { AuthProvider } from '@/contexts/AuthContext';
import { UserProvider } from '@/contexts/UserContext';

function App() {
  return (
    <AuthProvider>
      <UserProvider>
        {/* Your app components */}
      </UserProvider>
    </AuthProvider>
  );
}
```

Then use the hooks in your components:

```tsx
import { useAuth } from '@/hooks/useAuth';
import { useApi } from '@/hooks/useApi';
import { useAppStore } from '@/store';

function MyComponent() {
  const { user, login, logout } = useAuth();
  const api = useApi();
  const theme = useAppStore((state) => state.theme);
  const toggleTheme = useAppStore((state) => state.toggleTheme);
  
  // Use the hooks
}
```