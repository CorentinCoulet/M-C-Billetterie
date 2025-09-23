import { useOrganizerDashboardData } from '@/hooks/use-dashboard-data';

export function OrganizerDashboardContent() {
  const organizerData = useOrganizerDashboardData();

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
            href="/dashboard/organizer/events/new"
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
            href="/dashboard/organizer/events"
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
            href="/dashboard/organizer/analytics"
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
            href="/dashboard/organizer/events"
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
                href="/dashboard/organizer/events"
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
              href="/dashboard/organizer/events/new"
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Créer un événement
            </a>
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
              <p className="text-sm text-gray-600">Communiquez avec vos participants avant, pendant et après l'événement</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
