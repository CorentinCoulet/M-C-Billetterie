'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useCallback, useState } from 'react'
import { Background } from '../common/Background'
import { Footer } from '../common/Footer'
import { Header } from '../common/Header'

interface LayoutWithNavigationProps {
  children: React.ReactNode
}

export function LayoutWithNavigation({ children }: LayoutWithNavigationProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [favorites, setFavorites] = useState<number[]>([])
  const [cart, setCart] = useState<any[]>([])

  // Détecter si on est sur la page de connexion
  const isLoginPage = pathname === '/login'

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
      help: '/help'
    }
    router.push(routes[page] || `/${page}`)
  }, [router])

  const logout = useCallback(() => {
    setCurrentUser(null)
    router.push('/')
  }, [router])

  // Si c'est la page de connexion, on n'affiche pas le Header/Footer
  if (isLoginPage) {
    return <>{children}</>
  }

  // Extraire le nom de la page actuelle pour le Header
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
      <main className="min-h-screen pt-24 pb-12">
        {children}
      </main>
      <Footer navigate={navigate} />
    </div>
  )
}
