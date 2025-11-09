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
  addToCart: (item: Omit<CartItem, 'addedAt'>) => void
  removeFromCart: (eventId: string) => void
  updateCartQuantity: (eventId: string, quantity: number) => void
  clearCart: () => void
}

const AppContext = createContext<AppContextType>({
  currentUser: null,
  setCurrentUser: () => {},
  logout: async () => {},
  checkAuth: async () => {},
  isLoading: true,
  cart: [],
  addToCart: () => {},
  removeFromCart: () => {},
  updateCartQuantity: () => {},
  clearCart: () => {},
})

interface AppProviderProps {
  children: ReactNode
}

export function AppProvider({ children }: AppProviderProps) {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [cart, setCart] = useState<CartItem[]>([])

  // Load cart from localStorage
  useEffect(() => {
    const savedCart = localStorage.getItem('cart')
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart))
      } catch (error) {
        console.error('Erreur chargement panier:', error)
      }
    }
  }, [])

  // Save cart to localStorage
  useEffect(() => {
    if (cart.length > 0) {
      localStorage.setItem('cart', JSON.stringify(cart))
    } else {
      localStorage.removeItem('cart')
    }
  }, [cart])

  const addToCart = useCallback((item: Omit<CartItem, 'addedAt'>) => {
    setCart((currentCart) => {
      const existingItem = currentCart.find(i => i.eventId === item.eventId)
      if (existingItem) {
        return currentCart.map(i =>
          i.eventId === item.eventId
            ? { ...i, quantity: i.quantity + item.quantity }
            : i
        )
      } else {
        return [...currentCart, { ...item, addedAt: new Date().toISOString() }]
      }
    })
  }, [])

  const removeFromCart = useCallback((eventId: string) => {
    setCart((currentCart) => currentCart.filter(item => item.eventId !== eventId))
  }, [])

  const updateCartQuantity = useCallback((eventId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(eventId)
      return
    }
    setCart((currentCart) =>
      currentCart.map(item =>
        item.eventId === eventId ? { ...item, quantity } : item
      )
    )
  }, [removeFromCart])

  const clearCart = useCallback(() => {
    setCart([])
  }, [])

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
      console.error('Erreur vérification auth:', error)
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
      console.error('Erreur logout:', error)
    } finally {
      setCurrentUser(null)
      router.push('/')
    }
  }, [router])

  // Vérifier l'auth au chargement
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