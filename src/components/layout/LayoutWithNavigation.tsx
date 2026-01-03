'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useCallback, useState } from 'react'
import { useApp } from '../../context/AppContext'
import { Background } from '../common/Background'
import { Footer } from '../common/Footer'
import { Header } from '../common/Header'

interface LayoutWithNavigationProps {
  children: React.ReactNode
}

export function LayoutWithNavigation({ children }: LayoutWithNavigationProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { currentUser, logout } = useApp()
  const [favorites, setFavorites] = useState<number[]>([])
  const [cart, setCart] = useState<any[]>([])

  const authPaths = ['/login', '/register', '/forgot-password', '/reset-password']
  const isAuthPage = !!pathname && (
    authPaths.includes(pathname) ||
    pathname.startsWith('/auth')
  )

  const navigate = useCallback((page: string) => {
    const routes: Record<string, string> = {
      home: '/',
      events: '/events',
      about: '/about',
      contact: '/contact',
      faq: '/faq',
      profile: '/profile',
      cart: '/cart',
      auth: '/login',
      help: '/help',
      dashboard: '/dashboard',
    };

    const target = routes[page] ?? (page?.startsWith('/') ? page : `/${page}`);

    try {
      if (router && typeof router.push === 'function') {
        router.push(target as any);
      } else if (typeof window !== 'undefined') {
        window.location.assign(target);
      }
    } catch (e) {
      if (typeof window !== 'undefined') {
        window.location.assign(target);
      }
    }
  }, [router])

  if (isAuthPage) {
    return <>{children}</>
  }

  const currentPage = pathname.split('/')[1] || 'home'

  return (
    <div className="min-h-screen">
      <Background />
      <Header 
        navigate={navigate}
        currentPage={currentPage}
        currentUser={currentUser}
        favorites={favorites}
        cart={cart}
        logout={logout}
      />
      <main className="min-h-screen pb-12 pt-36">
        {children}
      </main>
      <Footer navigate={navigate} />
    </div>
  )
}
