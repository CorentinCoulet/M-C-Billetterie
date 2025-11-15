import { useAdminDashboardData } from '@/hooks/use-dashboard-data';

export function AdminDashboardContent() {
  const { stats: adminData, isLoading, error } = useAdminDashboardData();

  if (isLoading) {
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

  if (error || !adminData) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-red-800 mb-2">Erreur de chargement</h3>
          <p className="text-red-600">{error || 'Impossible de charger les données du dashboard'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Admin overview */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg shadow-sm border p-6 text-white">
        <h3 className="text-lg font-semibold mb-4">Administration Plateforme</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold">{adminData.totalUsers}</div>
            <div className="text-purple-100">Utilisateurs</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold">{adminData.platformRevenue.toLocaleString('fr-FR')} €</div>
            <div className="text-purple-100">Revenus totaux</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold">{adminData.systemHealth}%</div>
            <div className="text-purple-100">Santé système</div>
          </div>
          <div className="text-center">
            <div className={`text-3xl font-bold ${(Array.isArray(adminData.securityAlerts) ? adminData.securityAlerts.length : adminData.securityAlerts) > 0 ? 'text-red-200' : 'text-green-200'}`}>
              {Array.isArray(adminData.securityAlerts) ? adminData.securityAlerts.length : adminData.securityAlerts}
            </div>
            <div className="text-purple-100">Alertes sécurité</div>
          </div>
        </div>
      </div>

      {/* Administrative actions */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions d'administration</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <a
            href="/dashboard/admin/users"
            className="flex flex-col items-center space-y-2 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="flex-shrink-0">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
            <div className="text-center">
              <p className="font-medium text-gray-900">Utilisateurs</p>
              <p className="text-sm text-gray-500">{adminData.totalUsers} inscrits</p>
            </div>
          </a>

          <a
            href="/dashboard/admin/events"
            className="flex flex-col items-center space-y-2 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="flex-shrink-0">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="text-center">
              <p className="font-medium text-gray-900">Événements</p>
              <p className="text-sm text-gray-500">Modération</p>
            </div>
          </a>

          <a
            href="/dashboard/admin/security"
            className="flex flex-col items-center space-y-2 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="flex-shrink-0">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div className="text-center">
              <p className="font-medium text-gray-900">Sécurité</p>
              <p className="text-sm text-gray-500">{Array.isArray(adminData.securityAlerts) ? adminData.securityAlerts.length : adminData.securityAlerts} alertes</p>
            </div>
          </a>

          <a
            href="/dashboard/admin/analytics"
            className="flex flex-col items-center space-y-2 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="flex-shrink-0">
              <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="text-center">
              <p className="font-medium text-gray-900">Analytics</p>
              <p className="text-sm text-gray-500">Rapports globaux</p>
            </div>
          </a>
        </div>
      </div>

      {/* System metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* System health */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Santé du système</h3>
          <div className="space-y-4">
            {adminData.systemMetrics.map((metric: any, index: number) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">{metric.name}</span>
                  <span className="text-sm text-gray-600">{metric.value}{metric.unit}</span>
                </div>
                <div className="bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      metric.value >= 95 ? 'bg-green-500' : 
                      metric.value >= 80 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min(metric.value, 100)}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent users */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Utilisateurs récents</h3>
            <a
              href="/dashboard/admin/users"
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Voir tous
            </a>
          </div>
          <div className="space-y-3">
            {adminData.recentUsers.slice(0, 5).map((user: any) => (
              <div key={user.id} className="flex items-center space-x-3">
                <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                  <span className="text-sm font-medium text-gray-600">
                    {user.name?.charAt(0)?.toUpperCase() || user.email.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {user.name || 'Utilisateur'}
                  </p>
                  <p className="text-sm text-gray-500 truncate">{user.email}</p>
                </div>
                <div className="flex-shrink-0">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    user.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' :
                    user.role === 'ORGANIZER' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {user.role}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* System alerts and notifications */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">État de la plateforme</h3>
        <div className="space-y-4">
          {(Array.isArray(adminData.securityAlerts) ? adminData.securityAlerts.length : adminData.securityAlerts) === 0 ? (
            <div className="flex items-center space-x-3 p-4 bg-green-50 rounded-lg">
              <div className="flex-shrink-0">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h4 className="font-medium text-green-900">Système sécurisé</h4>
                <p className="text-sm text-green-700">Aucune alerte de sécurité active</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center space-x-3 p-4 bg-red-50 rounded-lg">
              <div className="flex-shrink-0">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <h4 className="font-medium text-red-900">Alertes de sécurité</h4>
                <p className="text-sm text-red-700">{Array.isArray(adminData.securityAlerts) ? adminData.securityAlerts.length : adminData.securityAlerts} alerte(s) nécessitent votre attention</p>
              </div>
            </div>
          )}

          <div className="flex items-center space-x-3 p-4 bg-blue-50 rounded-lg">
            <div className="flex-shrink-0">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h4 className="font-medium text-blue-900">Performance optimale</h4>
              <p className="text-sm text-blue-700">Le système fonctionne à {adminData.systemHealth}% de sa capacité</p>
            </div>
          </div>
        </div>
      </div>

      {/* Important administrative actions */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions importantes</h3>
        <div className="space-y-4">
          <div className="flex items-start space-x-3 p-4 bg-yellow-50 rounded-lg">
            <div className="flex-shrink-0">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-gray-900">Sauvegarde automatique</h4>
              <p className="text-sm text-gray-600">Programmée quotidiennement à 2h00</p>
              <button className="text-sm text-yellow-600 hover:text-yellow-800 mt-1">
                Configurer les sauvegardes →
              </button>
            </div>
          </div>

          <div className="flex items-start space-x-3 p-4 bg-purple-50 rounded-lg">
            <div className="flex-shrink-0">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-gray-900">Rapport mensuel</h4>
              <p className="text-sm text-gray-600">Générer le rapport d'activité du mois</p>
              <button className="text-sm text-purple-600 hover:text-purple-800 mt-1">
                Générer le rapport →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
