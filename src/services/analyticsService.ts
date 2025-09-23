import { prisma } from '../lib/prisma';
// import { OrderService } from './orderService'; // Will be imported when needed

/**
 * Analytics Service
 * Handles all analytics, statistics and data processing operations
 */
export class AnalyticsService {
  /**
   * Get comprehensive dashboard statistics
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
          isPublished: true
        }
      }),
      // Direct order statistics calculation
      this.getOrderStatisticsInternal(),
      prisma.order.aggregate({
        where: {
          status: 'paid'
        },
        _sum: {
          totalPrice: true
        }
      }),
      prisma.order.aggregate({
        where: {
          status: 'paid',
          createdAt: {
            gte: thisMonthStart
          }
        },
        _sum: {
          totalPrice: true
        }
      }),
      prisma.order.aggregate({
        where: {
          status: 'paid',
          createdAt: {
            gte: lastMonthStart,
            lt: thisMonthStart
          }
        },
        _sum: {
          totalPrice: true
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
        total: totalRevenue._sum.totalPrice || 0,
        thisMonth: thisMonthRevenue._sum.totalPrice || 0,
        lastMonth: lastMonthRevenue._sum.totalPrice || 0
      }
    };
  }

  /**
   * Get detailed sales statistics
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
          totalPrice: true
        }
      }),
      prisma.order.findMany({
        select: {
          createdAt: true,
          totalPrice: true,
          status: true
        },
        where: {
          status: 'paid'
        },
        orderBy: {
          createdAt: 'asc'
        }
      })
    ]);

    const totalRevenue = ordersByStatus
      .filter(item => item.status === 'paid')
      .reduce((sum, item) => sum + (item._sum.totalPrice || 0), 0);

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
        revenue: item._sum.totalPrice || 0
      })),
      salesOverTime
    };
  }

  /**
   * Get user analytics and growth statistics
   */
  async getUserAnalytics(): Promise<{
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
    userEngagement: {
      totalTicketsPurchased: number;
      averageTicketsPerUser: number;
      topUsers: {
        id: string;
        name: string | null;
        email: string;
        ticketCount: number;
      }[];
    };
  }> {
    const [
      totalUsers,
      blockedUsers,
      usersByRole,
      newUsersData,
      userTicketStats,
      topUsers
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({
        where: {
          blocked: {
            isNot: null
          }
        }
      }),
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
      }),
      prisma.ticket.aggregate({
        _count: { id: true }
      }),
      prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          _count: {
            select: { tickets: true }
          }
        },
        orderBy: {
          tickets: {
            _count: 'desc'
          }
        },
        take: 10
      })
    ]);

    const newUsersOverTime = this.processNewUsersOverTime(newUsersData);
    const averageTicketsPerUser = totalUsers > 0 ? (userTicketStats._count.id || 0) / totalUsers : 0;

    return {
      totalUsers,
      activeUsers: totalUsers - blockedUsers,
      blockedUsers,
      usersByRole: usersByRole.map(item => ({
        role: item.role,
        count: item._count.id
      })),
      newUsersOverTime,
      userEngagement: {
        totalTicketsPurchased: userTicketStats._count.id || 0,
        averageTicketsPerUser: Math.round(averageTicketsPerUser * 10) / 10,
        topUsers: topUsers.map(user => ({
          id: user.id,
          name: user.name,
          email: user.email,
          ticketCount: user._count.tickets
        }))
      }
    };
  }

  /**
   * Get event analytics and performance metrics
   */
  async getEventAnalytics(): Promise<{
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
    eventPerformance: {
      totalTicketsSold: number;
      averageTicketsPerEvent: number;
      topPerformingEvents: {
        id: string;
        title: string;
        ticketsSold: number;
        revenue: number;
      }[];
    };
  }> {
    const now = new Date();

    const [
      totalEvents,
      publishedEvents,
      upcomingEvents,
      pastEvents,
      eventsByCategory,
      eventsData,
      ticketStats,
      topEvents
    ] = await Promise.all([
      prisma.event.count(),
      prisma.event.count({
        where: {
          isPublished: true
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
      prisma.event.findMany({
        select: {
          category: {
            select: {
              name: true
            }
          }
        }
      }),
      prisma.event.findMany({
        select: {
          createdAt: true
        },
        orderBy: {
          createdAt: 'asc'
        }
      }),
      prisma.ticket.aggregate({
        _count: { id: true }
      }),
      prisma.event.findMany({
        select: {
          id: true,
          title: true,
          _count: {
            select: { tickets: true }
          },
          tickets: {
            select: {
              order: {
                select: {
                  totalPrice: true,
                  status: true
                }
              }
            }
          }
        },
        orderBy: {
          tickets: {
            _count: 'desc'
          }
        },
        take: 10
      })
    ]);

    // Process events over time (last 12 months)
    const eventsOverTime = this.processEventsOverTime(eventsData);

    // Process category data
    const categoryCount: { [key: string]: number } = {};
    eventsByCategory.forEach(event => {
      const categoryName = event.category?.name || 'Uncategorized';
      categoryCount[categoryName] = (categoryCount[categoryName] || 0) + 1;
    });

    // Calculate event performance
    const topPerformingEvents = topEvents.map(event => {
      const revenue = event.tickets.reduce((sum, ticket) => {
        if (ticket.order && ticket.order.status === 'paid') {
          return sum + (ticket.order.totalPrice / event._count.tickets);
        }
        return sum;
      }, 0);

      return {
        id: event.id,
        title: event.title,
        ticketsSold: event._count.tickets,
        revenue: Math.round(revenue * 100) / 100
      };
    });

    const averageTicketsPerEvent = totalEvents > 0 
      ? Math.round((ticketStats._count.id || 0) / totalEvents * 10) / 10 
      : 0;

    return {
      totalEvents,
      publishedEvents,
      upcomingEvents,
      pastEvents,
      eventsByCategory: Object.entries(categoryCount).map(([category, count]) => ({
        category,
        count
      })),
      eventsOverTime,
      eventPerformance: {
        totalTicketsSold: ticketStats._count.id || 0,
        averageTicketsPerEvent,
        topPerformingEvents
      }
    };
  }

  /**
   * Get revenue and financial analytics
   */
  async getRevenueAnalytics(): Promise<{
    totalRevenue: number;
    monthlyRevenue: {
      thisMonth: number;
      lastMonth: number;
      growth: number;
    };
    revenueOverTime: {
      date: string;
      revenue: number;
      orders: number;
    }[];
    revenueByCategory: {
      category: string;
      revenue: number;
      percentage: number;
    }[];
    paymentMethodStats: {
      method: string;
      count: number;
      revenue: number;
    }[];
  }> {
    const thisMonthStart = new Date();
    thisMonthStart.setDate(1);
    thisMonthStart.setHours(0, 0, 0, 0);

    const lastMonthStart = new Date(thisMonthStart);
    lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);

    const [
      totalRevenue,
      thisMonthRevenue,
      lastMonthRevenue,
      revenueData,
      categoryRevenue,
      paymentMethods
    ] = await Promise.all([
      prisma.order.aggregate({
        where: {
          status: 'paid'
        },
        _sum: {
          totalPrice: true
        }
      }),
      prisma.order.aggregate({
        where: {
          status: 'paid',
          createdAt: {
            gte: thisMonthStart
          }
        },
        _sum: {
          totalPrice: true
        }
      }),
      prisma.order.aggregate({
        where: {
          status: 'paid',
          createdAt: {
            gte: lastMonthStart,
            lt: thisMonthStart
          }
        },
        _sum: {
          totalPrice: true
        }
      }),
      prisma.order.findMany({
        where: {
          status: 'paid'
        },
        select: {
          createdAt: true,
          totalPrice: true
        },
        orderBy: {
          createdAt: 'asc'
        }
      }),
      // Revenue by category requires complex joins - simplified for now
      prisma.order.findMany({
        where: {
          status: 'paid'
        },
        select: {
          totalPrice: true,
          tickets: {
            select: {
              event: {
                select: {
                  category: {
                    select: {
                      name: true
                    }
                  }
                }
              }
            }
          }
        }
      }),
      prisma.payment.groupBy({
        by: ['paymentMethod'],
        _count: {
          id: true
        }
      })
    ]);

    const thisMonth = thisMonthRevenue._sum.totalPrice || 0;
    const lastMonth = lastMonthRevenue._sum.totalPrice || 0;
    const growth = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : 0;

    // Process revenue over time
    const revenueOverTime = this.processRevenueOverTime(revenueData);

    // Process category revenue
    const categoryRevenueMap: { [key: string]: number } = {};
    const total = totalRevenue._sum.totalPrice || 0;
    
    categoryRevenue.forEach(order => {
      order.tickets.forEach(ticket => {
        const categoryName = ticket.event.category?.name || 'Uncategorized';
        const revenuePerTicket = order.totalPrice / order.tickets.length;
        categoryRevenueMap[categoryName] = (categoryRevenueMap[categoryName] || 0) + revenuePerTicket;
      });
    });

    const revenueByCategory = Object.entries(categoryRevenueMap).map(([category, revenue]) => ({
      category,
      revenue: Math.round(revenue * 100) / 100,
      percentage: total > 0 ? Math.round((revenue / total) * 100 * 100) / 100 : 0
    }));

    return {
      totalRevenue: total,
      monthlyRevenue: {
        thisMonth,
        lastMonth,
        growth: Math.round(growth * 100) / 100
      },
      revenueOverTime,
      revenueByCategory,
      paymentMethodStats: paymentMethods.map(method => ({
        method: method.paymentMethod,
        count: method._count.id,
        revenue: 0 // Would need more complex calculation to get accurate revenue per payment method
      }))
    };
  }

  // Private helper methods for data processing

  /**
   * Internal method to get order statistics
   */
  private async getOrderStatisticsInternal(): Promise<{
    totalOrders: number;
    completedOrders: number;
    pendingOrders: number;
    cancelledOrders: number;
  }> {
    const [total, completed, pending, cancelled] = await Promise.all([
      prisma.order.count(),
      prisma.order.count({ where: { status: 'paid' } }),
      prisma.order.count({ where: { status: 'pending_payment' } }),
      prisma.order.count({ where: { status: 'cancelled' } })
    ]);

    return {
      totalOrders: total,
      completedOrders: completed,
      pendingOrders: pending,
      cancelledOrders: cancelled
    };
  }
  
  /**
   * Process new users over time (last 12 months)
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
   * Process events over time (last 12 months)
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
   * Process sales over time (last 12 months)
   */
  private processSalesOverTime(salesData: { createdAt: Date; totalPrice: number }[]): {
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
        salesByMonth[monthYear].revenue += sale.totalPrice;
      }
    });

    // Convert to array format
    return last12Months.map(month => ({
      date: month,
      orders: salesByMonth[month].orders,
      revenue: Math.round(salesByMonth[month].revenue * 100) / 100
    }));
  }

  /**
   * Process revenue over time (last 12 months)
   */
  private processRevenueOverTime(revenueData: { createdAt: Date; totalPrice: number }[]): {
    date: string;
    revenue: number;
    orders: number;
  }[] {
    return this.processSalesOverTime(revenueData);
  }

  /**
   * Get labels for the last 12 months
   */
  private getLast12MonthsLabels(): string[] {
    const months = [];
    const now = new Date();
    
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      months.push(label);
    }
    
    return months;
  }
}

// Export singleton instance
export const analyticsService = new AnalyticsService();
export default analyticsService;
