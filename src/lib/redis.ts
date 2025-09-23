import Redis from 'ioredis';
import { logger } from './logger';

/**
 * Redis service for caching and session management
 */

let redis: Redis | null = null;

/**
 * Initialize Redis connection
 */
export function initRedis(): Redis {
  if (redis) {
    return redis;
  }

  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  
  redis = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
    lazyConnect: true,
    connectTimeout: 10000,
    commandTimeout: 5000,
    keepAlive: 30000,
  });

  // Event listeners
  redis.on('connect', () => {
    logger.info('Redis connected successfully');
  });

  redis.on('ready', () => {
    logger.info('Redis ready to accept commands');
  });

  redis.on('error', (error) => {
    logger.error('Redis connection error:', error);
  });

  redis.on('close', () => {
    logger.warn('Redis connection closed');
  });

  redis.on('reconnecting', () => {
    logger.info('Redis reconnecting...');
  });

  return redis;
}

/**
 * Get Redis instance
 */
export function getRedis(): Redis {
  if (!redis) {
    return initRedis();
  }
  return redis;
}

/**
 * Cache service
 */
export class CacheService {
  private redis: Redis;
  private defaultTTL: number;

  constructor() {
    this.redis = getRedis();
    this.defaultTTL = parseInt(process.env.CACHE_TTL || '3600', 10); // 1 hour default
  }

  /**
   * Set cache value with optional TTL
   */
  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      const ttlToUse = ttl || this.defaultTTL;
      
      await this.redis.setex(this.prefixKey(key), ttlToUse, serialized);
      
      logger.debug(`Cache set: ${key} (TTL: ${ttlToUse}s)`);
    } catch (error) {
      logger.error('Cache set error:', error);
      throw new Error('Failed to set cache');
    }
  }

  /**
   * Get cache value
   */
  async get<T = any>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(this.prefixKey(key));
      
      if (value === null) {
        logger.debug(`Cache miss: ${key}`);
        return null;
      }

      logger.debug(`Cache hit: ${key}`);
      return JSON.parse(value);
    } catch (error) {
      logger.error('Cache get error:', error);
      return null; // Fail silently for cache errors
    }
  }

  /**
   * Delete cache value
   */
  async del(key: string): Promise<void> {
    try {
      await this.redis.del(this.prefixKey(key));
      logger.debug(`Cache deleted: ${key}`);
    } catch (error) {
      logger.error('Cache delete error:', error);
      throw new Error('Failed to delete cache');
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      const exists = await this.redis.exists(this.prefixKey(key));
      return exists === 1;
    } catch (error) {
      logger.error('Cache exists error:', error);
      return false;
    }
  }

  /**
   * Get multiple values
   */
  async mget<T = any>(keys: string[]): Promise<(T | null)[]> {
    try {
      const prefixedKeys = keys.map(key => this.prefixKey(key));
      const values = await this.redis.mget(...prefixedKeys);
      
      return values.map(value => {
        if (value === null) return null;
        try {
          return JSON.parse(value);
        } catch {
          return null;
        }
      });
    } catch (error) {
      logger.error('Cache mget error:', error);
      return keys.map(() => null);
    }
  }

  /**
   * Set multiple values
   */
  async mset(keyValues: Record<string, any>, ttl?: number): Promise<void> {
    try {
      const pipeline = this.redis.pipeline();
      const ttlToUse = ttl || this.defaultTTL;

      Object.entries(keyValues).forEach(([key, value]) => {
        const prefixedKey = this.prefixKey(key);
        const serialized = JSON.stringify(value);
        pipeline.setex(prefixedKey, ttlToUse, serialized);
      });

      await pipeline.exec();
      logger.debug(`Cache mset: ${Object.keys(keyValues).length} keys`);
    } catch (error) {
      logger.error('Cache mset error:', error);
      throw new Error('Failed to set multiple cache values');
    }
  }

  /**
   * Increment counter
   */
  async incr(key: string, ttl?: number): Promise<number> {
    try {
      const pipeline = this.redis.pipeline();
      const prefixedKey = this.prefixKey(key);
      
      pipeline.incr(prefixedKey);
      if (ttl) {
        pipeline.expire(prefixedKey, ttl);
      }
      
      const results = await pipeline.exec();
      return results?.[0]?.[1] as number || 0;
    } catch (error) {
      logger.error('Cache incr error:', error);
      throw new Error('Failed to increment counter');
    }
  }

  /**
   * Get TTL for key
   */
  async ttl(key: string): Promise<number> {
    try {
      return await this.redis.ttl(this.prefixKey(key));
    } catch (error) {
      logger.error('Cache TTL error:', error);
      return -1;
    }
  }

  /**
   * Clear all cache with pattern
   */
  async clear(pattern?: string): Promise<void> {
    try {
      const searchPattern = pattern 
        ? this.prefixKey(pattern)
        : this.prefixKey('*');
      
      const keys = await this.redis.keys(searchPattern);
      
      if (keys.length > 0) {
        await this.redis.del(...keys);
        logger.info(`Cache cleared: ${keys.length} keys`);
      }
    } catch (error) {
      logger.error('Cache clear error:', error);
      throw new Error('Failed to clear cache');
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<any> {
    try {
      const info = await this.redis.info('memory');
      const dbsize = await this.redis.dbsize();
      
      return {
        dbsize,
        info: info.split('\r\n').reduce((acc: any, line: string) => {
          const [key, value] = line.split(':');
          if (key && value) {
            acc[key] = value;
          }
          return acc;
        }, {})
      };
    } catch (error) {
      logger.error('Cache stats error:', error);
      return null;
    }
  }

  /**
   * Prefix cache key
   */
  private prefixKey(key: string): string {
    const prefix = process.env.CACHE_PREFIX || 'billetterie:';
    return `${prefix}${key}`;
  }
}

/**
 * Session store for Redis
 */
export class RedisSessionStore {
  private redis: Redis;
  private ttl: number;

  constructor() {
    this.redis = getRedis();
    this.ttl = 7 * 24 * 60 * 60; // 7 days default
  }

  async set(sessionId: string, session: any, ttl?: number): Promise<void> {
    const key = this.getSessionKey(sessionId);
    const sessionTTL = ttl || this.ttl;
    
    await this.redis.setex(key, sessionTTL, JSON.stringify(session));
  }

  async get(sessionId: string): Promise<any | null> {
    const key = this.getSessionKey(sessionId);
    const session = await this.redis.get(key);
    
    return session ? JSON.parse(session) : null;
  }

  async destroy(sessionId: string): Promise<void> {
    const key = this.getSessionKey(sessionId);
    await this.redis.del(key);
  }

  async touch(sessionId: string, ttl?: number): Promise<void> {
    const key = this.getSessionKey(sessionId);
    const sessionTTL = ttl || this.ttl;
    
    await this.redis.expire(key, sessionTTL);
  }

  private getSessionKey(sessionId: string): string {
    return `sessions:${sessionId}`;
  }
}

// Export singleton instances
export const cacheService = new CacheService();
export const sessionStore = new RedisSessionStore();

// Cleanup on app shutdown
process.on('SIGINT', async () => {
  if (redis) {
    await redis.quit();
    logger.info('Redis connection closed');
  }
});

process.on('SIGTERM', async () => {
  if (redis) {
    await redis.quit();
    logger.info('Redis connection closed');
  }
});

export default {
  initRedis,
  getRedis,
  cacheService,
  sessionStore
};
