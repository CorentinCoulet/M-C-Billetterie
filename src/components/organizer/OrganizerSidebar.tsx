import { Button } from '@/components/ui/button';
import {
    Calendar,
    CreditCard,
    LayoutDashboard,
    LogOut,
    Settings,
    Users
} from 'lucide-react';
import Link from 'next/link';

interface OrganizerSidebarProps {
  currentPath: string;
}

export function OrganizerSidebar({ currentPath }: OrganizerSidebarProps) {
  const navigation = [
    {
      name: 'Dashboard',
      href: '/organizer',
      icon: LayoutDashboard,
      current: currentPath === '/organizer'
    },
    {
      name: 'Mes Événements',
      href: '/organizer/events',
      icon: Calendar,
      current: currentPath.startsWith('/organizer/events')
    },
    {
      name: 'Ventes',
      href: '/organizer/sales',
      icon: CreditCard,
      current: currentPath.startsWith('/organizer/sales')
    },
    {
      name: 'Participants',
      href: '/organizer/attendees',
      icon: Users,
      current: currentPath.startsWith('/organizer/attendees')
    },
    {
      name: 'Paramètres',
      href: '/organizer/settings',
      icon: Settings,
      current: currentPath.startsWith('/organizer/settings')
    }
  ];

  return (
    <div className="flex h-full w-64 flex-col bg-blue-900">
      <div className="flex h-16 flex-shrink-0 items-center px-6">
        <h1 className="text-xl font-bold text-white">Organisateur</h1>
      </div>
      
      <div className="flex flex-1 flex-col overflow-y-auto">
        <nav className="flex-1 space-y-1 px-2 py-4">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${
                  item.current
                    ? 'bg-blue-800 text-white'
                    : 'text-blue-200 hover:bg-blue-700 hover:text-white'
                }`}
              >
                <Icon 
                  className="mr-3 h-5 w-5 flex-shrink-0" 
                  aria-hidden="true" 
                />
                {item.name}
              </Link>
            );
          })}
        </nav>
        
        <div className="p-4">
          <Button 
            variant="ghost" 
            className="w-full justify-start text-blue-200 hover:bg-blue-700 hover:text-white"
            asChild
          >
            <Link href="/logout">
              <LogOut className="mr-3 h-5 w-5" />
              Déconnexion
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
