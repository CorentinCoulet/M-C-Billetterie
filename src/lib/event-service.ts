import { prisma } from './prisma';

export interface EventData {
  id: string;
  title: string;
  description?: string;
  date: Date;
  location: string;
  maxCapacity?: number;
  isPublished: boolean;
  isCancelled: boolean;
  organizerId: string;
  categoryId?: string;
  venueId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EventWithDetails extends EventData {
  organizer: {
    id: string;
    name: string;
  };
  category?: {
    id: string;
    name: string;
  } | null;
  venue?: {
    id: string;
    name: string;
    address: string;
    capacity: number;
  } | null;
  _count: {
    tickets: number;
  };
}

/**
 * Get an event by ID with all details
 */
export async function getEventById(eventId: string): Promise<EventWithDetails | null> {
  try {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        organizer: {
          select: {
            id: true,
            name: true,
          }
        },
        category: {
          select: {
            id: true,
            name: true,
          }
        },
        venue: {
          select: {
            id: true,
            name: true,
            address: true,
            capacity: true,
          }
        },
        _count: {
          select: {
            tickets: true,
          }
        }
      }
    });

    return event as EventWithDetails | null;
  } catch (error) {
    console.error(`Error fetching event ${eventId}:`, error);
    return null;
  }
}

/**
 * Get basic event info (used for checkout and ticket generation)
 */
export async function getEventBasicInfo(eventId: string) {
  try {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        title: true,
        description: true,
        date: true,
        location: true,
        isPublished: true,
        isCancelled: true,
      }
    });

    return event;
  } catch (error) {
    console.error(`Error fetching basic event info ${eventId}:`, error);
    return null;
  }
}

/**
 * Get all published and upcoming events
 */
export async function getUpcomingEvents(limit: number = 10, offset: number = 0) {
  try {
    const events = await prisma.event.findMany({
      where: {
        isPublished: true,
        isCancelled: false,
        date: {
          gte: new Date()
        }
      },
      include: {
        organizer: {
          select: {
            id: true,
            name: true,
          }
        },
        category: {
          select: {
            id: true,
            name: true,
          }
        },
        venue: {
          select: {
            id: true,
            name: true,
            address: true,
          }
        },
        _count: {
          select: {
            tickets: true,
          }
        }
      },
      orderBy: {
        date: 'asc'
      },
      take: limit,
      skip: offset,
    });

    return events;
  } catch (error) {
    console.error('Error fetching upcoming events:', error);
    return [];
  }
}

/**
 * Check if event exists and is available for purchase
 */
export async function isEventAvailableForPurchase(eventId: string): Promise<boolean> {
  try {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        isPublished: true,
        isCancelled: true,
        date: true,
        maxCapacity: true,
        _count: {
          select: {
            tickets: {
              where: {
                status: 'paid'
              }
            }
          }
        }
      }
    });

    if (!event) return false;
    if (!event.isPublished || event.isCancelled) return false;
    if (event.date < new Date()) return false;
    
    // Check capacity if defined
    if (event.maxCapacity && event._count.tickets >= event.maxCapacity) {
      return false;
    }

    return true;
  } catch (error) {
    console.error(`Error checking event availability ${eventId}:`, error);
    return false;
  }
}
