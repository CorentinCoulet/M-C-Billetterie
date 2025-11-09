'use client'

import { useRouter } from 'next/navigation'
import { memo, useCallback } from 'react'
import { AuthPage } from '../../src/components/AuthPage'

const Background = memo(() => (
  <div className="fixed inset-0 -z-10">
    <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800" />
  </div>
))

export default function LoginPage() {
  const router = useRouter()

  const navigate = useCallback((page: string) => {
    const routes: Record<string, string> = {
      home: '/',
      events: '/events',
      profile: '/profile'
    }
    router.push(routes[page] || `/${page}`)
  }, [router])

  return (
    <>
      <Background />
      <AuthPage navigate={navigate} />
    </>
  )
}
