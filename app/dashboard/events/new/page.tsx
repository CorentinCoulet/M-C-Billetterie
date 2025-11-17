"use client"

import { useAuthRole } from '@/hooks/use-auth'
import { useEffect, useMemo, useState } from 'react'

type OrganizationItem = {
  id: string;
  name: string;
};

export default function DashboardNewEventPage() {
  const { isAuthenticated, role, loading } = useAuthRole()
  const [organizations, setOrganizations] = useState<OrganizationItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isFetching, setIsFetching] = useState(true)
  const [busy, setBusy] = useState(false)
  const [orgName, setOrgName] = useState('')
  const [creatingOrg, setCreatingOrg] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [form, setForm] = useState({
    title: '',
    description: '',
    location: '',
    date: '',
    maxCapacity: '',
    isPublished: false,
  })

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const load = async () => {
      if (!isAuthenticated) return
      setIsFetching(true)
      setError(null)
      try {
        const res = await fetch('/api/organizations', { credentials: 'include' })
        const json = await res.json()
        if (!res.ok || !json.success) throw new Error(json.error || 'Erreur de chargement')
        setOrganizations((json.data as any[]).map((o) => ({ id: o.id, name: o.name })))
      } catch (e: any) {
        setError(e.message || 'Erreur inconnue')
      } finally {
        setIsFetching(false)
      }
    }
    load()
  }, [isAuthenticated])

  const activeOrg = useMemo(() => organizations?.[0] ?? null, [organizations])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeOrg) return
    if (!form.title || !form.location || !form.date) {
      alert('Veuillez remplir les champs requis')
      return
    }
    setBusy(true)
    try {
      const payload: any = {
        title: form.title,
        description: form.description || undefined,
        location: form.location,
        date: new Date(form.date).toISOString(),
        organizerId: activeOrg.id,
        isPublished: form.isPublished,
      }
      const maxCap = parseInt(form.maxCapacity, 10)
      if (!Number.isNaN(maxCap) && maxCap > 0) payload.maxCapacity = maxCap

      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error || 'Création impossible')

      // Redirection simple vers la liste
      window.location.replace('/dashboard/events')
    } catch (e: any) {
      alert(e.message || 'Erreur lors de la création')
    } finally {
      setBusy(false)
    }
  }

  const refreshOrganizations = async () => {
    try {
      const res = await fetch('/api/organizations', { credentials: 'include' })
      const json = await res.json()
      if (res.ok && json.success) setOrganizations((json.data as any[]).map((o) => ({ id: o.id, name: o.name })))
    } catch {}
  }

  const handleCreateOrg = async (e: React.FormEvent) => {
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
          <p className="text-gray-600">Veuillez vous connecter pour créer un évènement.</p>
          <a href="/login?redirect=/dashboard/events/new" className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded-md">Se connecter</a>
        </div>
      </div>
    )
  }

  if (role !== 'ORGANIZER' && role !== 'ADMIN') {
    return (
      <div className="min-h-screen p-6">
        <h1 className="text-2xl font-bold mb-2">Créer un évènement</h1>
        <p className="text-gray-600">Cette section est réservée aux organisateurs.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Créer un évènement</h1>
        <a href="/dashboard/events" className="text-blue-600 hover:text-blue-800">← Retour à mes évènements</a>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-md border border-red-300 text-red-700 bg-red-50">{error}</div>
      )}

      {!activeOrg ? (
        <div className="max-w-xl">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold mb-2">Aucune organisation active</h2>
            <p className="text-gray-600 mb-4">Créez votre organisation pour pouvoir créer des évènements et gérer votre staff.</p>
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
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border p-6 grid grid-cols-1 md:grid-cols-6 gap-3">
          <input
            type="text"
            required
            placeholder="Titre"
            className="md:col-span-3 border rounded-md px-3 py-2"
            value={form.title}
            onChange={(e) => setForm(s => ({ ...s, title: e.target.value }))}
          />
          <input
            type="text"
            required
            placeholder="Lieu"
            className="md:col-span-2 border rounded-md px-3 py-2"
            value={form.location}
            onChange={(e) => setForm(s => ({ ...s, location: e.target.value }))}
          />
          <input
            type="datetime-local"
            required
            className="md:col-span-1 border rounded-md px-3 py-2"
            value={form.date}
            onChange={(e) => setForm(s => ({ ...s, date: e.target.value }))}
          />
          <textarea
            placeholder="Description"
            className="md:col-span-6 border rounded-md px-3 py-2"
            rows={4}
            value={form.description}
            onChange={(e) => setForm(s => ({ ...s, description: e.target.value }))}
          />
          <input
            type="number"
            min={1}
            placeholder="Capacité maximale (optionnel)"
            className="md:col-span-2 border rounded-md px-3 py-2"
            value={form.maxCapacity}
            onChange={(e) => setForm(s => ({ ...s, maxCapacity: e.target.value }))}
          />
          <label className="md:col-span-2 inline-flex items-center gap-2 px-3 py-2 border rounded-md">
            <input
              type="checkbox"
              checked={form.isPublished}
              onChange={(e) => setForm(s => ({ ...s, isPublished: e.target.checked }))}
            />
            <span>Publier directement</span>
          </label>
          <div className="md:col-span-2 flex justify-end">
            <button type="submit" disabled={busy} className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50">
              {busy ? 'Création...' : 'Créer l\'évènement'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
