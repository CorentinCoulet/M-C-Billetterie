'use client'

import { useOrganizerDashboardData } from '@/hooks/use-dashboard-data'
import { useAuthRole } from '@/hooks/use-auth'
import { useEffect, useState } from 'react'

export default function DashboardStatsPage() {
  const { isAuthenticated, role, loading } = useAuthRole()
  const data = useOrganizerDashboardData()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Chargement...</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Accès refusé</h1>
          <p className="text-gray-600">Veuillez vous connecter pour consulter les statistiques.</p>
          <a href="/login?redirect=/dashboard/stats" className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded-md">Se connecter</a>
        </div>
      </div>
    )
  }

  if (role !== 'ORGANIZER' && role !== 'ADMIN') {
    return (
      <div className="min-h-screen p-6">
        <h1 className="text-2xl font-bold mb-2">Statistiques</h1>
        <p className="text-gray-600">Cette section est réservée aux organisateurs.</p>
      </div>
    )
  }

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Chargement...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Statistiques</h1>
        <div className="flex gap-3">
          <a href="/dashboard/events" className="px-3 py-2 border rounded-md hover:bg-gray-50">Gérer mes évènements</a>
          <a href="/dashboard/events/new" className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Créer un évènement</a>
        </div>
      </div>

      {!data ? (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <p className="text-gray-600">Chargement des statistiques...</p>
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <div className="text-sm text-gray-500">Évènements</div>
              <div className="text-3xl font-bold">{data.totalEvents}</div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <div className="text-sm text-gray-500">Actifs</div>
              <div className="text-3xl font-bold text-green-600">{data.activeEvents}</div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <div className="text-sm text-gray-500">Participants</div>
              <div className="text-3xl font-bold text-blue-600">{data.totalParticipants}</div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <div className="text-sm text-gray-500">Revenus</div>
              <div className="text-3xl font-bold text-emerald-600">{data.totalRevenue.toLocaleString('fr-FR')} €</div>
            </div>
          </div>

          {/* Graphiques simplifiés (barres de progression) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold mb-4">Progression Revenus</h3>
              <div className="bg-gray-200 rounded-full h-2">
                <div className="bg-emerald-600 h-2 rounded-full" style={{ width: '70%' }}></div>
              </div>
              <p className="text-sm text-gray-500 mt-2">Objectif mensuel estimé: {(data.totalRevenue * 1.25).toLocaleString('fr-FR')} €</p>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold mb-4">Taux de participation</h3>
              <div className="bg-gray-200 rounded-full h-2">
                {(() => {
                  const widthPct = data.totalEvents
                    ? Math.min(100, Math.round((data.totalParticipants / (data.totalEvents * 100)) * 100))
                    : 0;
                  return (
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${widthPct}%` }}
                    ></div>
                  );
                })()}
              </div>
              <p className="text-sm text-gray-500 mt-2">Moyenne par évènement: {data.totalEvents > 0 ? Math.round(data.totalParticipants / data.totalEvents) : 0}</p>
            </div>
          </div>

          {/* Top events (liste simplifiée si disponible) */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold mb-4">Top évènements</h3>
            {data.topEvents && data.topEvents.length > 0 ? (
              <ul className="divide-y">
                {data.topEvents.map((ev: any) => (
                  <li key={ev.id} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="font-medium">{ev.title}</div>
                      <div className="text-sm text-gray-500">{new Date(ev.date).toLocaleDateString('fr-FR')}</div>
                    </div>
                    <a href={`/events/${ev.id}`} className="text-blue-600 hover:text-blue-800">Voir</a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500">Pas de données disponibles.</p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
