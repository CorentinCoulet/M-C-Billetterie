import prisma from '@/lib/prisma';
import {
    AdminDashboardData,
    DashboardActivity,
    DashboardStats,
    OrganizerDashboardData,
    UserDashboardData
} from '@/types/dashboard';
import { UserRole } from '@/types/enums/user.enum';

export class DashboardService {
  /**
   * Get dashboard data for USER role
   */
  static async getUserDashboardData(userId: string): Promise<UserDashboardData> {
    try {
      // Fetch user's tickets
      const tickets = await prisma.ticket.findMany({
        where: { userId },
        include: {
          event: true,
        },
      });

      // Fetch user's orders
      const orders = await prisma.order.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });

      // Fetch upcoming events user has tickets for
      const upcomingEvents = await prisma.event.findMany({
        where: {
          tickets: {
            some: { userId }
          },
          date: {
            gte: new Date()
          }
        },
        take: 5,
      });

      const recentOrders = orders.filter(order => {
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        return order.createdAt >= oneMonthAgo;
      });

      return {
        upcomingEvents: upcomingEvents.length,
        totalTickets: tickets.length,
        recentOrders: recentOrders.length,
        notifications: 0, // Implement notification system later
        favoriteEvents: [], // Implement favorites later
        recentActivity: orders.slice(0, 5).map(order => ({
          id: order.id,
          type: 'ticket_purchase' as const,
          title: 'Ticket acheté',
          description: `Commande #${order.id.slice(0, 8)}`,
          timestamp: order.createdAt,
          metadata: { orderId: order.id }
        })),
      };
    } catch (error) {
      console.error('Error fetching user dashboard data:', error);
      throw new Error('Failed to fetch user dashboard data');
    }
  }

  /**
   * Get dashboard data for ORGANIZER role
   */
  static async getOrganizerDashboardData(userId: string): Promise<OrganizerDashboardData> {
    try {
      // Find organizer through TeamMember relation
      const teamMember = await prisma.teamMember.findFirst({
        where: { userId },
        include: {
          organizer: {
            include: {
              events: {
                include: {
                  tickets: true,
                  _count: {
                    select: { tickets: true }
                  }
                }
              }
            }
          }
        }
      });

      if (!teamMember || !teamMember.organizer) {
        // If user is not in a team, return empty data but don't throw error
        return {
          totalEvents: 0,
          totalRevenue: 0,
          totalParticipants: 0,
          activeEvents: 0,
          recentSales: [],
          topEvents: [],
        };
      }

      const events = teamMember.organizer.events;

      // Calculate total revenue
      const orders = await prisma.order.findMany({
        where: {
          tickets: {
            some: {
              event: {
                organizerId: teamMember.organizerId
              }
            }
          },
          status: 'paid'
        },
      });

      const totalRevenue = orders.reduce((sum, order) => sum + order.totalPrice, 0);
      const totalParticipants = events.reduce((sum, event) => sum + event._count.tickets, 0);
      const activeEvents = events.filter(event => event.date >= new Date()).length;

      // Recent sales
      const recentSales = orders
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 10);

      // Top events by ticket sales
      const topEvents = events
        .sort((a, b) => b._count.tickets - a._count.tickets)
        .slice(0, 5);

      return {
        totalEvents: events.length,
        totalRevenue,
        totalParticipants,
        activeEvents,
        recentSales,
        topEvents,
      };
    } catch (error) {
      console.error('Error fetching organizer dashboard data:', error);
      throw new Error('Failed to fetch organizer dashboard data');
    }
  }

  /**
   * Get dashboard data for ADMIN role
   */
  static async getAdminDashboardData(): Promise<AdminDashboardData> {
    try {
      // Total users
      const totalUsers = await prisma.user.count();

      // Total platform revenue
      const paidOrders = await prisma.order.findMany({
        where: { status: 'paid' },
      });
      const platformRevenue = paidOrders.reduce((sum, order) => sum + order.totalPrice, 0);

      // Recent users
      const recentUsers = await prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
        },
      });

      // System metrics (mock for now)
      const systemMetrics = [
        { name: 'Server Health', value: 98, unit: '%' },
        { name: 'Database Performance', value: 95, unit: '%' },
        { name: 'API Response Time', value: 120, unit: 'ms' },
      ];

      return {
        totalUsers,
        platformRevenue,
        systemHealth: 98, // Mock value
        securityAlerts: 0, // Implement security monitoring later
        recentUsers,
        systemMetrics,
      };
    } catch (error) {
      console.error('Error fetching admin dashboard data:', error);
      throw new Error('Failed to fetch admin dashboard data');
    }
  }

  /**
   * Get dashboard stats based on user role
   */
  static async getDashboardStats(userId: string, role: UserRole): Promise<DashboardStats> {
    try {
      switch (role) {
        case UserRole.USER:
          const userData = await this.getUserDashboardData(userId);
          return {
            totalTickets: userData.totalTickets,
            upcomingEvents: userData.upcomingEvents,
            recentOrders: userData.recentOrders,
            notifications: userData.notifications,
            favoriteEvents: userData.favoriteEvents,
            recentActivity: userData.recentActivity,
          };

        case UserRole.ORGANIZER:
          const organizerData = await this.getOrganizerDashboardData(userId);
          return {
            totalEvents: organizerData.totalEvents,
            totalRevenue: organizerData.totalRevenue,
            totalParticipants: organizerData.totalParticipants,
            activeEvents: organizerData.activeEvents,
            recentSales: organizerData.recentSales,
            topEvents: organizerData.topEvents,
          };

        case UserRole.ADMIN:
          const adminData = await this.getAdminDashboardData();
          return {
            totalUsers: adminData.totalUsers,
            platformRevenue: adminData.platformRevenue,
            systemHealth: adminData.systemHealth,
            securityAlerts: adminData.securityAlerts,
            recentUsers: adminData.recentUsers,
            systemMetrics: adminData.systemMetrics,
          };

        default:
          throw new Error('Invalid user role');
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      throw error;
    }
  }

  /**
   * Get recent activities for a user
   */
  static async getRecentActivities(userId: string, role: UserRole): Promise<DashboardActivity[]> {
    try {
      const activities: DashboardActivity[] = [];

      if (role === UserRole.USER || role === UserRole.ORGANIZER || role === UserRole.ADMIN) {
        // Get user's order activities
        const orders = await prisma.order.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            tickets: {
              include: {
                event: true
              }
            }
          }
        });

        orders.forEach(order => {
          activities.push({
            id: `order-${order.id}`,
            type: 'ticket_purchase',
            title: 'Achat de tickets',
            description: `Commande #${order.id.slice(0, 8)} - ${order.tickets.length} ticket(s)`,
            timestamp: order.createdAt,
            metadata: { orderId: order.id }
          });
        });
      }

      if (role === UserRole.ORGANIZER || role === UserRole.ADMIN) {
        // Get organizer's event activities
        const teamMember = await prisma.teamMember.findFirst({
          where: { userId }
        });

        if (teamMember) {
          const events = await prisma.event.findMany({
            where: { organizerId: teamMember.organizerId },
            orderBy: { createdAt: 'desc' },
            take: 5,
          });

          events.forEach(event => {
            activities.push({
              id: `event-${event.id}`,
              type: 'event_created',
              title: 'Événement créé',
              description: event.title,
              timestamp: event.createdAt,
              metadata: { eventId: event.id }
            });
          });
        }
      }

      // Sort activities by timestamp (most recent first)
      return activities.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      ).slice(0, 10);

    } catch (error) {
      console.error('Error fetching recent activities:', error);
      throw new Error('Failed to fetch recent activities');
    }
  }
}
