'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
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
  const [isAtTop, setIsAtTop] = useState(true)

  // Déterminer si nous sommes sur une page d'authentification
  // Nous masquons la navbar uniquement sur ces pages
  const authPaths = ['/login', '/register', '/forgot-password', '/reset-password']
  const isAuthPage = !!pathname && (
    authPaths.includes(pathname) ||
    pathname.startsWith('/auth') // pour couvrir /auth/* si utilisé
  )

  useEffect(() => {
    const handleScroll = () => {
      // Seuil de 100px pour une transition plus progressive
      setIsAtTop(window.scrollY < 100)
    }

    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

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

    // Calcule un chemin sûr
    const target = routes[page] ?? (page?.startsWith('/') ? page : `/${page}`);

    try {
      // Utilise le routeur Next si disponible; fallback vers location en cas d'exception
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

  // Si c'est une page d'authentification, on n'affiche pas le Header/Footer
  if (isAuthPage) {
    return <>{children}</>
  }

  // Afficher le Header/Footer sur toutes les autres pages, y compris le dashboard

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
      <main className={`min-h-screen pb-12 transition-all duration-500 ease-out ${isAtTop ? 'pt-0' : 'pt-24'}`}>
        {children}
      </main>
      <Footer navigate={navigate} />
    </div>
  )
}
