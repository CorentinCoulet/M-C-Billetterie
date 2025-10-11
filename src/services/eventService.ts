import prisma from '@/lib/prisma';
import { JsonValue } from '@prisma/client/runtime/library';
import { cache, CacheHelpers } from '../lib/cache';
import { safeLogger } from '../lib/logger';
import { monitoringService } from '../lib/monitoring';
import { BaseService } from './baseService';

// Specific types for relations
type TicketBasic = {
  id: string;
  userId: string | null;
  eventId: string;
  orderId: string | null;
  code: string;
  status: 'pending' | 'paid' | 'cancelled' | 'used';
  seatNumber: string | null;
  currentQRCode: string | null;
  qrCodeGeneratedAt: Date | null;
  qrRotationInterval: number;
  isScanned: boolean;
  scannedAt: Date | null;
  usedAt: Date | null;
  purchasedAt: Date;
  metadata: JsonValue | null;
}

type TicketWithOrder = TicketBasic & {
  order: {
    id: string;
    userId: string;
    totalPrice: number;
    status: 'draft' | 'pending_payment' | 'paid' | 'cancelled';
    promoCode: string | null;
    discountAmount: number | null;
    currency: string;
    metadata: JsonValue | null;
    createdAt: Date;
    updatedAt: Date;
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

type ThemeBasic = {
  id: string;
  name: string;
  description: string | null;
  imagePath: string;
  color: string | null;
  metadata: JsonValue | null;
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
  allowAnonymousPurchase: boolean;
  allowTransfer: boolean;
  categoryId: string | null;
  venueId: string | null;
  organizerId: string;
  themeId: string | null;
  metadata: JsonValue | null;
  createdAt: Date;
  updatedAt: Date;
  tickets: TicketBasic[];
  reviews: ReviewBasic[];
  theme: ThemeBasic | null;
  category: CategoryBasic | null;
  venue: VenueBasic | null;
  organizer: OrganizerBasic;
}

// Input types for operations
export type EventCreateInput = {
  title: string;
  description?: string | null;
  date: Date | string;
  location: string;
  maxCapacity?: number | null;
  isPublished?: boolean;
  isCancelled?: boolean;
  allowAnonymousPurchase?: boolean;
  allowTransfer?: boolean;
  categoryId?: string | null;
  venueId?: string | null;
  organizerId: string;
  themeId?: string | null;
  metadata?: JsonValue | null;
}

export type EventUpdateInput = {
  title?: string;
  description?: string | null;
  date?: Date | string;
  location?: string;
  maxCapacity?: number | null;
  isPublished?: boolean;
  isCancelled?: boolean;
  allowAnonymousPurchase?: boolean;
  allowTransfer?: boolean;
  categoryId?: string | null;
  venueId?: string | null;
  themeId?: string | null;
  metadata?: JsonValue | null;
}

export type EventWhereInput = {
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

// Standard relations to include in event queries
const eventIncludes = {
  tickets: true,
  reviews: true,
  theme: true,
  category: true,
  venue: true,
  organizer: true,
};

/**
 * Service for event management operations
 */
export class EventService extends BaseService<EventWithRelations> {
  constructor() {
    super(prisma.event, eventIncludes);
  }

  /**
   * Get an event by ID with cache
   */
  async getEventById(id: string): Promise<EventWithRelations | null> {
    // Try cache first
    const cachedEvent = await CacheHelpers.getCachedEvent(id);
    if (cachedEvent) {
      monitoringService.recordCacheHit(`event:${id}`, true);
      return cachedEvent;
    }

    // Get from database
    const event = await this.getById(id);
    
    // Cache the result
    if (event) {
      await CacheHelpers.cacheEvent(id, event);
      monitoringService.recordCacheHit(`event:${id}`, false);
    }

    return event;
  }

  /**
   * Get all events with pagination and filtering (with cache for popular queries)
   */
  async getEvents(params: {
    skip?: number;
    take?: number;
    where?: EventWhereInput;
    orderBy?: EventOrderByInput;
    includePast?: boolean;
  }): Promise<EventWithRelations[]> {
    const { skip, take, where, orderBy, includePast = false } = params;

    // Create cache key for this query
    const cacheKey = `events:list:${JSON.stringify(params)}`;
    
    // Try cache for common queries (no custom where conditions)
    if (!where || Object.keys(where).length === 0) {
      const cachedEvents = await cache.get(cacheKey);
      if (cachedEvents) {
        monitoringService.recordCacheHit(cacheKey, true);
        return cachedEvents;
      }
    }

    const dateFilter = includePast ? {} : {
      date: {
        gte: new Date()
      }
    };

    const events = await this.getAll({
      skip,
      take,
      where: {
        ...where,
        ...dateFilter
      },
      orderBy: orderBy || { date: 'asc' }
    });

    // Cache popular queries
    if (!where || Object.keys(where).length === 0) {
      await cache.set(cacheKey, events, 180); // 3 minutes
      monitoringService.recordCacheHit(cacheKey, false);
    }

    return events;
  }

  /**
   * Create a new event
   */
  async createEvent(data: EventCreateInput): Promise<EventWithRelations> {
    const event = await this.create({
      ...data,
      date: new Date(data.date)
    });

    // Invalidate related caches
    await this.invalidateEventCaches();

    return event;
  }

  /**
   * Update an event with cache invalidation
   */
  async updateEvent(id: string, data: EventUpdateInput): Promise<EventWithRelations> {
    const event = await this.update(id, {
      ...data,
      date: data.date ? new Date(data.date) : undefined
    });

    // Invalidate specific event and list caches
    await CacheHelpers.invalidateEvent(id);
    await this.invalidateEventCaches();

    return event;
  }

  /**
   * Delete an event with cache invalidation
   */
  async deleteEvent(id: string): Promise<void> {
    await this.delete(id);

    // Invalidate caches
    await CacheHelpers.invalidateEvent(id);
    await this.invalidateEventCaches();
  }

  /**
   * Get event statistics with cache
   */
  async getEventStatistics(eventId: string): Promise<EventStatistics> {
    const statsKey = `event_stats:${eventId}`;
    
    // Try cache first
    const cachedStats = await CacheHelpers.getCachedStats(statsKey);
    if (cachedStats) {
      return cachedStats;
    }

    const stats = await this.getStatistics(eventId);
    
    // Cache the stats
    await CacheHelpers.cacheStats(statsKey, stats);
    
    return stats;
  }

  /**
   * Get events by category with cache
   */
  async getEventsByCategory(categoryId: string, limit?: number): Promise<EventWithRelations[]> {
    const cacheKey = `events:category:${categoryId}:${limit || 'all'}`;
    
    // Try cache first
    const cachedEvents = await cache.get(cacheKey);
    if (cachedEvents) {
      monitoringService.recordCacheHit(cacheKey, true);
      return cachedEvents;
    }

    const events = await this.getAll({
      where: {
        categoryId,
        isPublished: true,
        isCancelled: false
      },
      take: limit,
      orderBy: {
        date: 'asc'
      }
    });

    // Cache the result
    await cache.set(cacheKey, events, 300); // 5 minutes
    monitoringService.recordCacheHit(cacheKey, false);

    return events;
  }

  /**
   * Get popular events with cache (heavily cached)
   */
  async getPopularEvents(limit: number = 10): Promise<EventWithRelations[]> {
    const cacheKey = `events:popular:${limit}`;
    
    // Try cache first (longer cache time for popular events)
    const cachedEvents = await cache.get(cacheKey);
    if (cachedEvents) {
      monitoringService.recordCacheHit(cacheKey, true);
      return cachedEvents;
    }

    // Get events with most tickets sold
    const events = await this.getAll({
      where: {
        isPublished: true,
        isCancelled: false,
        date: {
          gte: new Date()
        }
      },
      take: limit * 2, // Get more to filter by popularity
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Sort by sold tickets (simplified popularity metric)
    const popularEvents = events
      .map(event => ({
        ...event,
        soldTickets: event.tickets.filter(t => t.status === 'paid').length
      }))
      .sort((a, b) => b.soldTickets - a.soldTickets)
      .slice(0, limit)
      .map(({ soldTickets, ...event }) => event);

    // Cache for longer (popular events don't change often)
    await cache.set(cacheKey, popularEvents, 600); // 10 minutes
    monitoringService.recordCacheHit(cacheKey, false);

    return popularEvents;
  }

  /**
   * Search events with cache for common searches
   */
  async searchEvents(query: string, limit?: number): Promise<EventWithRelations[]> {
    if (!query || query.trim().length < 2) {
      return [];
    }

    const normalizedQuery = query.toLowerCase().trim();
    const cacheKey = `events:search:${normalizedQuery}:${limit || 'all'}`;
    
    // Cache common searches
    const cachedResults = await cache.get(cacheKey);
    if (cachedResults) {
      monitoringService.recordCacheHit(cacheKey, true);
      return cachedResults;
    }

    const events = await this.getAll({
      where: {
        OR: [
          {
            title: {
              contains: query,
              mode: 'insensitive'
            }
          },
          {
            description: {
              contains: query,
              mode: 'insensitive'
            }
          },
          {
            location: {
              contains: query,
              mode: 'insensitive'
            }
          }
        ],
        isPublished: true,
        isCancelled: false
      },
      take: limit,
      orderBy: {
        date: 'asc'
      }
    });

    // Cache search results
    await cache.set(cacheKey, events, 300); // 5 minutes
    monitoringService.recordCacheHit(cacheKey, false);

    return events;
  }

  /**
   * Helper method to invalidate event-related caches
   */
  private async invalidateEventCaches(): Promise<void> {
    try {
      // Invalidate list caches
      await cache.clear('events:list:*');
      await cache.clear('events:category:*');
      await cache.clear('events:popular:*');
      await cache.clear('events:search:*');
      
      safeLogger.info('Event caches invalidated');
    } catch (error) {
      safeLogger.error('Error invalidating event caches:', error);
    }
  }

  /**
   * Warm up cache with popular data
   */
  async warmUpCache(): Promise<void> {
    try {
      safeLogger.info('Warming up event cache...');
      
      // Pre-cache popular events
      await this.getPopularEvents(10);
      
      // Pre-cache upcoming events
      await this.getEvents({ take: 20 });
      
      // Pre-cache events by popular categories (assuming category IDs)
      const popularCategories = ['cat1', 'cat2', 'cat3']; // Replace with actual category IDs
      for (const categoryId of popularCategories) {
        await this.getEventsByCategory(categoryId, 10);
      }
      
      safeLogger.info('Event cache warmed up successfully');
    } catch (error) {
      safeLogger.error('Error warming up event cache:', error);
    }
  }

  /**
   * Count events with optional filtering
   */
  async countEvents(where?: EventWhereInput): Promise<number> {
    return this.count(where);
  }

  /**
   * Get upcoming events
   */
  async getUpcomingEvents(limit: number = 10): Promise<EventWithRelations[]> {
    return this.getAll({
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
      take: limit
    });
  }

  /**
   * Get events by organizer
   */
  async getEventsByOrganizer(organizerId: string): Promise<EventWithRelations[]> {
    return this.getAll({
      where: {
        organizerId
      },
      orderBy: {
        date: 'desc'
      }
    });
  }

  /**
   * Get event tickets
   */
  async getEventTickets(eventId: string): Promise<TicketBasic[]> {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        tickets: true
      }
    });

    return event?.tickets || [];
  }

  /**
   * Get event statistics (private method used by getEventStatistics)
   */
  async getStatistics(eventId: string): Promise<EventStatistics> {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        tickets: {
          include: {
            order: {
              include: {
                tickets: {
                  select: {
                    id: true
                  }
                }
              }
            }
          }
        },
        reviews: true
      }
    });

    if (!event) {
      return {
        totalTickets: 0,
        soldTickets: 0,
        revenue: 0,
        averageRating: 0,
        totalReviews: 0
      };
    }

    let soldTickets = 0;
    let revenue = 0;

    event.tickets.forEach((ticket) => {
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
   * Get public events (published and not cancelled)
   */
  async getPublicEvents(filters?: EventWhereInput): Promise<EventWithRelations[]> {
    return this.getAll({
      where: {
        ...filters,
        isPublished: true,
        isCancelled: false
      },
      orderBy: {
        date: 'asc'
      }
    });
  }

  /**
   * Get featured events
   */
  async getFeaturedEvents(): Promise<EventWithRelations[]> {
    // Logique pour les événements mis en avant - à adapter
    return this.getAll({
      where: {
        isPublished: true,
        isCancelled: false,
        date: {
          gte: new Date()
        }
      },
      orderBy: {
        date: 'asc'
      },
      take: 5
    });
  }

  /**
   * Publish or unpublish an event
   */
  async toggleEventPublished(id: string, isPublished: boolean): Promise<EventWithRelations> {
    return this.update(id, { isPublished });
  }

  /**
   * Cancel or uncancel an event
   */
  async toggleEventCancelled(id: string, isCancelled: boolean): Promise<EventWithRelations> {
    return this.update(id, { isCancelled });
  }

  /**
   * Get events by venue
   */
  async getEventsByVenue(venueId: string, limit?: number): Promise<EventWithRelations[]> {
    return this.getAll({
      where: {
        venueId,
        isPublished: true,
        isCancelled: false
      },
      take: limit,
      orderBy: {
        date: 'asc'
      }
    });
  }
}

const eventService = new EventService();
export default eventService;
