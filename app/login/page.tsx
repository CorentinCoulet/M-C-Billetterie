'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { memo, useCallback, useEffect, Suspense } from 'react'
import { AuthPage } from '../../src/components/AuthPage'
import { useApp } from '../../src/context/AppContext'

// Force this page to be dynamic to avoid prerender errors when using client-side navigation hooks
export const dynamic = 'force-dynamic'

const Background = memo(() => (
  <div className="fixed inset-0 -z-10">
    <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800" />
  </div>
))

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { currentUser, isLoading } = useApp()

  const navigate = useCallback((page: string) => {
    const routes: Record<string, string> = {
      home: '/',
      events: '/events',
      profile: '/profile',
      dashboard: '/dashboard',
      admin: '/admin'
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
    <Suspense fallback={null}>
      <Background />
      <AuthPage navigate={navigate} />
    </Suspense>
  )
}
