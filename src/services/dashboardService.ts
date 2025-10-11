import prisma from '@/lib/prisma';
import adminService from './adminService';

/**
 * Service for dashboard statistics and visualizations
 */
export class DashboardService {
  /**
   * Get main dashboard statistics
   */
  async getMainDashboardStats(): Promise<Record<string, unknown>> {
    return adminService.getDashboardStatistics();
  }

  /**
   * Get revenue chart data
   */
  async getRevenueChartData(period: 'week' | 'month' | 'year' = 'month'): Promise<{
    labels: string[];
    datasets: {
      label: string;
      data: number[];
    }[];
  }> {
    let dateFormat: string;
    let daysToLookBack: number;
    let dateLabels: string[];

    // Configure based on period
    switch (period) {
      case 'week':
        dateFormat = '%Y-%m-%d'; // Daily format
        daysToLookBack = 7;
        dateLabels = this.getLastNDaysLabels(daysToLookBack);
        break;
      case 'year':
        dateFormat = '%Y-%m'; // Monthly format
        daysToLookBack = 365;
        dateLabels = this.getLastNMonthsLabels(12);
        break;
      case 'month':
      default:
        dateFormat = '%Y-%m-%d'; // Daily format
        daysToLookBack = 30;
        dateLabels = this.getLastNDaysLabels(daysToLookBack);
        break;
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysToLookBack);

    // Get payment data
    const paymentData = await prisma.$queryRaw`
      SELECT 
        DATE_FORMAT(createdAt, ${dateFormat}) as date,
        SUM(amount) as revenue
      FROM Payment
      WHERE status = 'SUCCEEDED'
        AND createdAt >= ${startDate}
      GROUP BY DATE_FORMAT(createdAt, ${dateFormat})
      ORDER BY date ASC
    `;

    // Convert to chart format
    const revenueByDate: Record<string, number> = {};
    
    // Initialize all dates with 0
    dateLabels.forEach(date => {
      revenueByDate[date] = 0;
    });

    // Fill in actual data
    (paymentData as Array<{ date: string; revenue: number | string }>).forEach(item => {
      if (revenueByDate[item.date] !== undefined) {
        revenueByDate[item.date] = Number(item.revenue);
      }
    });

    return {
      labels: dateLabels,
      datasets: [
        {
          label: 'Revenus',
          data: dateLabels.map(date => revenueByDate[date])
        }
      ]
    };
  }

  /**
   * Get ticket sales chart data
   */
  async getTicketSalesChartData(period: 'week' | 'month' | 'year' = 'month'): Promise<{
    labels: string[];
    datasets: {
      label: string;
      data: number[];
    }[];
  }> {
    let dateFormat: string;
    let daysToLookBack: number;
    let dateLabels: string[];

    // Configure based on period
    switch (period) {
      case 'week':
        dateFormat = '%Y-%m-%d'; // Daily format
        daysToLookBack = 7;
        dateLabels = this.getLastNDaysLabels(daysToLookBack);
        break;
      case 'year':
        dateFormat = '%Y-%m'; // Monthly format
        daysToLookBack = 365;
        dateLabels = this.getLastNMonthsLabels(12);
        break;
      case 'month':
      default:
        dateFormat = '%Y-%m-%d'; // Daily format
        daysToLookBack = 30;
        dateLabels = this.getLastNDaysLabels(daysToLookBack);
        break;
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysToLookBack);

    // Get order data
    const orderData = await prisma.$queryRaw`
      SELECT 
        DATE_FORMAT(o.createdAt, ${dateFormat}) as date,
        COUNT(ot.id) as ticketsSold
      FROM \`Order\` o
      JOIN OrderTicket ot ON o.id = ot.orderId
      WHERE o.status = 'COMPLETED'
        AND o.createdAt >= ${startDate}
      GROUP BY DATE_FORMAT(o.createdAt, ${dateFormat})
      ORDER BY date ASC
    `;

    // Convert to chart format
    const ticketsByDate: Record<string, number> = {};
    
    // Initialize all dates with 0
    dateLabels.forEach(date => {
      ticketsByDate[date] = 0;
    });

    // Fill in actual data
    (orderData as Array<{ date: string; ticketsSold: number | string }>).forEach(item => {
      if (ticketsByDate[item.date] !== undefined) {
        ticketsByDate[item.date] = Number(item.ticketsSold);
      }
    });

    return {
      labels: dateLabels,
      datasets: [
        {
          label: 'Billets vendus',
          data: dateLabels.map(date => ticketsByDate[date])
        }
      ]
    };
  }

  /**
   * Get user registration chart data
   */
  async getUserRegistrationChartData(period: 'week' | 'month' | 'year' = 'month'): Promise<{
    labels: string[];
    datasets: {
      label: string;
      data: number[];
    }[];
  }> {
    let dateFormat: string;
    let daysToLookBack: number;
    let dateLabels: string[];

    // Configure based on period
    switch (period) {
      case 'week':
        dateFormat = '%Y-%m-%d'; // Daily format
        daysToLookBack = 7;
        dateLabels = this.getLastNDaysLabels(daysToLookBack);
        break;
      case 'year':
        dateFormat = '%Y-%m'; // Monthly format
        daysToLookBack = 365;
        dateLabels = this.getLastNMonthsLabels(12);
        break;
      case 'month':
      default:
        dateFormat = '%Y-%m-%d'; // Daily format
        daysToLookBack = 30;
        dateLabels = this.getLastNDaysLabels(daysToLookBack);
        break;
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysToLookBack);

    // Get user registration data
    const userData = await prisma.$queryRaw`
      SELECT 
        DATE_FORMAT(createdAt, ${dateFormat}) as date,
        COUNT(id) as userCount
      FROM User
      WHERE createdAt >= ${startDate}
      GROUP BY DATE_FORMAT(createdAt, ${dateFormat})
      ORDER BY date ASC
    `;

    // Convert to chart format
    const usersByDate: Record<string, number> = {};
    
    // Initialize all dates with 0
    dateLabels.forEach(date => {
      usersByDate[date] = 0;
    });

    // Fill in actual data
    (userData as Array<{ date: string; userCount: number | string }>).forEach(item => {
      if (usersByDate[item.date] !== undefined) {
        usersByDate[item.date] = Number(item.userCount);
      }
    });

    return {
      labels: dateLabels,
      datasets: [
        {
          label: 'Nouveaux utilisateurs',
          data: dateLabels.map(date => usersByDate[date])
        }
      ]
    };
  }

  /**
   * Get event popularity chart data
   */
  async getEventPopularityChartData(limit: number = 10): Promise<{
    labels: string[];
    datasets: {
      label: string;
      data: number[];
    }[];
  }> {
    // Get most popular events by ticket sales
    const eventData = await prisma.event.findMany({
      select: {
        id: true,
        title: true,
        tickets: {
          select: {
            id: true
          }
        }
      },
      orderBy: {
        tickets: {
          _count: 'desc'
        }
      },
      take: limit
    });

    // Calculate ticket sales for each event
    const eventsWithSales = eventData.map(event => {
      const ticketsSold = event.tickets.length;

      return {
        name: event.title,
        ticketsSold
      };
    });

    // Sort by ticket sales
    eventsWithSales.sort((a, b) => b.ticketsSold - a.ticketsSold);

    return {
      labels: eventsWithSales.map(event => event.name),
      datasets: [
        {
          label: 'Billets vendus',
          data: eventsWithSales.map(event => event.ticketsSold)
        }
      ]
    };
  }

  /**
   * Get user role distribution chart data
   */
  async getUserRoleDistributionChartData(): Promise<{
    labels: string[];
    datasets: {
      label: string;
      data: number[];
    }[];
  }> {
    const userRoleData = await prisma.user.groupBy({
      by: ['role'],
      _count: {
        id: true
      }
    });

    const roleLabels = userRoleData.map(item => item.role);
    const roleCounts = userRoleData.map(item => item._count.id);

    return {
      labels: roleLabels,
      datasets: [
        {
          label: 'Utilisateurs par rôle',
          data: roleCounts
        }
      ]
    };
  }

  /**
   * Get upcoming events
   */
  async getUpcomingEvents(limit: number = 5): Promise<unknown[]> {
    return prisma.event.findMany({
      where: {
        date: {
          gte: new Date()
        },
        isPublished: true
      },
      orderBy: {
        date: 'asc'
      },
      take: limit,
      include: {
        tickets: true,
        organizer: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
  }

  /**
   * Get recent orders
   */
  async getRecentOrders(limit: number = 5): Promise<unknown[]> {
    return prisma.order.findMany({
      orderBy: {
        createdAt: 'desc'
      },
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        tickets: {
          include: {
            event: {
              select: {
                id: true,
                title: true,
                date: true
              }
            }
          }
        },
        payment: {
          select: {
            id: true,
            paymentStatus: true,
            paymentDate: true
          }
        }
      }
    });
  }

  /**
   * Get sales by category chart data
   */
  async getSalesByCategoryChartData(): Promise<{
    labels: string[];
    datasets: {
      label: string;
      data: number[];
    }[];
  }> {
    const categoryData = await prisma.$queryRaw`
      SELECT 
        e.category,
        SUM(ot.quantity * ot.unitPrice) as revenue
      FROM Event e
      JOIN Ticket t ON e.id = t.eventId
      JOIN OrderTicket ot ON t.id = ot.ticketId
      JOIN \`Order\` o ON ot.orderId = o.id
      WHERE o.status = 'COMPLETED'
      GROUP BY e.category
      ORDER BY revenue DESC
    `;

    // Handle null category
    const processedData = (categoryData as Array<{ category: string | null; revenue: number | string }>).map(item => ({
      category: item.category || 'Non catégorisé',
      revenue: Number(item.revenue)
    }));

    return {
      labels: processedData.map(item => item.category),
      datasets: [
        {
          label: 'Revenus par catégorie',
          data: processedData.map(item => item.revenue)
        }
      ]
    };
  }

  /**
   * Helper method to get labels for the last N days
   */
  private getLastNDaysLabels(n: number): string[] {
    const labels = [];
    const today = new Date();
    
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      labels.push(this.formatDate(d));
    }
    
    return labels;
  }

  /**
   * Helper method to get labels for the last N months
   */
  private getLastNMonthsLabels(n: number): string[] {
    const labels = [];
    const today = new Date();
    
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      labels.push(this.formatMonth(d));
    }
    
    return labels;
  }

  /**
   * Format date as YYYY-MM-DD
   */
  private formatDate(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  /**
   * Format date as YYYY-MM
   */
  private formatMonth(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }
}

const dashboardService = new DashboardService();
export default dashboardService;