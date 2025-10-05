import type { Event } from '../generated/prisma';
import { prisma } from '../lib/prisma';

/**
 * Event Management Service
 * Handles administrative operations related to events
 */
export class EventManagementService {
  /**
   * Get event management statistics
   */
  async getEventManagementStats(): Promise<{
    events: {
      total: number;
      upcoming: number;
      published: number;
      draft: number;
      cancelled: number;
    };
    byCategory: Record<string, number>;
    averageTicketsPerEvent: number;
    topEvents: Array<{
      id: string;
      title: string;
      ticketCount: number;
      revenue: number;
    }>;
  }> {
    const now = new Date();

    const [
      totalEvents,
      upcomingEvents,
      publishedEvents,
      draftEvents,
      cancelledEvents,
      eventsByCategory,
      topEvents,
      ticketStats
    ] = await Promise.all([
      prisma.event.count(),
      prisma.event.count({
        where: {
          date: { gte: now },
          isPublished: true
        }
      }),
      prisma.event.count({
        where: { isPublished: true }
      }),
      prisma.event.count({
        where: { isPublished: false }
      }),
      prisma.event.count({
        where: { isCancelled: true }
      }),
      prisma.event.findMany({
        select: {
          categoryId: true,
          category: {
            select: {
              name: true
            }
          }
        }
      }),
      prisma.event.findMany({
        select: {
          id: true,
          title: true,
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
      }),
      prisma.ticket.aggregate({
        _count: { id: true }
      })
    ]);

    // Process categories
    const categoryCount: Record<string, number> = {};
    eventsByCategory.forEach(event => {
      const categoryName = event.category?.name || 'Uncategorized';
      categoryCount[categoryName] = (categoryCount[categoryName] || 0) + 1;
    });

    // Process top events - simplified without revenue calculation
    const topEventsFormatted = topEvents.map(event => ({
      id: event.id,
      title: event.title,
      ticketCount: event._count.tickets,
      revenue: 0 // Would need to calculate from order amounts
    }));

    const averageTicketsPerEvent = totalEvents > 0 
      ? Math.round((ticketStats._count.id || 0) / totalEvents) 
      : 0;

    return {
      events: {
        total: totalEvents,
        upcoming: upcomingEvents,
        published: publishedEvents,
        draft: draftEvents,
        cancelled: cancelledEvents
      },
      byCategory: categoryCount,
      averageTicketsPerEvent,
      topEvents: topEventsFormatted
    };
  }

  /**
   * Toggle event published status
   */
  async toggleEventPublished(eventId: string, isPublished: boolean): Promise<Event> {
    return prisma.event.update({
      where: { id: eventId },
      data: { isPublished }
    });
  }

  /**
   * Cancel an event
   */
  async cancelEvent(eventId: string, reason?: string): Promise<Event> {
    return prisma.event.update({
      where: { id: eventId },
      data: { 
        isCancelled: true,
        metadata: reason ? { cancelReason: reason } : undefined
      }
    });
  }

  /**
   * Get event details for admin
   */
  async getEventDetails(eventId: string) {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        tickets: {
          include: {
            user: {
              select: { id: true, name: true, email: true }
            },
            order: {
              select: { totalPrice: true, status: true }
            }
          }
        },
        _count: {
          select: {
            tickets: true
          }
        }
      }
    });

    if (!event) {
      throw new Error('Event not found');
    }

    // Calculate revenue from orders related to tickets
    const revenue = event.tickets.reduce((sum, ticket) => {
      if (ticket.order && ticket.order.status === 'paid') {
        return sum + (ticket.order.totalPrice / event.tickets.filter(t => t.orderId === ticket.orderId).length);
      }
      return sum;
    }, 0);
    
    const ticketsSold = event.tickets.filter(ticket => ticket.status === 'paid').length;

    return {
      ...event,
      revenue,
      ticketsSold,
      attendees: event.tickets.map(ticket => ({
        id: ticket.id,
        userName: ticket.user?.name || 'Anonymous',
        userEmail: ticket.user?.email || 'N/A',
        status: ticket.status,
        purchaseDate: ticket.purchasedAt,
        orderTotal: ticket.order?.totalPrice || 0
      }))
    };
  }

  /**
   * Update event details
   */
  async updateEvent(eventId: string, data: {
    title?: string;
    description?: string;
    date?: Date;
    location?: string;
    categoryId?: string;
    maxCapacity?: number;
    isPublished?: boolean;
  }): Promise<Event> {
    const updateData: any = { ...data };
    
    return prisma.event.update({
      where: { id: eventId },
      data: updateData
    });
  }

  /**
   * Get events with pagination and filters
   */
  async getEvents(params: {
    page?: number;
    limit?: number;
    categoryId?: string;
    isPublished?: boolean;
    search?: string;
  } = {}) {
    const { page = 1, limit = 20, categoryId, isPublished, search } = params;
    const skip = (page - 1) * limit;

    const where: any = {};
    
    if (categoryId) {
      where.categoryId = categoryId;
    }
    
    if (isPublished !== undefined) {
      where.isPublished = isPublished;
    }
    
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        include: {
          _count: {
            select: { tickets: true }
          },
          category: {
            select: { name: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.event.count({ where })
    ]);

    return {
      events: events.map(event => ({
        ...event,
        ticketsSold: event._count.tickets,
        categoryName: event.category?.name
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }
}

// Export singleton instance
export const eventManagementService = new EventManagementService();
export default eventManagementService;
