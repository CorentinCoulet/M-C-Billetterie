import { useOrganizerDashboardData } from '@/hooks/use-dashboard-data';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';

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

export function OrganizerDashboardContent() {
  const organizerData = useOrganizerDashboardData();
  const searchParams = useSearchParams();
  const requestedOrgId = searchParams.get('org');
  const ROLE_LABELS: Record<OrgMember['role'], string> = {
    OWNER: 'Propriétaire',
    ADMIN: 'Administrateur',
    MANAGER: 'Gestionnaire',
    MEMBER: 'Membre',
    VIEWER: 'Lecteur',
  };
  const [organizations, setOrganizations] = useState<OrganizationItem[] | null>(null);
  const [orgLoading, setOrgLoading] = useState(true);
  const [orgError, setOrgError] = useState<string | null>(null);
  const [creatingStaff, setCreatingStaff] = useState(false);
  const [newStaff, setNewStaff] = useState({ name: '', email: '' , role: 'MEMBER' as OrgMember['role']});
  const [eventBusyId, setEventBusyId] = useState<string | null>(null);
  const [quickEvent, setQuickEvent] = useState({ title: '', location: '', date: '' });
  const [creatingEvent, setCreatingEvent] = useState(false);
  const [advancedEvent, setAdvancedEvent] = useState({
    title: '',
    description: '',
    location: '',
    date: '',
    maxCapacity: '',
    isPublished: false,
  });
  const [creatingAdvanced, setCreatingAdvanced] = useState(false);
  const [orgName, setOrgName] = useState('');
  const [creatingOrg, setCreatingOrg] = useState(false);
  const [activeOrgId, setActiveOrgId] = useState<string | null>(null);

  // Charger les organisations de l'organisateur connecté (dont il est membre)
  useEffect(() => {
    const loadOrganizations = async () => {
      setOrgLoading(true);
      setOrgError(null);
      try {
        const res = await fetch('/api/organizations', { credentials: 'include' });
        if (!res.ok) throw new Error('Impossible de charger vos organisations');
        const json = await res.json();
        if (json.success) {
          setOrganizations(json.data as OrganizationItem[]);
          // Pré-sélection par paramètre d'URL si fourni
          const list = json.data as OrganizationItem[];
          if (requestedOrgId && requestedOrgId.length > 0) {
            const exists = list.find(o => o.id === requestedOrgId);
            if (exists) {
              setActiveOrgId(requestedOrgId);
            } else {
              // En dernier recours, tenter de charger l'organisation ciblée pour vérifier l'appartenance
              try {
                const resp = await fetch(`/api/organizations/${requestedOrgId}`, { credentials: 'include' });
                if (resp.ok) {
                  const j = await resp.json();
                  if (j.success && j.data) {
                    // Ajouter en tête et la sélectionner
                    setOrganizations([j.data as OrganizationItem, ...list]);
                    setActiveOrgId(requestedOrgId);
                  }
                }
                // Si non ok (403/404), on ignore et on utilisera la première org disponible
              } catch {}
            }
          } else if (list.length > 0) {
            setActiveOrgId(list[0].id);
          } else {
            setActiveOrgId(null);
          }
        } else {
          throw new Error(json.error || 'Erreur lors du chargement des organisations');
        }
      } catch (e: any) {
        setOrgError(e.message || 'Erreur inconnue');
      } finally {
        setOrgLoading(false);
      }
    };
    loadOrganizations();
  }, [requestedOrgId]);

  const activeOrg = useMemo(() => {
    if (!organizations || organizations.length === 0) return null;
    if (activeOrgId) {
      return organizations.find(o => o.id === activeOrgId) ?? organizations[0];
    }
    return organizations[0] ?? null;
  }, [organizations, activeOrgId]);

  async function refreshMembers() {
    if (!activeOrg) return;
    try {
      const res = await fetch(`/api/organizations/${activeOrg.id}/members`, { credentials: 'include' });
      if (!res.ok) return;
      const json = await res.json();
      if (json.success) {
        setOrganizations((prev) => {
          if (!prev) return prev;
          const clone = [...prev];
          const idx = clone.findIndex(o => o.id === activeOrg.id);
          if (idx >= 0) {
            clone[idx] = { ...clone[idx], team: json.data as OrgMember[] } as OrganizationItem;
          }
          return clone;
        });
      }
    } catch {}
  }

  async function refreshOrganizations() {
    try {
      const res = await fetch('/api/organizations', { credentials: 'include' });
      if (!res.ok) return;
      const json = await res.json();
      if (json.success) {
        const list = json.data as OrganizationItem[];
        setOrganizations(list);
        if (!activeOrgId) {
          setActiveOrgId(list[0]?.id ?? null);
        } else if (!list.some(o => o.id === activeOrgId)) {
          // L'org active a peut-être été supprimée
          setActiveOrgId(list[0]?.id ?? null);
        }
      }
    } catch {}
  }

  async function handleCreateOrganization(e: React.FormEvent) {
    e.preventDefault();
    const name = orgName.trim();
    if (!name) return;
    setCreatingOrg(true);
    try {
      const res = await fetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Création d\'organisation impossible');
      setOrgName('');
      await refreshOrganizations();
    } catch (e: any) {
      alert(e.message || 'Erreur lors de la création de l\'organisation');
    } finally {
      setCreatingOrg(false);
    }
  }

  async function handleCreateStaff(e: React.FormEvent) {
    e.preventDefault();
    if (!activeOrg) return;
    setCreatingStaff(true);
    try {
      // 1) Inviter l'utilisateur (compte staff): création avec mot de passe temporaire,
      //    il définira son mot de passe via le lien reçu par email.
      const tempPassword = Array.from(crypto.getRandomValues(new Uint8Array(16)))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      const reg = await fetch('/api/auth/register?noAuthCookie=1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: newStaff.email, password: tempPassword, name: newStaff.name })
      });
      const regJson = await reg.json();
      if (!reg.ok || !regJson.success || !regJson.data?.user?.id) {
        throw new Error(regJson.error || regJson.message || 'Échec de la création du compte staff');
      }
      const userId = regJson.data.user.id as string;

      // 2) Ajouter l'utilisateur à l'équipe de l'organisation avec le rôle choisi
      const add = await fetch(`/api/organizations/${activeOrg.id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userId, role: newStaff.role })
      });
      const addJson = await add.json();
      if (!add.ok || !addJson.success) {
        throw new Error(addJson.error || 'Échec de l’ajout du membre au staff');
      }

      // Reset formulaire et rafraîchir
      setNewStaff({ name: '', email: '', role: 'MEMBER' });
      await refreshMembers();
      alert('Membre du staff créé. Un email de définition du mot de passe sera envoyé.');
    } catch (e: any) {
      alert(e.message || 'Une erreur est survenue lors de la création du membre');
    } finally {
      setCreatingStaff(false);
    }
  }

  async function handleRemoveMember(member: OrgMember) {
    if (!activeOrg) return;
    if (!confirm(`Retirer ${member.user.email} du staff ?`)) return;
    try {
      // Il n'y a pas d'endpoint DELETE explicite affiché; nous utilisons PATCH pour "désactiver" en changeant le rôle en VIEWER
      const res = await fetch(`/api/organizations/${activeOrg.id}/members`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userId: member.user.id, role: 'VIEWER' })
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Échec de la mise à jour du membre');
      await refreshMembers();
    } catch (e: any) {
      alert(e.message || 'Impossible de mettre à jour le membre');
    }
  }

  async function handleCancelEvent(eventId: string) {
    if (!confirm('Annuler cet événement ? Il ne sera plus publié.')) return;
    setEventBusyId(eventId);
    try {
      const res = await fetch(`/api/events/${eventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isPublished: false })
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Annulation impossible');
      await refreshOrganizations();
    } catch (e: any) {
      alert(e.message || 'Erreur lors de l’annulation');
    } finally {
      setEventBusyId(null);
    }
  }

  async function handlePublishEvent(eventId: string) {
    if (!confirm('Publier cet événement ? Il sera visible publiquement.')) return;
    setEventBusyId(eventId);
    try {
      const res = await fetch(`/api/events/${eventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isPublished: true })
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Publication impossible');
      await refreshOrganizations();
    } catch (e: any) {
      alert(e.message || 'Erreur lors de la publication');
    } finally {
      setEventBusyId(null);
    }
  }

  async function handleDeleteEvent(eventId: string) {
    if (!confirm('Supprimer définitivement cet événement ? Cette action est irréversible.')) return;
    setEventBusyId(eventId);
    try {
      const res = await fetch(`/api/events/${eventId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Suppression impossible');
      await refreshOrganizations();
    } catch (e: any) {
      alert(e.message || 'Erreur lors de la suppression');
    } finally {
      setEventBusyId(null);
    }
  }

  async function handleQuickCreateEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!activeOrg) return;
    setCreatingEvent(true);
    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: quickEvent.title,
          location: quickEvent.location,
          date: new Date(quickEvent.date).toISOString(),
          isPublished: false,
          organizerId: activeOrg.id,
        })
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Création impossible');
      setQuickEvent({ title: '', location: '', date: '' });
      await refreshOrganizations();
      alert('Événement créé (non publié)');
    } catch (e: any) {
      alert(e.message || 'Erreur lors de la création');
    } finally {
      setCreatingEvent(false);
    }
  }

  async function handleAdvancedCreateEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!activeOrg) return;
    setCreatingAdvanced(true);
    try {
      const payload: any = {
        title: advancedEvent.title,
        description: advancedEvent.description || undefined,
        location: advancedEvent.location,
        date: new Date(advancedEvent.date).toISOString(),
        organizerId: activeOrg.id,
        isPublished: advancedEvent.isPublished,
      };
      const maxCapNum = parseInt(advancedEvent.maxCapacity, 10);
      if (!Number.isNaN(maxCapNum) && maxCapNum > 0) {
        payload.maxCapacity = maxCapNum;
      }

      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Création impossible');
      setAdvancedEvent({ title: '', description: '', location: '', date: '', maxCapacity: '', isPublished: false });
      await refreshOrganizations();
      alert(advancedEvent.isPublished ? 'Événement publié' : 'Événement créé en brouillon');
    } catch (e: any) {
      alert(e.message || 'Erreur lors de la création');
    } finally {
      setCreatingAdvanced(false);
    }
  }

  if (!organizerData) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Organizer overview */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg shadow-sm border p-6 text-white">
        <h3 className="text-lg font-semibold mb-4">Espace Organisateur</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold">{organizerData.totalEvents}</div>
            <div className="text-blue-100">Événements créés</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold">{organizerData.activeEvents}</div>
            <div className="text-blue-100">Événements actifs</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold">{organizerData.totalParticipants}</div>
            <div className="text-blue-100">Participants</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold">{organizerData.totalRevenue.toLocaleString('fr-FR')} €</div>
            <div className="text-blue-100">Revenus</div>
          </div>
        </div>
      </div>

      {/* Quick actions for organizer */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions rapides</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a
            href="/dashboard/events/new"
            className="flex items-center space-x-3 p-4 border-2 border-dashed border-blue-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors"
          >
            <div className="flex-shrink-0">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-gray-900">Créer un événement</p>
              <p className="text-sm text-gray-500">Nouvel événement</p>
            </div>
          </a>

          <a
            href="/dashboard/events"
            className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="flex-shrink-0">
              <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-gray-900">Gérer les événements</p>
              <p className="text-sm text-gray-500">{organizerData.totalEvents} événements</p>
            </div>
          </a>

          <a
            href="/dashboard/stats"
            className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="flex-shrink-0">
              <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-gray-900">Analytics</p>
              <p className="text-sm text-gray-500">Voir les performances</p>
            </div>
          </a>
        </div>
      </div>

      {/* Active events */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Événements actifs</h3>
          <a
            href="/dashboard/events"
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Voir tous
          </a>
        </div>
        {organizerData.activeEvents > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
              <div>
                <p className="font-medium text-green-900">
                  {organizerData.activeEvents} événement{organizerData.activeEvents > 1 ? 's' : ''} actif{organizerData.activeEvents > 1 ? 's' : ''}
                </p>
                <p className="text-sm text-green-600">
                  Gérez vos événements en cours et leurs participants
                </p>
              </div>
              <a
                href="/dashboard/events"
                className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
              >
                Gérer
              </a>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun événement actif</h3>
            <p className="text-gray-500 mb-4">Créez votre premier événement pour commencer</p>
            <a
              href="/dashboard/events/new"
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Créer un événement
            </a>
          </div>
        )}
      </div>

      {/* Gestion du staff */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Mon staff</h3>
          {activeOrg && (
            <span className="text-sm text-gray-500">Organisation: {activeOrg.name}</span>
          )}
        </div>
        {orgLoading && <p className="text-gray-500">Chargement des membres...</p>}
        {orgError && <p className="text-red-600">{orgError}</p>}
        {!orgLoading && !orgError && activeOrg && (
          <div className="space-y-4">
            <ul className="divide-y divide-gray-100 border rounded-lg">
              {(activeOrg.team || []).map((m) => (
                <li key={m.id} className="flex items-center justify-between p-3">
                  <div>
                    <p className="font-medium text-gray-900">{m.user.name || m.user.email}</p>
                    <p className="text-sm text-gray-500">{m.user.email} · Rôle: {ROLE_LABELS[m.role]}</p>
                  </div>
                  <button
                    onClick={() => handleRemoveMember(m)}
                    className="text-sm px-3 py-1 rounded-md border hover:bg-gray-50"
                  >
                    Retirer
                  </button>
                </li>
              ))}
              {activeOrg.team?.length === 0 && (
                <li className="p-3 text-gray-500">Aucun membre pour le moment.</li>
              )}
            </ul>

            <form onSubmit={handleCreateStaff} className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <input
                type="text"
                required
                placeholder="Nom"
                className="md:col-span-1 border rounded-md px-3 py-2"
                value={newStaff.name}
                onChange={(e) => setNewStaff(s => ({ ...s, name: e.target.value }))}
              />
              <input
                type="email"
                required
                placeholder="Email"
                className="md:col-span-2 border rounded-md px-3 py-2"
                value={newStaff.email}
                onChange={(e) => setNewStaff(s => ({ ...s, email: e.target.value }))}
              />
              <select
                className="md:col-span-1 border rounded-md px-3 py-2"
                value={newStaff.role}
                onChange={(e) => setNewStaff(s => ({ ...s, role: e.target.value as OrgMember['role'] }))}
              >
                <option value="MEMBER">Membre</option>
                <option value="MANAGER">Gestionnaire</option>
                <option value="ADMIN">Administrateur</option>
                <option value="VIEWER">Lecteur</option>
              </select>
              <div className="md:col-span-5 flex justify-end">
                <button
                  type="submit"
                  disabled={creatingStaff}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {creatingStaff ? 'Création...' : 'Ajouter un membre'}
                </button>
              </div>
            </form>
            <p className="text-xs text-gray-500">Un email d’invitation est envoyé pour définir le mot de passe.</p>
          </div>
        )}
      </div>

      {/* Mes évènements (liste + actions) */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Mes évènements</h3>
        {activeOrg ? (
          <>
            <div className="overflow-x-auto border rounded-lg">
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
                            <button
                              onClick={() => handlePublishEvent(ev.id)}
                              disabled={eventBusyId === ev.id}
                              className="px-3 py-1 border rounded-md hover:bg-gray-50 disabled:opacity-50"
                            >
                              {eventBusyId === ev.id ? 'Publication...' : 'Publier'}
                            </button>
                          )}
                          {ev.isPublished && (
                            <button
                              onClick={() => handleCancelEvent(ev.id)}
                              disabled={eventBusyId === ev.id}
                              className="px-3 py-1 border rounded-md hover:bg-gray-50 disabled:opacity-50"
                            >
                              {eventBusyId === ev.id ? 'Annulation...' : 'Annuler'}
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteEvent(ev.id)}
                            disabled={eventBusyId === ev.id}
                            className="px-3 py-1 border rounded-md hover:bg-red-50 disabled:opacity-50 text-red-700 border-red-300"
                          >
                            {eventBusyId === ev.id ? 'Suppression...' : 'Supprimer'}
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

              {/* Création rapide d'évènement */}
              <form onSubmit={handleQuickCreateEvent} className="mt-4 grid grid-cols-1 md:grid-cols-5 gap-3">
                <input
                  type="text"
                  required
                  placeholder="Titre"
                  className="md:col-span-2 border rounded-md px-3 py-2"
                  value={quickEvent.title}
                  onChange={(e) => setQuickEvent(s => ({ ...s, title: e.target.value }))}
                />
                <input
                  type="text"
                  required
                  placeholder="Lieu"
                  className="md:col-span-1 border rounded-md px-3 py-2"
                  value={quickEvent.location}
                  onChange={(e) => setQuickEvent(s => ({ ...s, location: e.target.value }))}
                />
                <input
                  type="datetime-local"
                  required
                  className="md:col-span-1 border rounded-md px-3 py-2"
                  value={quickEvent.date}
                  onChange={(e) => setQuickEvent(s => ({ ...s, date: e.target.value }))}
                />
                <div className="md:col-span-1 flex justify-end">
                  <button
                    type="submit"
                    disabled={creatingEvent}
                    className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
                  >
                    {creatingEvent ? 'Création...' : 'Créer'}
                  </button>
                </div>
              </form>

              {/* Formulaire avancé de création d'évènement */}
              <div className="mt-6 border-t pt-6">
                <h4 className="text-md font-semibold mb-3">Formulaire avancé</h4>
                <form onSubmit={handleAdvancedCreateEvent} className="grid grid-cols-1 md:grid-cols-6 gap-3">
                  <input
                    type="text"
                    required
                    placeholder="Titre"
                    className="md:col-span-3 border rounded-md px-3 py-2"
                    value={advancedEvent.title}
                    onChange={(e) => setAdvancedEvent(s => ({ ...s, title: e.target.value }))}
                  />
                  <input
                    type="text"
                    required
                    placeholder="Lieu"
                    className="md:col-span-2 border rounded-md px-3 py-2"
                    value={advancedEvent.location}
                    onChange={(e) => setAdvancedEvent(s => ({ ...s, location: e.target.value }))}
                  />
                  <input
                    type="datetime-local"
                    required
                    className="md:col-span-1 border rounded-md px-3 py-2"
                    value={advancedEvent.date}
                    onChange={(e) => setAdvancedEvent(s => ({ ...s, date: e.target.value }))}
                  />
                  <textarea
                    placeholder="Description"
                    className="md:col-span-6 border rounded-md px-3 py-2"
                    rows={3}
                    value={advancedEvent.description}
                    onChange={(e) => setAdvancedEvent(s => ({ ...s, description: e.target.value }))}
                  />
                  <input
                    type="number"
                    min={1}
                    placeholder="Capacité maximale (optionnel)"
                    className="md:col-span-2 border rounded-md px-3 py-2"
                    value={advancedEvent.maxCapacity}
                    onChange={(e) => setAdvancedEvent(s => ({ ...s, maxCapacity: e.target.value }))}
                  />
                  <label className="md:col-span-2 inline-flex items-center gap-2 px-3 py-2 border rounded-md">
                    <input
                      type="checkbox"
                      checked={advancedEvent.isPublished}
                      onChange={(e) => setAdvancedEvent(s => ({ ...s, isPublished: e.target.checked }))}
                    />
                    <span>Publier directement</span>
                  </label>
                  <div className="md:col-span-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={creatingAdvanced}
                      className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                      {creatingAdvanced ? 'Création...' : 'Créer l\'évènement'}
                    </button>
                  </div>
                </form>
              </div>
            </>
          ) : (
            <div className="max-w-xl">
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h4 className="text-md font-semibold mb-2">Aucune organisation active</h4>
                <p className="text-gray-600 mb-4">Créez votre organisation pour pouvoir rattacher vos évènements et gérer votre staff.</p>
                <form onSubmit={handleCreateOrganization} className="flex gap-2">
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
          )}
        </div>

      {/* Recent performance metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenus</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Total</span>
              <span className="text-2xl font-bold text-green-600">
                {organizerData.totalRevenue.toLocaleString('fr-FR')} €
              </span>
            </div>
            <div className="bg-gray-200 rounded-full h-2">
              <div className="bg-green-600 h-2 rounded-full" style={{ width: '75%' }}></div>
            </div>
            <p className="text-sm text-gray-500">
              Objectif mensuel : {(organizerData.totalRevenue * 1.33).toLocaleString('fr-FR')} €
            </p>
          </div>
        </div>

        {/* Participants */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Participants</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Total</span>
              <span className="text-2xl font-bold text-blue-600">
                {organizerData.totalParticipants}
              </span>
            </div>
            <div className="bg-gray-200 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full" style={{ width: '60%' }}></div>
            </div>
            <p className="text-sm text-gray-500">
              Moyenne par événement : {organizerData.totalEvents > 0 ? Math.round(organizerData.totalParticipants / organizerData.totalEvents) : 0}
            </p>
          </div>
        </div>
      </div>

      {/* Tips for organizers */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Conseils pour optimiser vos événements</h3>
        <div className="space-y-4">
          <div className="flex items-start space-x-3 p-4 bg-yellow-50 rounded-lg">
            <div className="flex-shrink-0">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Analysez vos performances</h4>
              <p className="text-sm text-gray-600">Consultez régulièrement vos analytics pour optimiser vos futurs événements</p>
            </div>
          </div>

          <div className="flex items-start space-x-3 p-4 bg-blue-50 rounded-lg">
            <div className="flex-shrink-0">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Engagez votre communauté</h4>
              <p className="text-sm text-gray-600">Communiquez avec vos participants avant, pendant et après l&#39;événement</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
