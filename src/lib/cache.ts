/**
 * Production Redis Cache Service
 * High-performance caching layer with fallback strategies
 */

import Redis from 'ioredis';
import { logger } from './logger';
import monitoringService from './monitoring';

// Cache configuration
export const CACHE_CONFIG = {
  // Cache TTL (Time To Live) in seconds
  TTL: {
    EVENTS: 300, // 5 minutes
    EVENTS_LIST: 180, // 3 minutes
    USER_DATA: 600, // 10 minutes
    TICKETS: 120, // 2 minutes
    STATS: 60, // 1 minute
    QR_CODES: 3600, // 1 hour
    RATE_LIMIT: 900, // 15 minutes
  },
  
  // Cache keys prefixes
  KEYS: {
    EVENTS: 'events',
    USER: 'user',
    TICKETS: 'tickets',
    STATS: 'stats',
    QR: 'qr',
    SESSION: 'session',
    RATE_LIMIT: 'rate_limit',
  },
  
  // Redis connection
  REDIS_URL: process.env.REDIS_URL || 'redis://redis:6379',
  REDIS_PASSWORD: process.env.REDIS_PASSWORD,
  
  // Fallback options
  ENABLE_FALLBACK: true,
  MAX_MEMORY_CACHE_SIZE: 100, // Max items in memory fallback
};

// Memory fallback cache
class MemoryCache {
  private cache = new Map<string, { value: any; expires: number }>();
  private maxSize: number;

  constructor(maxSize: number = CACHE_CONFIG.MAX_MEMORY_CACHE_SIZE) {
    this.maxSize = maxSize;
  }

  set(key: string, value: any, ttlSeconds: number): void {
    // Remove oldest entries if at max capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    const expires = Date.now() + (ttlSeconds * 1000);
    this.cache.set(key, { value, expires });
  }

  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  // Clean expired entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expires) {
        this.cache.delete(key);
      }
    }
  }
}

// Main cache service
class CacheService {
  private redis: Redis | null = null;
  private memoryCache: MemoryCache;
  private isRedisConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  constructor() {
    this.memoryCache = new MemoryCache();
    this.initRedis();
    
    // Cleanup memory cache every 5 minutes
    setInterval(() => {
      this.memoryCache.cleanup();
    }, 5 * 60 * 1000);
  }

  private async initRedis(): Promise<void> {
    try {
      this.redis = new Redis(CACHE_CONFIG.REDIS_URL, {
        password: CACHE_CONFIG.REDIS_PASSWORD,
        enableReadyCheck: true,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        reconnectOnError: (err) => {
          const targetError = 'READONLY';
          return err.message.includes(targetError);
        },
      });

      this.redis.on('connect', () => {
        logger.info('Redis connected successfully');
        this.isRedisConnected = true;
        this.reconnectAttempts = 0;
        
        // Record cache connection success
        monitoringService.recordBusinessEvent('cache.redis.connected', 1);
      });

      this.redis.on('error', (err) => {
        logger.error('Redis connection error:', err);
        this.isRedisConnected = false;
        
        // Record cache connection error
        monitoringService.recordError(err, { component: 'cache', operation: 'redis_connection' });
      });

      this.redis.on('close', () => {
        logger.warn('Redis connection closed');
        this.isRedisConnected = false;
        
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          setTimeout(() => {
            this.initRedis();
          }, 1000 * this.reconnectAttempts);
        }
      });

      // Test connection
      await this.redis.ping();
      
    } catch (error) {
      logger.error('Failed to initialize Redis:', error);
      this.redis = null;
      this.isRedisConnected = false;
      
      if (CACHE_CONFIG.ENABLE_FALLBACK) {
        logger.info('Using memory cache fallback');
      }
    }
  }

  /**
   * Get value from cache
   */
  async get<T = any>(key: string): Promise<T | null> {
    const fullKey = this.buildKey(key);
    
    try {
      // Try Redis first
      if (this.redis && this.isRedisConnected) {
        const value = await this.redis.get(fullKey);
        if (value !== null) {
          monitoringService.recordCacheHit(key, true);
          return JSON.parse(value);
        }
      }
      
      // Fallback to memory cache
      if (CACHE_CONFIG.ENABLE_FALLBACK) {
        const value = this.memoryCache.get(fullKey);
        if (value !== null) {
          monitoringService.recordCacheHit(key, true);
          return value;
        }
      }
      
      monitoringService.recordCacheHit(key, false);
      return null;
      
    } catch (error) {
      logger.error('Cache get error:', error, { key: fullKey });
      monitoringService.recordError(error as Error, { operation: 'cache_get', key: key.split(':')[0] });
      return null;
    }
  }

  /**
   * Set value in cache
   */
  async set(key: string, value: any, ttlSeconds?: number): Promise<boolean> {
    const fullKey = this.buildKey(key);
    const ttl = ttlSeconds || this.getTTLForKey(key);
    
    try {
      // Try Redis first
      if (this.redis && this.isRedisConnected) {
        await this.redis.setex(fullKey, ttl, JSON.stringify(value));
        monitoringService.recordBusinessEvent('cache.set.redis', 1, { key: key.split(':')[0] });
      }
      
      // Always set in memory cache as fallback
      if (CACHE_CONFIG.ENABLE_FALLBACK) {
        this.memoryCache.set(fullKey, value, ttl);
        if (!this.isRedisConnected) {
          monitoringService.recordBusinessEvent('cache.set.memory', 1, { key: key.split(':')[0] });
        }
      }
      
      return true;
      
    } catch (error) {
      logger.error('Cache set error:', error, { key: fullKey });
      monitoringService.recordError(error as Error, { operation: 'cache_set', key: key.split(':')[0] });
      return false;
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<boolean> {
    const fullKey = this.buildKey(key);
    
    try {
      let deleted = false;
      
      // Delete from Redis
      if (this.redis && this.isRedisConnected) {
        const result = await this.redis.del(fullKey);
        deleted = result > 0;
      }
      
      // Delete from memory cache
      if (CACHE_CONFIG.ENABLE_FALLBACK) {
        this.memoryCache.delete(fullKey);
      }
      
      monitoringService.recordBusinessEvent('cache.delete', 1, { key: key.split(':')[0] });
      return deleted;
      
    } catch (error) {
      logger.error('Cache delete error:', error, { key: fullKey });
      monitoringService.recordError(error as Error, { operation: 'cache_delete', key: key.split(':')[0] });
      return false;
    }
  }

  /**
   * Clear all cache entries with pattern
   */
  async clear(pattern?: string): Promise<boolean> {
    try {
      if (pattern) {
        const fullPattern = this.buildKey(pattern);
        
        if (this.redis && this.isRedisConnected) {
          const keys = await this.redis.keys(fullPattern);
          if (keys.length > 0) {
            await this.redis.del(...keys);
          }
        }
      } else {
        // Clear all
        if (this.redis && this.isRedisConnected) {
          await this.redis.flushdb();
        }
      }
      
      if (CACHE_CONFIG.ENABLE_FALLBACK) {
        this.memoryCache.clear();
      }
      
      monitoringService.recordBusinessEvent('cache.clear', 1, { pattern: pattern || 'all' });
      return true;
      
    } catch (error) {
      logger.error('Cache clear error:', error, { pattern });
      monitoringService.recordError(error as Error, { operation: 'cache_clear' });
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    redis: { connected: boolean; memory?: string; keys?: number };
    memory: { size: number; maxSize: number };
  }> {
    const stats: any = {
      redis: { connected: this.isRedisConnected },
      memory: { size: this.memoryCache.size(), maxSize: CACHE_CONFIG.MAX_MEMORY_CACHE_SIZE }
    };

    try {
      if (this.redis && this.isRedisConnected) {
        const info = await this.redis.info('memory');
        const dbsize = await this.redis.dbsize();
        
        const memoryMatch = info.match(/used_memory_human:(.+)/);
        if (memoryMatch) {
          stats.redis.memory = memoryMatch[1].trim();
        }
        stats.redis.keys = dbsize;
      }
    } catch (error) {
      logger.error('Error getting Redis stats:', error);
    }

    return stats;
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ healthy: boolean; redis: boolean; memory: boolean }> {
    const health = {
      healthy: true,
      redis: false,
      memory: true
    };

    try {
      // Test Redis
      if (this.redis && this.isRedisConnected) {
        await this.redis.ping();
        health.redis = true;
      }
      
      // Test memory cache
      const testKey = 'health:check';
      this.memoryCache.set(testKey, 'ok', 10);
      const testValue = this.memoryCache.get(testKey);
      health.memory = testValue === 'ok';
      this.memoryCache.delete(testKey);
      
      health.healthy = health.redis || health.memory;
      
    } catch (error) {
      logger.error('Cache health check error:', error);
      health.healthy = false;
    }

    return health;
  }

  // Helper methods
  private buildKey(key: string): string {
    const prefix = process.env.NODE_ENV === 'production' ? 'prod' : 'dev';
    return `billetterie:${prefix}:${key}`;
  }

  private getTTLForKey(key: string): number {
    const keyType = key.split(':')[0];
    
    switch (keyType) {
      case CACHE_CONFIG.KEYS.EVENTS:
        return CACHE_CONFIG.TTL.EVENTS;
      case CACHE_CONFIG.KEYS.USER:
        return CACHE_CONFIG.TTL.USER_DATA;
      case CACHE_CONFIG.KEYS.TICKETS:
        return CACHE_CONFIG.TTL.TICKETS;
      case CACHE_CONFIG.KEYS.STATS:
        return CACHE_CONFIG.TTL.STATS;
      case CACHE_CONFIG.KEYS.QR:
        return CACHE_CONFIG.TTL.QR_CODES;
      case CACHE_CONFIG.KEYS.RATE_LIMIT:
        return CACHE_CONFIG.TTL.RATE_LIMIT;
      default:
        return 300; // 5 minutes default
    }
  }
}

// Singleton instance
export const cache = new CacheService();

// Cache decorators for easy usage
export function Cached(ttlSeconds?: number) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const cacheKey = `${target.constructor.name}:${propertyName}:${JSON.stringify(args)}`;
      
      // Try to get from cache
      const cachedResult = await cache.get(cacheKey);
      if (cachedResult !== null) {
        return cachedResult;
      }
      
      // Execute method and cache result
      const result = await method.apply(this, args);
      await cache.set(cacheKey, result, ttlSeconds);
      
      return result;
    };
    
    return descriptor;
  };
}

// Cache invalidation helper
export async function invalidateCache(pattern: string): Promise<void> {
  await cache.clear(pattern);
  logger.info('Cache invalidated', { pattern });
}

// Popular cache methods for common use cases
export const CacheHelpers = {
  // Events cache
  async cacheEvent(eventId: string, eventData: any): Promise<void> {
    await cache.set(`${CACHE_CONFIG.KEYS.EVENTS}:${eventId}`, eventData);
  },
  
  async getCachedEvent(eventId: string): Promise<any> {
    return await cache.get(`${CACHE_CONFIG.KEYS.EVENTS}:${eventId}`);
  },
  
  async invalidateEvent(eventId: string): Promise<void> {
    await cache.delete(`${CACHE_CONFIG.KEYS.EVENTS}:${eventId}`);
    await cache.clear(`${CACHE_CONFIG.KEYS.EVENTS}:list:*`);
  },
  
  // User cache
  async cacheUserData(userId: string, userData: any): Promise<void> {
    await cache.set(`${CACHE_CONFIG.KEYS.USER}:${userId}`, userData);
  },
  
  async getCachedUserData(userId: string): Promise<any> {
    return await cache.get(`${CACHE_CONFIG.KEYS.USER}:${userId}`);
  },
  
  // Tickets cache
  async cacheTicket(ticketId: string, ticketData: any): Promise<void> {
    await cache.set(`${CACHE_CONFIG.KEYS.TICKETS}:${ticketId}`, ticketData);
  },
  
  async getCachedTicket(ticketId: string): Promise<any> {
    return await cache.get(`${CACHE_CONFIG.KEYS.TICKETS}:${ticketId}`);
  },
  
  // Stats cache
  async cacheStats(key: string, stats: any): Promise<void> {
    await cache.set(`${CACHE_CONFIG.KEYS.STATS}:${key}`, stats);
  },
  
  async getCachedStats(key: string): Promise<any> {
    return await cache.get(`${CACHE_CONFIG.KEYS.STATS}:${key}`);
  },
};

export default cache;
