'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAuthRole } from '@/hooks/use-auth'

type OrgMember = {
  id: string;
  role: 'OWNER' | 'ADMIN' | 'MANAGER' | 'MEMBER' | 'VIEWER';
  user: { id: string; email: string; name?: string | null; role?: string | null };
};

type OrganizationItem = {
  id: string;
  name: string;
  team: OrgMember[];
  events: { id: string; title: string; date: string; isPublished: boolean }[];
};

export default function DashboardEventsPage() {
  const { isAuthenticated, role, loading } = useAuthRole()
  const [organizations, setOrganizations] = useState<OrganizationItem[] | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isFetching, setIsFetching] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [orgName, setOrgName] = useState('')
  const [creatingOrg, setCreatingOrg] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Charger les organisations pour obtenir la liste d'évènements
  useEffect(() => {
    const loadOrganizations = async () => {
      if (!isAuthenticated) return
      setIsFetching(true)
      setError(null)
      try {
        const res = await fetch('/api/organizations', { credentials: 'include' })
        const json = await res.json()
        if (!res.ok || !json.success) throw new Error(json.error || 'Erreur de chargement')
        setOrganizations(json.data as OrganizationItem[])
      } catch (e: any) {
        setError(e.message || 'Erreur inconnue')
      } finally {
        setIsFetching(false)
      }
    }
    loadOrganizations()
  }, [isAuthenticated])

  const activeOrg = useMemo(() => organizations?.[0] ?? null, [organizations])

  const refreshOrganizations = async () => {
    try {
      const res = await fetch('/api/organizations', { credentials: 'include' })
      const json = await res.json()
      if (res.ok && json.success) setOrganizations(json.data as OrganizationItem[])
    } catch {}
  }

  async function handleCreateOrg(e: React.FormEvent) {
    e.preventDefault()
    const name = orgName.trim()
    if (!name) return
    setCreatingOrg(true)
    try {
      const res = await fetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error || 'Création d\'organisation impossible')
      setOrgName('')
      await refreshOrganizations()
    } catch (e: any) {
      alert(e.message || 'Erreur lors de la création de l\'organisation')
    } finally {
      setCreatingOrg(false)
    }
  }

  async function handlePublish(eventId: string) {
    if (!confirm('Publier cet événement ?')) return
    setBusyId(eventId)
    try {
      const res = await fetch(`/api/events/${eventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isPublished: true })
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error || 'Publication impossible')
      await refreshOrganizations()
    } catch (e: any) {
      alert(e.message || 'Erreur lors de la publication')
    } finally {
      setBusyId(null)
    }
  }

  async function handleCancel(eventId: string) {
    if (!confirm('Annuler cet événement ?')) return
    setBusyId(eventId)
    try {
      const res = await fetch(`/api/events/${eventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isPublished: false })
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error || 'Annulation impossible')
      await refreshOrganizations()
    } catch (e: any) {
      alert(e.message || 'Erreur lors de l\'annulation')
    } finally {
      setBusyId(null)
    }
  }

  async function handleDelete(eventId: string) {
    if (!confirm('Supprimer définitivement cet événement ?')) return
    setBusyId(eventId)
    try {
      const res = await fetch(`/api/events/${eventId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error || 'Suppression impossible')
      await refreshOrganizations()
    } catch (e: any) {
      alert(e.message || 'Erreur lors de la suppression')
    } finally {
      setBusyId(null)
    }
  }

  if (!mounted || loading || isFetching) {
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
          <p className="text-gray-600">Veuillez vous connecter pour accéder à vos évènements.</p>
          <a href="/login?redirect=/dashboard/events" className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded-md">Se connecter</a>
        </div>
      </div>
    )
  }

  if (role !== 'ORGANIZER' && role !== 'ADMIN') {
    return (
      <div className="min-h-screen p-6">
        <h1 className="text-2xl font-bold mb-2">Mes évènements</h1>
        <p className="text-gray-600">Cette section est réservée aux organisateurs.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Mes évènements</h1>
        <a href="/dashboard/events/new" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Créer un évènement</a>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-md border border-red-300 text-red-700 bg-red-50">{error}</div>
      )}

      {!activeOrg ? (
        <div className="max-w-xl">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold mb-2">Aucune organisation active</h2>
            <p className="text-gray-600 mb-4">Créez votre organisation pour pouvoir rattacher vos évènements et gérer votre staff.</p>
            <form onSubmit={handleCreateOrg} className="flex gap-2">
              <input
                type="text"
                placeholder="Nom de l\'organisation"
                className="flex-1 border rounded-md px-3 py-2"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
              />
              <button
                type="submit"
                disabled={creatingOrg || !orgName.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {creatingOrg ? 'Création...' : 'Créer'}
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Titre</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {(activeOrg.events || []).map(ev => (
                  <tr key={ev.id}>
                    <td className="px-4 py-2">{ev.title}</td>
                    <td className="px-4 py-2">{new Date(ev.date).toLocaleString('fr-FR')}</td>
                    <td className="px-4 py-2">{ev.isPublished ? 'Publié' : 'Brouillon/Annulé'}</td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex gap-2 justify-end">
                        <a href={`/events/${ev.id}`} className="px-3 py-1 border rounded-md hover:bg-gray-50">Voir</a>
                        {!ev.isPublished && (
                          <button onClick={() => handlePublish(ev.id)} disabled={busyId === ev.id} className="px-3 py-1 border rounded-md hover:bg-gray-50 disabled:opacity-50">
                            {busyId === ev.id ? 'Publication...' : 'Publier'}
                          </button>
                        )}
                        {ev.isPublished && (
                          <button onClick={() => handleCancel(ev.id)} disabled={busyId === ev.id} className="px-3 py-1 border rounded-md hover:bg-gray-50 disabled:opacity-50">
                            {busyId === ev.id ? 'Annulation...' : 'Annuler'}
                          </button>
                        )}
                        <button onClick={() => handleDelete(ev.id)} disabled={busyId === ev.id} className="px-3 py-1 border rounded-md hover:bg-red-50 disabled:opacity-50 text-red-700 border-red-300">
                          {busyId === ev.id ? 'Suppression...' : 'Supprimer'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {activeOrg.events?.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-gray-500">Aucun évènement encore.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
