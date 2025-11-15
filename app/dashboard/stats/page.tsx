'use client'

import { useRouter } from 'next/navigation'
import { useApp } from '../../../src/context/AppContext'
import { useEffect } from 'react'

export default function DashboardStatsPage() {
  const { currentUser, isLoading } = useApp()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !currentUser) {
      router.push('/login')
    }
  }, [currentUser, isLoading, router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Chargement...</p>
      </div>
    )
  }

  if (!currentUser) return null

  return (
    <div className="min-h-screen p-6">
      <h1 className="text-2xl font-bold mb-4">Statistiques</h1>
      <p className="text-muted-foreground">Tableau de bord des statistiques organisateur (à compléter).</p>
    </div>
  )
}
