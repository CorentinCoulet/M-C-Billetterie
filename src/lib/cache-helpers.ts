/**
 * High-level cache helpers for common use cases
 * Implements caching strategies for frequently accessed data
 */

import { cache, CACHE_CONFIG } from './cache';
import { safeLogger } from './logger';
import prisma from './prisma';

// ================================
// EVENTS CACHING
// ================================

/**
 * Get cached published events list
 * TTL: 5 minutes
 */
export async function getCachedPublishedEvents(options?: {
  category?: string;
  orderBy?: 'date' | 'createdAt' | 'title';
  limit?: number;
}) {
  const cacheKey = `${CACHE_CONFIG.KEYS.EVENTS}:published:${JSON.stringify(options || {})}`;
  
  // Try cache first
  const cached = await cache.get(cacheKey);
  if (cached) {
    safeLogger.debug('Cache HIT', { key: 'events:published' });
    return cached;
  }
  
  // Fetch from database
  safeLogger.debug('Cache MISS', { key: 'events:published' });
  const events = await prisma.event.findMany({
    where: {
      isPublished: true,
      ...(options?.category && { 
        category: {
          name: options.category
        }
      }),
      date: {
        gte: new Date() // Only future events
      }
    },
    orderBy: {
      [options?.orderBy || 'date']: 'asc'
    },
    take: options?.limit || 50,
    include: {
      organizer: {
        select: {
          id: true,
          name: true
        }
      },
      category: {
        select: {
          id: true,
          name: true
        }
      },
      venue: {
        select: {
          id: true,
          name: true
        }
      },
      tickets: {
        select: {
          id: true,
          status: true,
          order: {
            select: {
              id: true,
              totalPrice: true
            }
          }
        },
        where: {
          status: {
            in: ['pending', 'paid', 'used']
          }
        }
      },
      reviews: {
        select: {
          id: true,
          rating: true
        }
      },
      _count: {
        select: {
          tickets: true
        }
      }
    }
  });
  
  // Cache for 5 minutes
  await cache.set(cacheKey, events, CACHE_CONFIG.TTL.EVENTS);
  
  return events;
}

/**
 * Get cached single event by ID
 * TTL: 5 minutes
 */
export async function getCachedEvent(eventId: string) {
  const cacheKey = `${CACHE_CONFIG.KEYS.EVENTS}:${eventId}`;
  
  // Try cache first
  const cached = await cache.get(cacheKey);
  if (cached) {
    safeLogger.debug('Cache HIT', { key: `event:${eventId}` });
    return cached;
  }
  
  // Fetch from database
  safeLogger.debug('Cache MISS', { key: `event:${eventId}` });
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      organizer: {
        select: {
          id: true,
          name: true
        }
      },
      category: {
        select: {
          id: true,
          name: true
        }
      },
      venue: {
        select: {
          id: true,
          name: true
        }
      },
      tickets: {
        where: {
          status: {
            in: ['pending', 'paid', 'used']
          }
        },
        include: {
          order: {
            select: {
              id: true,
              status: true,
              totalPrice: true
            }
          }
        }
      },
      reviews: {
        select: {
          id: true,
          rating: true
        }
      }
    }
  });
  
  if (!event) return null;
  
  // Cache for 5 minutes
  await cache.set(cacheKey, event, CACHE_CONFIG.TTL.EVENTS);
  
  return event;
}

/**
 * Invalidate event cache when event is updated
 */
export async function invalidateEventCache(eventId: string) {
  safeLogger.info('Invalidating event cache', { eventId });
  
  // Delete specific event cache
  await cache.delete(`${CACHE_CONFIG.KEYS.EVENTS}:${eventId}`);
  
  // Delete all published events lists (they may contain this event)
  await cache.clear(`${CACHE_CONFIG.KEYS.EVENTS}:published:*`);
  
  // Delete event statistics
  await cache.delete(`${CACHE_CONFIG.KEYS.STATS}:event:${eventId}`);
}

// ================================
// CATEGORIES CACHING
// ================================

/**
 * Get cached event categories with counts
 * TTL: 1 hour (categories change rarely)
 */
export async function getCachedCategories() {
  const cacheKey = `${CACHE_CONFIG.KEYS.EVENTS}:categories`;
  
  // Try cache first
  const cached = await cache.get(cacheKey);
  if (cached) {
    safeLogger.debug('Cache HIT', { key: 'categories' });
    return cached;
  }
  
  // Fetch from database
  safeLogger.debug('Cache MISS', { key: 'categories' });
  
  // Get distinct categories with event counts
  const categories = await prisma.event.groupBy({
    by: ['categoryId'],
    where: {
      isPublished: true,
      date: {
        gte: new Date()
      },
      categoryId: {
        not: null
      }
    },
    _count: {
      id: true
    },
    orderBy: {
      _count: {
        id: 'desc'
      }
    }
  });
  
  // Fetch category names
  const categoryIds = categories.map(cat => cat.categoryId).filter(Boolean) as string[];
  const categoryNames = await prisma.category.findMany({
    where: {
      id: {
        in: categoryIds
      }
    },
    select: {
      id: true,
      name: true
    }
  });
  
  const categoryMap = new Map(categoryNames.map(cat => [cat.id, cat.name]));
  
  const result = categories
    .filter(cat => cat.categoryId)
    .map(cat => ({
      name: categoryMap.get(cat.categoryId!) || 'Unknown',
      count: cat._count?.id || 0
    }));
  
  // Cache for 1 hour
  await cache.set(cacheKey, result, 3600);
  
  return result;
}

/**
 * Invalidate categories cache
 * Call this when an event is created/updated/deleted
 */
export async function invalidateCategoriesCache() {
  safeLogger.info('Invalidating categories cache');
  await cache.delete(`${CACHE_CONFIG.KEYS.EVENTS}:categories`);
}

// ================================
// DASHBOARD STATISTICS CACHING
// ================================

/**
 * Get cached dashboard statistics
 * TTL: 2 minutes
 */
export async function getCachedDashboardStats(userId?: string) {
  const cacheKey = userId 
    ? `${CACHE_CONFIG.KEYS.STATS}:dashboard:user:${userId}`
    : `${CACHE_CONFIG.KEYS.STATS}:dashboard:global`;
  
  // Try cache first
  const cached = await cache.get(cacheKey);
  if (cached) {
    safeLogger.debug('Cache HIT', { key: 'dashboard:stats' });
    return cached;
  }
  
  // Fetch from database
  safeLogger.debug('Cache MISS', { key: 'dashboard:stats' });
  
  const stats = userId ? await getUserDashboardStats(userId) : await getGlobalDashboardStats();
  
  // Cache for 2 minutes
  await cache.set(cacheKey, stats, 120);
  
  return stats;
}

/**
 * Get global dashboard statistics
 */
async function getGlobalDashboardStats() {
  const [
    totalUsers,
    totalEvents,
    totalTickets,
    totalOrders,
    totalRevenue
  ] = await Promise.all([
    prisma.user.count(),
    prisma.event.count({ where: { isPublished: true } }),
    prisma.ticket.count({ where: { status: { in: ['paid', 'used'] } } }),
    prisma.order.count({ where: { status: 'paid' } }),
    prisma.order.aggregate({
      where: { status: 'paid' },
      _sum: { totalPrice: true }
    })
  ]);
  
  return {
    totalUsers,
    totalEvents,
    totalTickets,
    totalOrders,
    totalRevenue: totalRevenue._sum.totalPrice || 0,
    cachedAt: new Date().toISOString()
  };
}

/**
 * Get user-specific dashboard statistics
 */
async function getUserDashboardStats(userId: string) {
  const [
    userOrders,
    userTickets,
    upcomingEvents
  ] = await Promise.all([
    prisma.order.count({ 
      where: { 
        userId,
        status: 'paid'
      } 
    }),
    prisma.ticket.count({ 
      where: { 
        userId,
        status: { in: ['paid', 'pending'] }
      } 
    }),
    prisma.ticket.count({
      where: {
        userId,
        status: { in: ['paid', 'pending'] },
        event: {
          date: {
            gte: new Date()
          }
        }
      }
    })
  ]);
  
  return {
    userOrders,
    userTickets,
    upcomingEvents,
    cachedAt: new Date().toISOString()
  };
}

/**
 * Invalidate dashboard statistics cache
 * Call this when orders/tickets/events are created/updated
 */
export async function invalidateDashboardStatsCache(userId?: string) {
  safeLogger.info('Invalidating dashboard stats cache', { userId });
  
  if (userId) {
    // Invalidate user-specific stats
    await cache.delete(`${CACHE_CONFIG.KEYS.STATS}:dashboard:user:${userId}`);
  } else {
    // Invalidate global stats
    await cache.delete(`${CACHE_CONFIG.KEYS.STATS}:dashboard:global`);
  }
}

// ================================
// EVENT STATISTICS CACHING
// ================================

/**
 * Get cached event statistics
 * TTL: 2 minutes
 */
export async function getCachedEventStats(eventId: string) {
  const cacheKey = `${CACHE_CONFIG.KEYS.STATS}:event:${eventId}`;
  
  // Try cache first
  const cached = await cache.get(cacheKey);
  if (cached) {
    safeLogger.debug('Cache HIT', { key: `event:stats:${eventId}` });
    return cached;
  }
  
  // Fetch from database
  safeLogger.debug('Cache MISS', { key: `event:stats:${eventId}` });
  
  const [
    totalTickets,
    soldTickets,
    usedTickets,
    totalRevenue,
    uniqueAttendees
  ] = await Promise.all([
    prisma.ticket.count({ where: { eventId } }),
    prisma.ticket.count({ 
      where: { 
        eventId,
        status: { in: ['paid', 'used'] }
      } 
    }),
    prisma.ticket.count({ 
      where: { 
        eventId,
        status: 'used'
      } 
    }),
    prisma.order.aggregate({
      where: {
        status: 'paid',
        tickets: {
          some: { eventId }
        }
      },
      _sum: { totalPrice: true }
    }),
    prisma.ticket.findMany({
      where: { 
        eventId,
        status: { in: ['paid', 'used'] }
      },
      distinct: ['userId'],
      select: { userId: true }
    })
  ]);
  
  const stats = {
    totalTickets,
    soldTickets,
    usedTickets,
    availableTickets: totalTickets - soldTickets,
    totalRevenue: totalRevenue._sum.totalPrice || 0,
    uniqueAttendees: uniqueAttendees.length,
    sellRate: totalTickets > 0 ? (soldTickets / totalTickets) * 100 : 0,
    usageRate: soldTickets > 0 ? (usedTickets / soldTickets) * 100 : 0,
    cachedAt: new Date().toISOString()
  };
  
  // Cache for 2 minutes
  await cache.set(cacheKey, stats, 120);
  
  return stats;
}

// ================================
// BULK CACHE OPERATIONS
// ================================

/**
 * Warmup cache with frequently accessed data
 * Call this on application startup or during low-traffic periods
 */
export async function warmupCache() {
  safeLogger.info('Starting cache warmup');
  
  try {
    // Warmup published events
    await getCachedPublishedEvents();
    await getCachedPublishedEvents({ orderBy: 'date', limit: 20 });
    
    // Warmup categories
    await getCachedCategories();
    
    // Warmup global dashboard stats
    await getCachedDashboardStats();
    
    safeLogger.info('Cache warmup completed successfully');
    return { success: true };
  } catch (error) {
    safeLogger.error('Cache warmup failed', { error });
    return { success: false, error };
  }
}

/**
 * Clear all application caches
 * Use with caution - only for maintenance
 */
export async function clearAllCaches() {
  safeLogger.warn('Clearing ALL application caches');
  
  await Promise.all([
    cache.clear(`${CACHE_CONFIG.KEYS.EVENTS}:*`),
    cache.clear(`${CACHE_CONFIG.KEYS.STATS}:*`),
    cache.clear(`${CACHE_CONFIG.KEYS.TICKETS}:*`),
    cache.clear(`${CACHE_CONFIG.KEYS.USER}:*`)
  ]);
  
  safeLogger.info('All caches cleared');
}

// Export everything
export default {
  // Events
  getCachedPublishedEvents,
  getCachedEvent,
  invalidateEventCache,
  
  // Categories
  getCachedCategories,
  invalidateCategoriesCache,
  
  // Dashboard Stats
  getCachedDashboardStats,
  invalidateDashboardStatsCache,
  
  // Event Stats
  getCachedEventStats,
  
  // Bulk operations
  warmupCache,
  clearAllCaches
};
