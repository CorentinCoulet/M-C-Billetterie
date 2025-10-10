/**
 * Production Rate Limiting with Redis
 * Distributed rate limiting for high availability production environment
 */

import type { Redis } from 'ioredis';
import { NextRequest, NextResponse } from 'next/server';
import { safeLogger } from '../lib/logger';

export interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (req: NextRequest) => string;
  message?: string;
  statusCode?: number;
  headers?: boolean;
  onLimitReached?: (req: NextRequest) => void;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
  totalAttempts: number;
}

/**
 * Redis-based Rate Limiter with fallback
 */
class RedisRateLimiter {
  private redisClient: Redis | null = null;
  private fallbackStore = new Map<string, { count: number; resetTime: number }>();
  private isRedisAvailable = false;

  constructor() {
    this.initializeRedis();
  }

  private async initializeRedis() {
    try {
      if (process.env.REDIS_URL) {
        const { Redis } = await import('ioredis');
        this.redisClient = new Redis(process.env.REDIS_URL, {
          maxRetriesPerRequest: 3,
          lazyConnect: true,
          reconnectOnError: (err) => {
            const targetError = 'READONLY';
            return err.message.includes(targetError);
          }
        });

        // Test connection
        await this.redisClient.ping();
        this.isRedisAvailable = true;
        
        this.redisClient.on('error', (error: Error) => {
          safeLogger.error('Redis rate limiter error', { error });
          this.isRedisAvailable = false;
        });

        this.redisClient.on('connect', () => {
          safeLogger.info('Redis rate limiter connected');
          this.isRedisAvailable = true;
      });

      safeLogger.info('Redis rate limiter initialized');
    } else {
      safeLogger.warn('Redis URL not provided, using in-memory fallback for rate limiting');
    }
  } catch (error) {
    safeLogger.error('Failed to initialize Redis for rate limiting', { error });
    this.isRedisAvailable = false;
  }
}  async checkLimit(key: string, windowMs: number, maxRequests: number): Promise<RateLimitResult> {
    if (this.isRedisAvailable && this.redisClient) {
      return this.checkRedisRateLimit(key, windowMs, maxRequests);
    } else {
      return this.checkMemoryRateLimit(key, windowMs, maxRequests);
    }
  }

  private async checkRedisRateLimit(key: string, windowMs: number, maxRequests: number): Promise<RateLimitResult> {
    const now = Date.now();
    const windowStart = now - windowMs;
    
    if (!this.redisClient) {
      throw new Error('Redis client is not available');
    }
    
    try {
      // Use Redis Lua script for atomic operations
      const luaScript = `
        local key = KEYS[1]
        local window_start = tonumber(ARGV[1])
        local max_requests = tonumber(ARGV[2])
        local now = tonumber(ARGV[3])
        local window_ms = tonumber(ARGV[4])
        
        -- Remove expired entries
        redis.call('ZREMRANGEBYSCORE', key, 0, window_start)
        
        -- Count current requests
        local current_count = redis.call('ZCARD', key)
        
        if current_count < max_requests then
          -- Add current request
          redis.call('ZADD', key, now, now .. ':' .. math.random())
          -- Set expiration
          redis.call('EXPIRE', key, math.ceil(window_ms / 1000))
          return {1, max_requests, max_requests - current_count - 1, now + window_ms, current_count + 1}
        else
          return {0, max_requests, 0, now + window_ms, current_count}
        end
      `;

      const result = await this.redisClient.eval(
        luaScript,
        1,
        key,
        windowStart,
        maxRequests,
        now,
        windowMs
      ) as [number, number, number, number, number];

      return {
        allowed: result[0] === 1,
        limit: result[1],
        remaining: result[2],
        resetTime: result[3],
        totalAttempts: result[4]
      };
    } catch (error) {
      safeLogger.error('Redis rate limit check failed, falling back to memory:', error);
      this.isRedisAvailable = false;
      return this.checkMemoryRateLimit(key, windowMs, maxRequests);
    }
  }

  private checkMemoryRateLimit(key: string, windowMs: number, maxRequests: number): RateLimitResult {
    const now = Date.now();
    
    // Clean up expired entries
    this.cleanupExpiredEntries();
    
    const entry = this.fallbackStore.get(key);
    
    if (!entry || now > entry.resetTime) {
      // New window
      this.fallbackStore.set(key, { count: 1, resetTime: now + windowMs });
      return {
        allowed: true,
        limit: maxRequests,
        remaining: maxRequests - 1,
        resetTime: now + windowMs,
        totalAttempts: 1
      };
    }
    
    if (entry.count < maxRequests) {
      // Within limit
      entry.count++;
      return {
        allowed: true,
        limit: maxRequests,
        remaining: maxRequests - entry.count,
        resetTime: entry.resetTime,
        totalAttempts: entry.count
      };
    }
    
    // Rate limit exceeded
    return {
      allowed: false,
      limit: maxRequests,
      remaining: 0,
      resetTime: entry.resetTime,
      totalAttempts: entry.count
    };
  }

  private cleanupExpiredEntries() {
    const now = Date.now();
    const entries = Array.from(this.fallbackStore.entries());
    for (const [key, entry] of entries) {
      if (now > entry.resetTime) {
        this.fallbackStore.delete(key);
      }
    }
  }

  async reset(key: string): Promise<void> {
    if (this.isRedisAvailable && this.redisClient) {
      try {
      await this.redisClient.del(key);
    } catch (error) {
      safeLogger.error('Failed to reset Redis rate limit', { error, key });
    }
  } else {
    this.fallbackStore.delete(key);
  }
}  async getStatus(): Promise<{ redis: boolean; fallback: boolean; keys: number }> {
    return {
      redis: this.isRedisAvailable,
      fallback: !this.isRedisAvailable,
      keys: this.fallbackStore.size
    };
  }
}

// Singleton instance
const rateLimiter = new RedisRateLimiter();

/**
 * Default key generators
 */
export const keyGenerators = {
  ip: (req: NextRequest) => {
    const ip = req.headers.get('x-forwarded-for') || 
              req.headers.get('x-real-ip') || 
              req.headers.get('cf-connecting-ip') ||
              'unknown';
    return `ip:${ip}`;
  },
  
  user: (req: NextRequest) => {
    // This would need to be adapted based on your auth system
    const userId = req.headers.get('x-user-id') || 'anonymous';
    return `user:${userId}`;
  },
  
  apiKey: (req: NextRequest) => {
    const apiKey = req.headers.get('x-api-key') || req.headers.get('authorization');
    return `apikey:${apiKey || 'none'}`;
  },
  
  combined: (req: NextRequest) => {
    const ip = keyGenerators.ip(req);
    const userId = req.headers.get('x-user-id');
    return userId ? `combined:${userId}:${ip}` : ip;
  }
};

/**
 * Pre-configured rate limiters
 */
export const rateLimitConfigs = {
  // API endpoints - standard rate limiting
  api: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
    keyGenerator: keyGenerators.combined,
    message: 'Too many API requests, please try again later.',
    statusCode: 429
  },
  
  // Authentication endpoints - strict limiting
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
    keyGenerator: keyGenerators.ip,
    message: 'Too many authentication attempts, please try again later.',
    statusCode: 429
  },
  
  // Registration - prevent spam
  register: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3,
    keyGenerator: keyGenerators.ip,
    message: 'Too many registration attempts, please try again later.',
    statusCode: 429
  },
  
  // Password reset - prevent abuse
  passwordReset: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3,
    keyGenerator: keyGenerators.ip,
    message: 'Too many password reset attempts, please try again later.',
    statusCode: 429
  },
  
  // Payment endpoints - strict limiting
  payment: {
    windowMs: 10 * 60 * 1000, // 10 minutes
    maxRequests: 5,
    keyGenerator: keyGenerators.combined,
    message: 'Too many payment attempts, please try again later.',
    statusCode: 429
  }
};

export function createProductionRateLimiter(options: {
  windowMs?: number;
  max?: number;
  keyGenerator?: (req: NextRequest) => string;
} = {}) {
  const windowMs = options.windowMs || 15 * 60 * 1000; // 15 minutes
  const max = options.max || 100;
  const keyGenerator = options.keyGenerator || keyGenerators.ip;

  return async function productionRateLimit(request: NextRequest) {
    try {
      const key = keyGenerator(request);
      const result = await rateLimiter.checkLimit(key, windowMs, max);
      
      const headers = new Headers();
      headers.set('X-RateLimit-Limit', result.limit.toString());
      headers.set('X-RateLimit-Remaining', result.remaining.toString());
      headers.set('X-RateLimit-Reset', new Date(result.resetTime).toISOString());
      
    if (!result.allowed) {
      // Log rate limit exceeded
      safeLogger.warn(`Rate limit exceeded for key: ${key}`, {
        key,
        limit: result.limit,
        totalAttempts: result.totalAttempts,
        resetTime: new Date(result.resetTime).toISOString(),
        url: request.url,
        userAgent: request.headers.get('user-agent'),
        ip: keyGenerators.ip(request)
      });        return NextResponse.json(
          { 
            error: 'Too many requests',
            retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000)
          },
          { 
            status: 429, 
            headers: {
              'Retry-After': Math.ceil((result.resetTime - Date.now()) / 1000).toString(),
              'X-RateLimit-Limit': result.limit.toString(),
              'X-RateLimit-Remaining': result.remaining.toString(),
              'X-RateLimit-Reset': new Date(result.resetTime).toISOString()
            }
          }
        );
      }
      
    return headers;
  } catch (error) {
    safeLogger.error('Rate limiting error', { error });
    // If rate limiting fails, allow the request to proceed
    return new Headers();
  }
};
}// Export pre-configured rate limiters
export const authRateLimiter = createProductionRateLimiter({
  max: 5, // Very strict for auth
  windowMs: 15 * 60 * 1000, // 15 minutes
  keyGenerator: keyGenerators.ip
});

export const apiRateLimiter = createProductionRateLimiter({
  max: 100,
  windowMs: 15 * 60 * 1000,
  keyGenerator: keyGenerators.combined
});

export const paymentRateLimiter = createProductionRateLimiter({
  max: 5,
  windowMs: 10 * 60 * 1000, // 10 minutes
  keyGenerator: keyGenerators.combined
});

/**
 * Apply rate limiting to an endpoint
 */
export async function applyRateLimit(
  req: NextRequest, 
  config: RateLimitOptions
): Promise<RateLimitResult> {
  const key = config.keyGenerator ? config.keyGenerator(req) : keyGenerators.ip(req);
  return rateLimiter.checkLimit(key, config.windowMs, config.maxRequests);
}

/**
 * Reset rate limit for a specific key
 */
export async function resetRateLimit(key: string): Promise<void> {
  return rateLimiter.reset(key);
}

/**
 * Get rate limiter status
 */
export async function getRateLimiterStatus() {
  return rateLimiter.getStatus();
}

export default rateLimiter;
