import type { Event, Payment, User } from '@/generated/prisma';
import prisma from '@/lib/prisma';

/**
 * Service for administrative operations
 */
export class AdminService {
  /**
   * Get dashboard statistics
   */
  async getDashboardStatistics(): Promise<{
    users: {
      total: number;
      new: number; // Last 30 days
    };
    events: {
      total: number;
      upcoming: number;
      published: number;
    };
    orders: {
      total: number;
      completed: number;
      pending: number;
      cancelled: number;
    };
    revenue: {
      total: number;
      thisMonth: number;
      lastMonth: number;
    };
  }> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const thisMonthStart = new Date();
    thisMonthStart.setDate(1);
    thisMonthStart.setHours(0, 0, 0, 0);

    const lastMonthStart = new Date(thisMonthStart);
    lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);

    const lastMonthEnd = new Date(thisMonthStart);
    lastMonthEnd.setSeconds(lastMonthEnd.getSeconds() - 1);

    const [
      totalUsers,
      newUsers,
      totalEvents,
      upcomingEvents,
      publishedEvents,
      orderStats,
      totalRevenue,
      thisMonthRevenue,
      lastMonthRevenue
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({
        where: {
          createdAt: {
            gte: thirtyDaysAgo
          }
        }
      }),
      prisma.event.count(),
      prisma.event.count({
        where: {
          date: {
            gte: new Date()
          }
        }
      }),
      prisma.event.count({
        where: {
          published: true
        }
      }),
      orderService.getOrderStatistics(),
      prisma.payment.aggregate({
        where: {
          status: 'SUCCEEDED'
        },
        _sum: {
          amount: true
        }
      }),
      prisma.payment.aggregate({
        where: {
          status: 'SUCCEEDED',
          createdAt: {
            gte: thisMonthStart
          }
        },
        _sum: {
          amount: true
        }
      }),
      prisma.payment.aggregate({
        where: {
          status: 'SUCCEEDED',
          createdAt: {
            gte: lastMonthStart,
            lt: thisMonthStart
          }
        },
        _sum: {
          amount: true
        }
      })
    ]);

    return {
      users: {
        total: totalUsers,
        new: newUsers
      },
      events: {
        total: totalEvents,
        upcoming: upcomingEvents,
        published: publishedEvents
      },
      orders: {
        total: orderStats.totalOrders,
        completed: orderStats.completedOrders,
        pending: orderStats.pendingOrders,
        cancelled: orderStats.cancelledOrders
      },
      revenue: {
        total: totalRevenue._sum.amount || 0,
        thisMonth: thisMonthRevenue._sum.amount || 0,
        lastMonth: lastMonthRevenue._sum.amount || 0
      }
    };
  }

  /**
   * Get user management statistics
   */
  async getUserManagementStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    blockedUsers: number;
    usersByRole: {
      role: string;
      count: number;
    }[];
    newUsersOverTime: {
      date: string;
      count: number;
    }[];
  }> {
    const [
      totalUsers,
      blockedUsers,
      usersByRole,
      newUsersData
    ] = await Promise.all([
      prisma.user.count(),
      prisma.blockedUser.count(),
      prisma.user.groupBy({
        by: ['role'],
        _count: {
          id: true
        }
      }),
      prisma.user.findMany({
        select: {
          createdAt: true
        },
        orderBy: {
          createdAt: 'asc'
        }
      })
    ]);

    // Process new users over time (last 12 months)
    const newUsersOverTime = this.processNewUsersOverTime(newUsersData);

    return {
      totalUsers,
      activeUsers: totalUsers - blockedUsers,
      blockedUsers,
      usersByRole: usersByRole.map(item => ({
        role: item.role,
        count: item._count.id
      })),
      newUsersOverTime
    };
  }

  /**
   * Get event management statistics
   */
  async getEventManagementStats(): Promise<{
    totalEvents: number;
    publishedEvents: number;
    upcomingEvents: number;
    pastEvents: number;
    eventsByCategory: {
      category: string;
      count: number;
    }[];
    eventsOverTime: {
      date: string;
      count: number;
    }[];
  }> {
    const now = new Date();

    const [
      totalEvents,
      publishedEvents,
      upcomingEvents,
      pastEvents,
      eventsByCategory,
      eventsData
    ] = await Promise.all([
      prisma.event.count(),
      prisma.event.count({
        where: {
          published: true
        }
      }),
      prisma.event.count({
        where: {
          date: {
            gte: now
          }
        }
      }),
      prisma.event.count({
        where: {
          date: {
            lt: now
          }
        }
      }),
      prisma.event.groupBy({
        by: ['category'],
        _count: {
          id: true
        }
      }),
      prisma.event.findMany({
        select: {
          createdAt: true
        },
        orderBy: {
          createdAt: 'asc'
        }
      })
    ]);

    // Process events over time (last 12 months)
    const eventsOverTime = this.processEventsOverTime(eventsData);

    return {
      totalEvents,
      publishedEvents,
      upcomingEvents,
      pastEvents,
      eventsByCategory: eventsByCategory.map(item => ({
        category: item.category || 'Non catégorisé',
        count: item._count.id
      })),
      eventsOverTime
    };
  }

  /**
   * Get sales statistics
   */
  async getSalesStatistics(): Promise<{
    totalOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
    salesByStatus: {
      status: string;
      count: number;
      revenue: number;
    }[];
    salesOverTime: {
      date: string;
      orders: number;
      revenue: number;
    }[];
  }> {
    const [
      totalOrders,
      ordersByStatus,
      ordersWithPayments
    ] = await Promise.all([
      prisma.order.count(),
      prisma.order.groupBy({
        by: ['status'],
        _count: {
          id: true
        },
        _sum: {
          totalAmount: true
        }
      }),
      prisma.order.findMany({
        where: {
          status: 'COMPLETED'
        },
        select: {
          createdAt: true,
          totalAmount: true
        },
        orderBy: {
          createdAt: 'asc'
        }
      })
    ]);

    const totalRevenue = ordersByStatus
      .filter(item => item.status === 'COMPLETED')
      .reduce((sum, item) => sum + (item._sum.totalAmount || 0), 0);

    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Process sales over time (last 12 months)
    const salesOverTime = this.processSalesOverTime(ordersWithPayments);

    return {
      totalOrders,
      totalRevenue,
      averageOrderValue,
      salesByStatus: ordersByStatus.map(item => ({
        status: item.status,
        count: item._count.id,
        revenue: item._sum.totalAmount || 0
      })),
      salesOverTime
    };
  }

  /**
   * Block a user
   */
  async blockUser(userId: string, reason: string): Promise<User> {
    await userService.blockUser(userId, reason);
    return prisma.user.findUnique({
      where: { id: userId }
    }) as Promise<User>;
  }

  /**
   * Unblock a user
   */
  async unblockUser(userId: string): Promise<User> {
    await userService.unblockUser(userId);
    return prisma.user.findUnique({
      where: { id: userId }
    }) as Promise<User>;
  }

  /**
   * Change user role
   */
  async changeUserRole(userId: string, role: 'USER' | 'ADMIN' | 'ORGANISATEUR'): Promise<User> {
    return userService.changeUserRole(userId, role);
  }

  /**
   * Publish or unpublish an event
   */
  async toggleEventPublished(eventId: string, published: boolean): Promise<Event> {
    return eventService.toggleEventPublished(eventId, published);
  }

  /**
   * Process refund for an order
   */
  async processRefund(paymentId: string, amount?: number, reason?: string): Promise<Payment> {
    return paymentService.createRefund(paymentId, amount, reason);
  }

  /**
   * Get system logs
   */
  async getSystemLogs(limit: number = 100): Promise<any[]> {
    return prisma.systemLog.findMany({
      take: limit,
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  /**
   * Log system activity
   */
  async logSystemActivity(data: {
    action: string;
    userId?: string;
    details?: any;
    ip?: string;
    userAgent?: string;
  }): Promise<void> {
    await prisma.systemLog.create({
      data: {
        action: data.action,
        userId: data.userId,
        details: data.details ? JSON.stringify(data.details) : null,
        ip: data.ip,
        userAgent: data.userAgent
      }
    });
  }

  /**
   * Helper method to process new users over time
   */
  private processNewUsersOverTime(userData: { createdAt: Date }[]): { date: string; count: number }[] {
    const last12Months = this.getLast12MonthsLabels();
    const usersByMonth: Record<string, number> = {};

    // Initialize all months with 0
    last12Months.forEach(month => {
      usersByMonth[month] = 0;
    });

    // Count users by month
    userData.forEach(user => {
      const date = user.createdAt;
      const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (usersByMonth[monthYear] !== undefined) {
        usersByMonth[monthYear]++;
      }
    });

    // Convert to array format
    return last12Months.map(month => ({
      date: month,
      count: usersByMonth[month]
    }));
  }

  /**
   * Helper method to process events over time
   */
  private processEventsOverTime(eventData: { createdAt: Date }[]): { date: string; count: number }[] {
    const last12Months = this.getLast12MonthsLabels();
    const eventsByMonth: Record<string, number> = {};

    // Initialize all months with 0
    last12Months.forEach(month => {
      eventsByMonth[month] = 0;
    });

    // Count events by month
    eventData.forEach(event => {
      const date = event.createdAt;
      const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (eventsByMonth[monthYear] !== undefined) {
        eventsByMonth[monthYear]++;
      }
    });

    // Convert to array format
    return last12Months.map(month => ({
      date: month,
      count: eventsByMonth[month]
    }));
  }

  /**
   * Helper method to process sales over time
   */
  private processSalesOverTime(salesData: { createdAt: Date; totalAmount: number }[]): {
    date: string;
    orders: number;
    revenue: number;
  }[] {
    const last12Months = this.getLast12MonthsLabels();
    const salesByMonth: Record<string, { orders: number; revenue: number }> = {};

    // Initialize all months with 0
    last12Months.forEach(month => {
      salesByMonth[month] = { orders: 0, revenue: 0 };
    });

    // Count orders and sum revenue by month
    salesData.forEach(sale => {
      const date = sale.createdAt;
      const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (salesByMonth[monthYear] !== undefined) {
        salesByMonth[monthYear].orders++;
        salesByMonth[monthYear].revenue += sale.totalAmount;
      }
    });

    // Convert to array format
    return last12Months.map(month => ({
      date: month,
      orders: salesByMonth[month].orders,
      revenue: salesByMonth[month].revenue
    }));
  }

  /**
   * Helper method to get labels for the last 12 months
   */
  private getLast12MonthsLabels(): string[] {
    const labels = [];
    const now = new Date();
    
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      labels.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    
    return labels;
  }
}

const adminService = new AdminService();
export default adminService;