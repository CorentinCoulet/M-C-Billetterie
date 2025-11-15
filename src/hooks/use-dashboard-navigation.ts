'use client';

import { DashboardSection, NavigationItem } from '@/types/dashboard';
import { useAuthRole } from './use-auth';

// Icons import - using Phosphor icons
import {
  CalendarCheckIcon,
  ChartBar,
  CurrencyCircleDollar,
  Gear,
  House,
  PresentationChart,
  ShieldCheck,
  ShoppingBag,
  TicketIcon,
  User,
  Users,
} from '@phosphor-icons/react';

export function useDashboardNavigation() {
  const { role, isOrganizer, isAdmin } = useAuthRole();

  const getDashboardNavigation = (): DashboardSection[] => {
    const navigation: DashboardSection[] = [
      // USER SECTION (always present)
      {
        section: "Mon Espace Personnel",
        items: [
          { 
            name: "Vue d'ensemble", 
            href: "/dashboard", 
            icon: House,
            permission: 'dashboard:read'
          },
          { 
            name: "Mes Tickets", 
            href: "/dashboard/tickets", 
            icon: TicketIcon,
            permission: 'tickets:read'
          },
          { 
            name: "Mes Commandes", 
            href: "/dashboard/orders", 
            icon: ShoppingBag,
            permission: 'orders:read'
          },
          { 
            name: "Mon Profil", 
            href: "/dashboard/profile", 
            icon: User,
            permission: 'profile:read'
          }
        ]
      }
    ];

    // ORGANIZER SECTION (if organizer role)
    if (isOrganizer) {
      navigation.push({
        section: "Espace Organisateur",
        items: [
          { 
            name: "Mes Événements", 
            href: "/dashboard/events", 
            icon: CalendarCheckIcon,
            permission: 'events:create'
          },
          { 
            name: "Analytics Organisateur", 
            href: "/dashboard/stats", 
            icon: ChartBar,
            permission: 'events:analytics'
          },
          { 
            name: "Participants", 
            href: "/dashboard/events", 
            icon: Users,
            permission: 'events:participants'
          },
          { 
            name: "Revenus", 
            href: "/dashboard/stats", 
            icon: CurrencyCircleDollar,
            permission: 'events:revenue'
          }
        ]
      });
    }

    // ADMIN SECTION (if admin role)
    if (isAdmin) {
      navigation.push({
        section: "Administration",
        items: [
          { 
            name: "Vue Plateforme", 
            href: "/dashboard/admin", 
            icon: PresentationChart,
            permission: 'admin:dashboard'
          },
          { 
            name: "Gestion Utilisateurs", 
            href: "/dashboard/admin/users", 
            icon: Users,
            permission: 'users:read'
          },
          { 
            name: "Sécurité", 
            href: "/dashboard/admin/security", 
            icon: ShieldCheck,
            permission: 'admin:security'
          },
          { 
            name: "Paramètres", 
            href: "/dashboard/admin/settings", 
            icon: Gear,
            permission: 'admin:settings'
          }
        ]
      });
    }

    return navigation;
  };

  const getQuickActions = () => {
    const actions: NavigationItem[] = [];

    // Actions for all users
    actions.push({
      name: "Acheter un ticket",
      href: "/events",
      icon: TicketIcon,
    });

    // Actions for organizers
    if (isOrganizer) {
      actions.push({
        name: "Créer un événement",
        href: "/dashboard/events/new",
        icon: CalendarCheckIcon,
        permission: 'events:create',
      });
    }

    // Actions for admins
    if (isAdmin) {
      actions.push({
        name: "Modération",
        href: "/dashboard/admin/moderation",
        icon: ShieldCheck,
        permission: 'admin:moderate',
      });
    }

    return actions;
  };

  return { 
    getDashboardNavigation, 
    getQuickActions,
    currentRole: role 
  };
}
