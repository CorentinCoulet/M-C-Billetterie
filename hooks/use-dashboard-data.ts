import { useEffect, useState } from 'react'

interface DashboardStats {
  totalEvents: number
  totalTickets: number
  totalRevenue: number
  totalUsers: number
  platformRevenue: number
  systemHealth: number
  securityAlerts: Array<{
    id: string
    type: string
    severity: 'low' | 'medium' | 'high' | 'critical'
    message: string
    timestamp: string
  }>
  recentUsers: Array<{
    id: string
    name: string
    email: string
    registeredAt: string
    status: 'active' | 'inactive' | 'blocked'
  }>
  systemMetrics: Array<{
    name: string
    value: number
    unit: string
    status: 'good' | 'warning' | 'critical'
  }>
  recentEvents: Array<{
    id: string
    title: string
    date: string
    ticketsSold: number
    revenue: number
  }>
  recentOrders: Array<{
    id: string
    userId: string
    eventTitle: string
    amount: number
    createdAt: string
  }>
  monthlyRevenue: Array<{
    month: string
    revenue: number
  }>
}

interface DashboardState {
  stats: DashboardStats | null
  isLoading: boolean
  error: string | null
}

/**
 * Hook for dashboard data management
 */
export function useDashboardData() {
  const [state, setState] = useState<DashboardState>({
    stats: null,
    isLoading: true,
    error: null
  })

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }))
      
      const response = await fetch('/api/admin/dashboard/stats', {
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Erreur lors du chargement des données')
      }

      const stats = await response.json()
      setState({
        stats,
        isLoading: false,
        error: null
      })
    } catch (error) {
      setState({
        stats: null,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      })
    }
  }

  const refreshData = () => {
    fetchDashboardData()
  }

  return {
    ...state,
    refreshData
  }
}

// Hook for specific metrics
export function useMetrics(type: 'events' | 'revenue' | 'users' | 'tickets') {
  const [data, setData] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchMetrics()
  }, [type])

  const fetchMetrics = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`/api/admin/metrics/${type}`, {
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error(`Erreur lors du chargement des métriques ${type}`)
      }

      const metrics = await response.json()
      setData(metrics)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Erreur inconnue')
    } finally {
      setIsLoading(false)
    }
  }

  return {
    data,
    isLoading,
    error,
    refresh: fetchMetrics
  }
}

// Alias for compatibility
export const useAdminDashboardData = useDashboardData