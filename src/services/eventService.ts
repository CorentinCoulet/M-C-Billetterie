import prisma from '@/lib/prisma';

// Types spécifiques pour les relations
type TicketBasic = {
  id: string;
  userId: string | null;
  eventId: string;
  orderId: string | null;
  code: string;
  status: 'pending' | 'paid' | 'cancelled' | 'used';
  seatNumber: string | null;
  qrCode: string | null;
  usedAt: Date | null;
  purchasedAt: Date;
  metadata: Record<string, unknown> | null;
}

type TicketWithOrder = TicketBasic & {
  order: {
    id: string;
    totalPrice: number;
    tickets: { id: string }[];
  } | null;
}

type ReviewBasic = {
  id: string;
  userId: string;
  eventId: string;
  rating: number;
  comment: string | null;
  createdAt: Date;
}

type EventSettingBasic = {
  id: string;
  eventId: string;
  theme: string | null;
  allowAnonymousPurchase: boolean;
  allowTransfer: boolean;
  createdAt: Date;
  updatedAt: Date;
}

type CategoryBasic = {
  id: string;
  name: string;
}

type VenueBasic = {
  id: string;
  name: string;
  address: string;
  capacity: number;
}

type OrganizerBasic = {
  id: string;
  name: string;
}

type EventWithRelations = {
  id: string;
  title: string;
  description: string | null;
  date: Date;
  location: string;
  maxCapacity: number | null;
  isPublished: boolean;
  isCancelled: boolean;
  categoryId: string | null;
  venueId: string | null;
  organizerId: string;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
  tickets: TicketBasic[];
  reviews: ReviewBasic[];
  eventSetting: EventSettingBasic | null;
  category: CategoryBasic | null;
  venue: VenueBasic | null;
  organizer: OrganizerBasic;
}

// Types d'entrée pour les opérations
type EventCreateInput = {
  title: string;
  description?: string | null;
  date: Date | string;
  location: string;
  maxCapacity?: number | null;
  isPublished?: boolean;
  isCancelled?: boolean;
  categoryId?: string | null;
  venueId?: string | null;
  organizerId: string;
  metadata?: Record<string, unknown> | null;
}

type EventUpdateInput = {
  title?: string;
  description?: string | null;
  date?: Date | string;
  location?: string;
  maxCapacity?: number | null;
  isPublished?: boolean;
  isCancelled?: boolean;
  categoryId?: string | null;
  venueId?: string | null;
  metadata?: Record<string, unknown> | null;
}

type EventWhereInput = {
  id?: string;
  title?: {
    contains?: string;
    mode?: 'insensitive';
  };
  location?: {
    contains?: string;
    mode?: 'insensitive';
  };
  description?: {
    contains?: string;
    mode?: 'insensitive';
  };
  date?: {
    gte?: Date;
    lte?: Date;
  };
  isPublished?: boolean;
  isCancelled?: boolean;
  organizerId?: string;
  categoryId?: string;
  venueId?: string;
  AND?: EventWhereInput[];
  OR?: EventWhereInput[];
}

type EventOrderByInput = {
  id?: 'asc' | 'desc';
  title?: 'asc' | 'desc';
  date?: 'asc' | 'desc';
  location?: 'asc' | 'desc';
  createdAt?: 'asc' | 'desc';
  updatedAt?: 'asc' | 'desc';
}

type EventStatistics = {
  totalTickets: number;
  soldTickets: number;
  revenue: number;
  averageRating: number;
  totalReviews: number;
}

/**
 * Service for event management operations
 */
export class EventService {
  /**
   * Get an event by ID
   */
  async getEventById(id: string): Promise<EventWithRelations | null> {
    return prisma.event.findUnique({
      where: { id },
      include: {
        tickets: true,
        reviews: true,
        eventSetting: true,
        category: true,
        venue: true,
        organizer: true,
      }
    }) as Promise<EventWithRelations | null>;
  }

  /**
   * Get all events with pagination and filtering
   */
  async getEvents(params: {
    skip?: number;
    take?: number;
    where?: EventWhereInput;
    orderBy?: EventOrderByInput;
    includePast?: boolean;
  }): Promise<EventWithRelations[]> {
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
        reviews: true,
        eventSetting: true,
        category: true,
        venue: true,
        organizer: {
          select: {
            id: true,
            name: true
          }
        }
      }
    }) as Promise<EventWithRelations[]>;
  }

  /**
   * Create a new event
   */
  async createEvent(data: EventCreateInput): Promise<EventWithRelations> {
    return prisma.event.create({
      data: {
        ...data,
        date: new Date(data.date)
      },
      include: {
        tickets: true,
        reviews: true,
        eventSetting: true,
        category: true,
        venue: true,
        organizer: true
      }
    }) as Promise<EventWithRelations>;
  }

  /**
   * Update an event
   */
  async updateEvent(id: string, data: EventUpdateInput): Promise<EventWithRelations> {
    const updateData = { ...data };
    if (data.date) {
      updateData.date = new Date(data.date);
    }

    return prisma.event.update({
      where: { id },
      data: updateData,
      include: {
        tickets: true,
        reviews: true,
        eventSetting: true,
        category: true,
        venue: true,
        organizer: true
      }
    }) as Promise<EventWithRelations>;
  }

  /**
   * Delete an event
   */
  async deleteEvent(id: string): Promise<EventWithRelations> {
    return prisma.event.delete({
      where: { id },
      include: {
        tickets: true,
        reviews: true,
        eventSetting: true,
        category: true,
        venue: true,
        organizer: true
      }
    }) as Promise<EventWithRelations>;
  }

  /**
   * Count events with optional filtering
   */
  async countEvents(where?: EventWhereInput): Promise<number> {
    return prisma.event.count({ where });
  }

  /**
   * Get upcoming events
   */
  async getUpcomingEvents(limit: number = 10): Promise<EventWithRelations[]> {
    return prisma.event.findMany({
      where: {
        date: {
          gte: new Date()
        },
        isPublished: true,
        isCancelled: false
      },
      orderBy: {
        date: 'asc'
      },
      take: limit,
      include: {
        tickets: true,
        reviews: true,
        eventSetting: true,
        category: true,
        venue: true,
        organizer: {
          select: {
            id: true,
            name: true
          }
        }
      }
    }) as Promise<EventWithRelations[]>;
  }

  /**
   * Get events by organizer
   */
  async getEventsByOrganizer(organizerId: string): Promise<EventWithRelations[]> {
    return prisma.event.findMany({
      where: {
        organizerId
      },
      include: {
        tickets: true,
        reviews: true,
        eventSetting: true,
        category: true,
        venue: true,
        organizer: true
      },
      orderBy: {
        date: 'desc'
      }
    }) as Promise<EventWithRelations[]>;
  }

  /**
   * Search events by name, location or description
   */
  async searchEvents(query: string): Promise<EventWithRelations[]> {
    return prisma.event.findMany({
      where: {
        AND: [
          { isPublished: true },
          { isCancelled: false },
          {
            OR: [
              {
                title: {
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
          }
        ]
      },
      include: {
        tickets: true,
        reviews: true,
        eventSetting: true,
        category: true,
        venue: true,
        organizer: {
          select: {
            id: true,
            name: true
          }
        }
      }
    }) as Promise<EventWithRelations[]>;
  }

  /**
   * Publish or unpublish an event
   */
  async toggleEventPublished(id: string, isPublished: boolean): Promise<EventWithRelations> {
    return prisma.event.update({
      where: { id },
      data: { isPublished },
      include: {
        tickets: true,
        reviews: true,
        eventSetting: true,
        category: true,
        venue: true,
        organizer: true
      }
    }) as Promise<EventWithRelations>;
  }

  /**
   * Cancel or uncancel an event
   */
  async toggleEventCancelled(id: string, isCancelled: boolean): Promise<EventWithRelations> {
    return prisma.event.update({
      where: { id },
      data: { isCancelled },
      include: {
        tickets: true,
        reviews: true,
        eventSetting: true,
        category: true,
        venue: true,
        organizer: true
      }
    }) as Promise<EventWithRelations>;
  }

  /**
   * Get event statistics
   */
  async getEventStatistics(id: string): Promise<EventStatistics> {
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        tickets: {
          include: {
            order: true
          }
        },
        reviews: true
      }
    });

    if (!event) {
      throw new Error('Event not found');
    }

    let soldTickets = 0;
    let revenue = 0;

    event.tickets.forEach((ticket: TicketWithOrder) => {
      if (ticket.status === 'paid') {
        soldTickets++;
        if (ticket.order) {
          revenue += ticket.order.totalPrice / ticket.order.tickets.length;
        }
      }
    });

    const totalReviews = event.reviews.length;
    const averageRating = totalReviews > 0 
      ? event.reviews.reduce((sum: number, review: ReviewBasic) => sum + review.rating, 0) / totalReviews 
      : 0;

    return {
      totalTickets: event.tickets.length,
      soldTickets,
      revenue,
      averageRating: Math.round(averageRating * 10) / 10,
      totalReviews
    };
  }

  /**
   * Get events by category
   */
  async getEventsByCategory(categoryId: string, limit?: number): Promise<EventWithRelations[]> {
    return prisma.event.findMany({
      where: {
        categoryId,
        isPublished: true,
        isCancelled: false
      },
      take: limit,
      include: {
        tickets: true,
        reviews: true,
        eventSetting: true,
        category: true,
        venue: true,
        organizer: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        date: 'asc'
      }
    }) as Promise<EventWithRelations[]>;
  }

  /**
   * Get events by venue
   */
  async getEventsByVenue(venueId: string, limit?: number): Promise<EventWithRelations[]> {
    return prisma.event.findMany({
      where: {
        venueId,
        isPublished: true,
        isCancelled: false
      },
      take: limit,
      include: {
        tickets: true,
        reviews: true,
        eventSetting: true,
        category: true,
        venue: true,
        organizer: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        date: 'asc'
      }
    }) as Promise<EventWithRelations[]>;
  }
}

const eventService = new EventService();
export default eventService;