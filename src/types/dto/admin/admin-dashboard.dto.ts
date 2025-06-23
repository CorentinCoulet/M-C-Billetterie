export interface AdminDashboardDto {
  totalUsers: number;
  totalEvents: number;
  totalTickets: number;
  totalOrders: number;
  totalRevenue: number;
  recentEvents: RecentEventDto[];
  recentOrders: RecentOrderDto[];
}

export interface RecentEventDto {
  id: string;
  title: string;
  date: Date;
  status: string;
  ticketsSold: number;
  revenue: number;
}

export interface RecentOrderDto {
  id: string;
  userId: string;
  userName: string;
  eventId: string;
  eventTitle: string;
  amount: number;
  status: string;
  createdAt: Date;
}