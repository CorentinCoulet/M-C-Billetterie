'use client';

import { useAuthRole } from '@/hooks/use-auth';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { useDashboardNavigation } from '@/hooks/use-dashboard-navigation';
import { UserRole } from '@/types/enums/user.enum';
import { AdminDashboardContent } from './AdminDashboardContent';
import { DashboardActivities } from './DashboardActivities';
import { DashboardHeader } from './DashboardHeader';
import { DashboardStatsCards } from './DashboardStats';
import { OrganizerDashboardContent } from './OrganizerDashboardContent';
import { QuickActions } from './QuickActions';
import { UserDashboardContent } from './UserDashboardContent';

export default function DashboardHome() {
  const { user, role, loading, isAuthenticated } = useAuthRole();
  const { stats, activities, loading: dataLoading, error } = useDashboardData();
  const { getQuickActions } = useDashboardNavigation();

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Accès non autorisé</h1>
          <p className="text-gray-600 mb-6">Vous devez être connecté pour accéder au dashboard</p>
          <a
            href="/auth/login"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Se connecter
          </a>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <p className="font-bold">Erreur</p>
            <p>{error}</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  const quickActions = getQuickActions();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Header */}
          <DashboardHeader user={user} />

          {/* Quick Actions */}
          {quickActions && quickActions.length > 0 && (
            <QuickActions actions={quickActions} />
          )}

          {/* Stats Cards */}
          {stats && (
            <DashboardStatsCards 
              stats={stats} 
              role={role} 
              loading={dataLoading} 
            />
          )}

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Role-specific content */}
            <div className="lg:col-span-2">
              {role === UserRole.USER && <UserDashboardContent />}
              {role === UserRole.ORGANIZER && <OrganizerDashboardContent />}
              {role === UserRole.ADMIN && <AdminDashboardContent />}
            </div>

            {/* Right Column - Activities */}
            <div className="lg:col-span-1">
              <DashboardActivities 
                activities={activities} 
                role={role} 
                loading={dataLoading} 
              />
            </div>
          </div>

          {/* Footer Info */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="text-center text-gray-500 text-sm">
              <p>
                Vous êtes connecté en tant que <strong>{user.name || 'Utilisateur'}</strong> 
                <span className="mx-2">•</span>
                Rôle : <strong>{role}</strong>
                <span className="mx-2">•</span>
                <a href="/dashboard/profile" className="text-blue-600 hover:text-blue-800">
                  Gérer mon profil
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
