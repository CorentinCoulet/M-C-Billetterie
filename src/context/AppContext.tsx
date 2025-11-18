'use client'

import { useRouter } from 'next/navigation'
import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react'

export interface User {
  id: string
  email: string
  name?: string
  role?: string
}

export interface CartItem {
  id?: string
  eventId: string
  eventName: string
  quantity: number
  price: number
  addedAt: string
}

interface AppContextType {
  currentUser: User | null
  setCurrentUser: (user: User | null) => void
  logout: () => Promise<void>
  checkAuth: () => Promise<void>
  isLoading: boolean
  cart: CartItem[]
  addToCart: (item: Omit<CartItem, 'addedAt' | 'id'>) => Promise<void>
  removeFromCart: (eventId: string) => Promise<void>
  updateCartQuantity: (eventId: string, quantity: number) => Promise<void>
  clearCart: () => Promise<void>
}

const AppContext = createContext<AppContextType>({
  currentUser: null,
  setCurrentUser: () => {},
  logout: async () => {},
  checkAuth: async () => {},
  isLoading: true,
  cart: [],
  addToCart: async () => {},
  removeFromCart: async () => {},
  updateCartQuantity: async () => {},
  clearCart: async () => {},
})

interface AppProviderProps {
  children: ReactNode
}

export function AppProvider({ children }: AppProviderProps) {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [cart, setCart] = useState<CartItem[]>([])

  const loadCartFromAPI = useCallback(async () => {
    if (!currentUser) return

    try {
      const response = await fetch('/api/cart', {
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data) {
          setCart(data.data)
        }
      }
    } catch (error) {
      console.error('Error loading cart:', error)
    }
  }, [currentUser])

  useEffect(() => {
    if (currentUser) {
      loadCartFromAPI()
    } else {
      setCart([])
    }
  }, [currentUser, loadCartFromAPI])

  const addToCart = useCallback(async (item: Omit<CartItem, 'addedAt' | 'id'>) => {
    if (!currentUser) return

    try {
      const response = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(item)
      })

      if (response.ok) {
        await loadCartFromAPI()
      }
    } catch (error) {
      console.error('Error adding to cart:', error)
    }
  }, [currentUser, loadCartFromAPI])

  const removeFromCart = useCallback(async (eventId: string) => {
    if (!currentUser) return

    const item = cart.find(i => i.eventId === eventId)
    if (!item?.id) return

    try {
      const response = await fetch(`/api/cart/${item.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (response.ok) {
        await loadCartFromAPI()
      }
    } catch (error) {
      console.error('Error removing from cart:', error)
    }
  }, [currentUser, cart, loadCartFromAPI])

  const updateCartQuantity = useCallback(async (eventId: string, quantity: number) => {
    if (!currentUser) return

    if (quantity <= 0) {
      await removeFromCart(eventId)
      return
    }

    const item = cart.find(i => i.eventId === eventId)
    if (!item?.id) return

    try {
      const response = await fetch(`/api/cart/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ quantity })
      })

      if (response.ok) {
        await loadCartFromAPI()
      }
    } catch (error) {
      console.error('Error updating cart:', error)
    }
  }, [currentUser, cart, removeFromCart, loadCartFromAPI])

  const clearCart = useCallback(async () => {
    if (!currentUser) return

    try {
      const response = await fetch('/api/cart', {
        method: 'DELETE',
        credentials: 'include',
      })

      if (response.ok) {
        setCart([])
      }
    } catch (error) {
      console.error('Error clearing cart:', error)
    }
  }, [currentUser])

  const checkAuth = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data) {
          setCurrentUser(data.data)
        } else {
          setCurrentUser(null)
        }
      } else {
        setCurrentUser(null)
      }
    } catch (error) {
      console.error('Error checking auth:', error)
      setCurrentUser(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      })
    } catch (error) {
      console.error('Error logging out:', error)
    } finally {
      try {
        // Nettoyage défensif côté client
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth-token')
          sessionStorage.removeItem('auth-token')
        }
      } catch {}
      setCurrentUser(null)
      setCart([])
      // Rediriger explicitement vers la page de connexion pour éviter toute confusion
      router.replace('/login?loggedOut=1')
    }
  }, [router])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  const value: AppContextType = {
    currentUser,
    setCurrentUser,
    logout,
    checkAuth,
    isLoading,
    cart,
    addToCart,
    removeFromCart,
    updateCartQuantity,
    clearCart,
  }

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  return useContext(AppContext)
}