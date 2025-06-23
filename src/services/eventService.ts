import prisma from '@/lib/prisma';
import { Event, Prisma } from '@prisma/client';

/**
 * Service for event management operations
 */
export class EventService {
  /**
   * Get an event by ID
   */
  async getEventById(id: string): Promise<Event | null> {
    return prisma.event.findUnique({
      where: { id },
      include: {
        tickets: true,
        organizer: true,
      }
    });
  }

  /**
   * Get all events with pagination and filtering
   */
  async getEvents(params: {
    skip?: number;
    take?: number;
    where?: Prisma.EventWhereInput;
    orderBy?: Prisma.EventOrderByWithRelationInput;
    includePast?: boolean;
  }): Promise<Event[]> {
    const { skip, take, where, orderBy, includePast = false } = params;
    
    const dateFilter = includePast ? {} : {
      date: {
        gte: new Date()
      }
    };

    return prisma.event.findMany({
      skip,
      take,
      where: {
        ...where,
        ...dateFilter
      },
      orderBy: orderBy || { date: 'asc' },
      include: {
        tickets: true,
        organizer: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
  }

  /**
   * Create a new event
   */
  async createEvent(data: Prisma.EventCreateInput): Promise<Event> {
    return prisma.event.create({
      data,
      include: {
        tickets: true,
        organizer: true
      }
    });
  }

  /**
   * Update an event
   */
  async updateEvent(id: string, data: Prisma.EventUpdateInput): Promise<Event> {
    return prisma.event.update({
      where: { id },
      data,
      include: {
        tickets: true,
        organizer: true
      }
    });
  }

  /**
   * Delete an event
   */
  async deleteEvent(id: string): Promise<Event> {
    return prisma.event.delete({
      where: { id }
    });
  }

  /**
   * Count events with optional filtering
   */
  async countEvents(where?: Prisma.EventWhereInput): Promise<number> {
    return prisma.event.count({ where });
  }

  /**
   * Get upcoming events
   */
  async getUpcomingEvents(limit: number = 10): Promise<Event[]> {
    return prisma.event.findMany({
      where: {
        date: {
          gte: new Date()
        }
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
   * Get events by organizer
   */
  async getEventsByOrganizer(organizerId: string): Promise<Event[]> {
    return prisma.event.findMany({
      where: {
        organizerId
      },
      include: {
        tickets: true
      },
      orderBy: {
        date: 'desc'
      }
    });
  }

  /**
   * Search events by name or location
   */
  async searchEvents(query: string): Promise<Event[]> {
    return prisma.event.findMany({
      where: {
        OR: [
          {
            name: {
              contains: query,
              mode: 'insensitive'
            }
          },
          {
            location: {
              contains: query,
              mode: 'insensitive'
            }
          },
          {
            description: {
              contains: query,
              mode: 'insensitive'
            }
          }
        ]
      },
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
   * Publish or unpublish an event
   */
  async toggleEventPublished(id: string, published: boolean): Promise<Event> {
    return prisma.event.update({
      where: { id },
      data: { published }
    });
  }

  /**
   * Get event statistics
   */
  async getEventStatistics(id: string): Promise<{
    totalTickets: number;
    soldTickets: number;
    revenue: number;
  }> {
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        tickets: {
          include: {
            orders: true
          }
        }
      }
    });

    if (!event) {
      throw new Error('Event not found');
    }

    let totalTickets = 0;
    let soldTickets = 0;
    let revenue = 0;

    event.tickets.forEach(ticket => {
      totalTickets += ticket.quantity;
      soldTickets += ticket.orders.length;
      revenue += ticket.orders.length * ticket.price;
    });

    return {
      totalTickets,
      soldTickets,
      revenue
    };
  }
}

const eventService = new EventService();
export default eventService;