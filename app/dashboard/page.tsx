'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useApp } from '../../src/context/AppContext'

export default function DashboardPage() {
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
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Chargement...</p>
        </div>
      </div>
    )
  }

  if (!currentUser) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="glass-card rounded-3xl p-8 sm:p-12">
          <div className="text-center mb-8">
            <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-primary via-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
              Dashboard Organisateur
            </h1>
            <p className="text-xl text-muted-foreground">
              Bienvenue {currentUser.name} 👋
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
            <div className="glass-card rounded-2xl p-6 border-2 border-primary/20 hover:border-primary/50 transition-all">
              <div className="text-4xl mb-4">🎉</div>
              <h3 className="text-xl font-bold mb-2">Mes Événements</h3>
              <p className="text-muted-foreground mb-4">Gérez vos événements existants</p>
              <button 
                onClick={() => router.push('/dashboard/events')}
                className="glass-button w-full"
              >
                Voir mes événements
              </button>
            </div>

            <div className="glass-card rounded-2xl p-6 border-2 border-green-500/20 hover:border-green-500/50 transition-all">
              <div className="text-4xl mb-4">➕</div>
              <h3 className="text-xl font-bold mb-2">Créer un Événement</h3>
              <p className="text-muted-foreground mb-4">Ajoutez un nouvel événement</p>
              <button 
                onClick={() => router.push('/dashboard/events/new')}
                className="glass-button w-full bg-gradient-to-r from-green-500 to-emerald-600"
              >
                Créer un événement
              </button>
            </div>

            <div className="glass-card rounded-2xl p-6 border-2 border-purple-500/20 hover:border-purple-500/50 transition-all">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-xl font-bold mb-2">Statistiques</h3>
              <p className="text-muted-foreground mb-4">Consultez vos performances</p>
              <button 
                onClick={() => router.push('/dashboard/stats')}
                className="glass-button w-full bg-gradient-to-r from-purple-500 to-pink-600"
              >
                Voir les stats
              </button>
            </div>
          </div>

          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground">
              Rôle: <span className="font-semibold text-primary">{currentUser.role}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
