import { DashboardUser } from '@/types/dashboard';

interface DashboardHeaderProps {
  user: DashboardUser;
}

export function DashboardHeader({ user }: DashboardHeaderProps) {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bonjour';
    if (hour < 18) return 'Bon après-midi';
    return 'Bonsoir';
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'Administrateur';
      case 'ORGANIZER':
        return 'Organisateur';
      case 'USER':
      default:
        return 'Utilisateur';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
            <span className="text-blue-600 font-semibold text-lg">
              {user.name?.charAt(0)?.toUpperCase() || user.email.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {getGreeting()}, {user.name || 'Utilisateur'} !
            </h1>
            <p className="text-gray-600">
              {getRoleLabel(user.role)} • {user.email}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">
            Dernière connexion
          </p>
          <p className="text-sm font-medium text-gray-900">
            {user.lastLogin 
              ? new Date(user.lastLogin).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'long',
                  hour: '2-digit',
                  minute: '2-digit'
                })
              : 'Première connexion'
            }
          </p>
        </div>
      </div>
    </div>
  );
}
