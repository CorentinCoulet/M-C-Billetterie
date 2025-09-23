import { UserRole } from './enums/user.enum';

export type { UserRole };

export interface DashboardUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  permissions?: string[];
  avatar?: string;
  isVerified: boolean;
  lastLogin: Date | null;
}

export interface DashboardStats {
  totalEvents?: number;
  totalTickets?: number;
  totalRevenue?: number;
  totalUsers?: number;
  activeEvents?: number;
  recentOrders?: number;
  notifications?: number;
  [key: string]: any;
}

export interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  count?: number;
  badge?: string;
  permission?: string;
}

export interface DashboardSection {
  section: string;
  items: NavigationItem[];
}

export interface UserDashboardData {
  upcomingEvents: number;
  totalTickets: number;
  recentOrders: number;
  notifications: number;
  favoriteEvents: any[];
  recentActivity: any[];
}

export interface OrganizerDashboardData {
  totalEvents: number;
  totalRevenue: number;
  totalParticipants: number;
  activeEvents: number;
  recentSales: any[];
  topEvents: any[];
}

export interface AdminDashboardData {
  totalUsers: number;
  platformRevenue: number;
  systemHealth: number;
  securityAlerts: number;
  recentUsers: any[];
  systemMetrics: any[];
}

export interface DashboardActivity {
  id: string;
  type: 'ticket_purchase' | 'event_created' | 'user_registered' | 'payment_processed';
  title: string;
  description: string;
  timestamp: Date;
  userId?: string;
  eventId?: string;
  metadata?: Record<string, any>;
}
