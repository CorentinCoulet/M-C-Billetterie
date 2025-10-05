import { usePathname, useRouter } from 'next/navigation'
import { useCallback, useState } from 'react'

interface NavigationItem {
  label: string
  href: string
  icon?: string
  children?: NavigationItem[]
  requiresAdmin?: boolean
}

const DASHBOARD_NAVIGATION: NavigationItem[] = [
  {
    label: 'Accueil',
    href: '/dashboard',
    icon: 'House'
  },
  {
    label: 'Événements',
    href: '/dashboard/events',
    icon: 'Calendar',
    children: [
      { label: 'Liste des événements', href: '/dashboard/events' },
      { label: 'Créer un événement', href: '/dashboard/events/create' },
      { label: 'Catégories', href: '/dashboard/events/categories' }
    ]
  },
  {
    label: 'Billets',
    href: '/dashboard/tickets',
    icon: 'Ticket'
  },
  {
    label: 'Commandes',
    href: '/dashboard/orders',
    icon: 'ShoppingCart'
  },
  {
    label: 'Utilisateurs',
    href: '/dashboard/users',
    icon: 'Users',
    requiresAdmin: true
  },
  {
    label: 'Rapports',
    href: '/dashboard/reports',
    icon: 'ChartBar',
    children: [
      { label: 'Ventes', href: '/dashboard/reports/sales' },
      { label: 'Événements', href: '/dashboard/reports/events' },
      { label: 'Utilisateurs', href: '/dashboard/reports/users' }
    ]
  },
  {
    label: 'Paramètres',
    href: '/dashboard/settings',
    icon: 'Gear',
    children: [
      { label: 'Profil', href: '/dashboard/settings/profile' },
      { label: 'Notifications', href: '/dashboard/settings/notifications' },
      { label: 'Sécurité', href: '/dashboard/settings/security', requiresAdmin: true },
      { label: 'Système', href: '/dashboard/settings/system', requiresAdmin: true }
    ]
  }
]

/**
 * Hook for dashboard navigation
 */
export function useDashboardNavigation(userRole?: 'USER' | 'ADMIN') {
  const router = useRouter()
  const pathname = usePathname()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [expandedItems, setExpandedItems] = useState<string[]>([])

  // Filter navigation items based on user role
  const filterNavigationItems = useCallback((items: NavigationItem[]): NavigationItem[] => {
    return items.filter(item => {
      if (item.requiresAdmin && userRole !== 'ADMIN') {
        return false
      }
      
      if (item.children) {
        item.children = filterNavigationItems(item.children)
      }
      
      return true
    })
  }, [userRole])

  const navigationItems = filterNavigationItems(DASHBOARD_NAVIGATION)

  // Check if an item is active
  const isActiveItem = useCallback((href: string): boolean => {
    if (href === '/dashboard') {
      return pathname === '/dashboard'
    }
    return pathname.startsWith(href)
  }, [pathname])

  // Navigate to a page
  const navigateTo = useCallback((href: string) => {
    router.push(href)
    setIsSidebarOpen(false) // Close sidebar on mobile
  }, [router])

  // Toggle menu item expansion
  const toggleExpanded = useCallback((href: string) => {
    setExpandedItems(prev => 
      prev.includes(href)
        ? prev.filter(item => item !== href)
        : [...prev, href]
    )
  }, [])

  // Check if an item is expanded
  const isExpanded = useCallback((href: string): boolean => {
    return expandedItems.includes(href)
  }, [expandedItems])

  // Toggle sidebar
  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen(prev => !prev)
  }, [])

  // Close sidebar
  const closeSidebar = useCallback(() => {
    setIsSidebarOpen(false)
  }, [])

  // Get breadcrumb for current page
  const getBreadcrumb = useCallback((): Array<{ label: string; href: string }> => {
    const breadcrumb: Array<{ label: string; href: string }> = []
    
    // Recursive function to find the path
    const findPath = (items: NavigationItem[], currentPath: Array<{ label: string; href: string }> = []): boolean => {
      for (const item of items) {
        const newPath = [...currentPath, { label: item.label, href: item.href }]
        
        if (isActiveItem(item.href)) {
          breadcrumb.push(...newPath)
          return true
        }
        
        if (item.children && findPath(item.children, newPath)) {
          return true
        }
      }
      return false
    }
    
    findPath(navigationItems)
    return breadcrumb
  }, [navigationItems, isActiveItem])

  // Get current page title
  const getCurrentPageTitle = useCallback((): string => {
    const breadcrumb = getBreadcrumb()
    return breadcrumb.length > 0 ? breadcrumb[breadcrumb.length - 1].label : 'Dashboard'
  }, [getBreadcrumb])

  return {
    navigationItems,
    isActiveItem,
    navigateTo,
    toggleExpanded,
    isExpanded,
    isSidebarOpen,
    toggleSidebar,
    closeSidebar,
    getBreadcrumb,
    getCurrentPageTitle
  }
}