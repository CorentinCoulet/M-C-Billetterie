'use client'

import { memo, useCallback, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AuthPage } from '../../src/components/AuthPage'
import { useApp } from '../../src/context/AppContext'

const Background = memo(function Background() {
  return (
    <div className="fixed inset-0 -z-10">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800" />
    </div>
  )
})

export default function LoginClient({ initialTab }: { initialTab?: 'login' | 'register' }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { currentUser, isLoading } = useApp()

  const navigate = useCallback((page: string) => {
    const routes: Record<string, string> = {
      home: '/',
      events: '/events',
      profile: '/profile',
      dashboard: '/dashboard',
      admin: '/admin',
    }

    const target = routes[page] ?? (page?.startsWith('/') ? page : `/${page}`)
    try {
      if (router && typeof router.push === 'function') {
        router.push(target as any)
      } else if (typeof window !== 'undefined') {
        window.location.assign(target)
      }
    } catch {
      if (typeof window !== 'undefined') {
        window.location.assign(target)
      }
    }
  }, [router])

  // Si déjà authentifié, rediriger automatiquement
  useEffect(() => {
    if (isLoading) return
    if (!currentUser) return

    const redirect = searchParams?.get('redirect') || ''
    const safeRedirect = redirect.startsWith('/') && !redirect.startsWith('/api')

    if (safeRedirect) {
      router.replace(redirect)
      return
    }

    const role = currentUser.role
    if (role === 'ADMIN') {
      router.replace('/admin')
    } else if (role === 'ORGANIZER') {
      router.replace('/dashboard')
    } else {
      router.replace('/')
    }
  }, [currentUser, isLoading, router, searchParams])

  return (
    <>
      <Background />
      <AuthPage navigate={navigate} initialTab={initialTab} />
    </>
  )
}
