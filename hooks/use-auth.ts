import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface User {
  id: string
  name: string
  email: string
  role: 'USER' | 'ADMIN'
}

interface AuthState {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
}

/**
 * Authentication hook
 * Manages the global authentication state of the user
 */
export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false
  })
  const router = useRouter()

  useEffect(() => {
    // Check authentication state on mount
    checkAuthState()
  }, [])

  const checkAuthState = async () => {
    try {
      const response = await fetch('/api/auth/me', {
        method: 'GET',
        credentials: 'include'
      })

      if (response.ok) {
        const user = await response.json()
        setAuthState({
          user,
          isLoading: false,
          isAuthenticated: true
        })
      } else {
        setAuthState({
          user: null,
          isLoading: false,
          isAuthenticated: false
        })
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      setAuthState({
        user: null,
        isLoading: false,
        isAuthenticated: false
      })
    }
  }

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
        credentials: 'include'
      })

      if (response.ok) {
        const user = await response.json()
        setAuthState({
          user,
          isLoading: false,
          isAuthenticated: true
        })
        return { success: true, user }
      } else {
        const error = await response.json()
        return { success: false, error: error.message }
      }
    } catch (error) {
      return { success: false, error: 'Erreur de connexion' }
    }
  }

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      })
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setAuthState({
        user: null,
        isLoading: false,
        isAuthenticated: false
      })
      router.push('/login')
    }
  }

  const register = async (userData: {
    name: string
    email: string
    password: string
  }) => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
        credentials: 'include'
      })

      if (response.ok) {
        const user = await response.json()
        setAuthState({
          user,
          isLoading: false,
          isAuthenticated: true
        })
        return { success: true, user }
      } else {
        const error = await response.json()
        return { success: false, error: error.message }
      }
    } catch (error) {
      return { success: false, error: 'Erreur d\'inscription' }
    }
  }

  const refreshAuth = () => {
    checkAuthState()
  }

  return {
    ...authState,
    login,
    logout,
    register,
    refreshAuth
  }
}

// Specialized hook to retrieve only the role
export function useAuthRole() {
  const { user } = useAuth()
  return user?.role || null
}