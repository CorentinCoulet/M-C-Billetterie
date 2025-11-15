// Global types for the application

import { User } from '@prisma/client'
import 'next'

// Next.js types extension
declare module 'next' {
  interface NextApiRequest {
    user?: User
    session?: {
      mfaVerified?: boolean
      userId?: string
      [key: string]: any
    }
  }
}

declare module 'express' {
  interface Request {
    user?: User
    session?: {
      mfaVerified?: boolean
      userId?: string
      [key: string]: any
    }
  }
}

// Types for Prisma relations
export interface UserWithRelations extends User {
  isVerified: boolean
  lastLogin: Date | null
  blocked: boolean
}

// Types for API errors
export interface ApiError {
  message: string
  code?: string
  statusCode?: number
}

// Types for API responses
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: ApiError
  message?: string
}

// Types for pagination
export interface PaginationParams {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

// Types for search filters
export interface SearchFilters {
  query?: string
  category?: string
  dateFrom?: string
  dateTo?: string
  status?: string
  priceMin?: number
  priceMax?: number
}

// Types for webhooks
export interface WebhookPayload {
  type: string
  data: any
  timestamp: string
  signature?: string
}

// Types for metrics
export interface PerformanceMetrics {
  responseTime: number
  memoryUsage: number
  cpuUsage: number
  activeConnections: number
  timestamp: string
}

// Types for security
export interface SecurityEvent {
  type: 'login_attempt' | 'mfa_challenge' | 'suspicious_activity' | 'admin_action'
  userId?: string
  ip: string
  userAgent: string
  success: boolean
  details?: any
  timestamp: string
}

// Types for notifications
export interface NotificationData {
  type: 'email' | 'sms' | 'push'
  recipient: string
  subject?: string
  message: string
  template?: string
  data?: any
}

// Export commonly used Prisma types
export type { Event, Order, Payment, Ticket, User } from '@prisma/client'

