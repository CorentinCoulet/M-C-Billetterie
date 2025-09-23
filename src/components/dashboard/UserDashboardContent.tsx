import { useUserDashboardData } from '@/hooks/use-dashboard-data';

export function UserDashboardContent() {
  const dashboardData = useUserDashboardData();

  if (!dashboardData) {
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
      {/* Upcoming Events Section */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Mes prochains événements</h3>
        {dashboardData.upcomingEvents > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
              <div>
                <p className="font-medium text-blue-900">
                  {dashboardData.upcomingEvents} événement{dashboardData.upcomingEvents > 1 ? 's' : ''} à venir
                </p>
                <p className="text-sm text-blue-600">
                  Consultez vos tickets pour plus de détails
                </p>
              </div>
              <a
                href="/dashboard/tickets"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                Voir mes tickets
              </a>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun événement à venir</h3>
            <p className="text-gray-500 mb-4">Découvrez les événements disponibles et achetez vos tickets</p>
            <a
              href="/events"
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Parcourir les événements
            </a>
          </div>
        )}
      </div>

      {/* My Tickets Section */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Mes tickets</h3>
          <a
            href="/dashboard/tickets"
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Voir tous
          </a>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4">
            <div className="text-2xl font-bold text-green-600">{dashboardData.totalTickets}</div>
            <div className="text-sm text-gray-500">Tickets actifs</div>
          </div>
          <div className="text-center p-4">
            <div className="text-2xl font-bold text-blue-600">{dashboardData.upcomingEvents}</div>
            <div className="text-sm text-gray-500">Événements à venir</div>
          </div>
          <div className="text-center p-4">
            <div className="text-2xl font-bold text-purple-600">{dashboardData.recentOrders}</div>
            <div className="text-sm text-gray-500">Commandes récentes</div>
          </div>
        </div>
      </div>

      {/* Recommendations Section */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recommandations</h3>
        <div className="space-y-4">
          <div className="flex items-start space-x-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
            <div className="flex-shrink-0">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Activez les notifications</h4>
              <p className="text-sm text-gray-600">Recevez des alertes pour vos événements et les nouvelles sorties</p>
              <button className="text-sm text-blue-600 hover:text-blue-800 mt-1">
                Configurer →
              </button>
            </div>
          </div>

          <div className="flex items-start space-x-3 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg">
            <div className="flex-shrink-0">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Créez votre liste de favoris</h4>
              <p className="text-sm text-gray-600">Suivez vos événements préférés et ne manquez aucune nouvelle</p>
              <button className="text-sm text-green-600 hover:text-green-800 mt-1">
                Commencer →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
