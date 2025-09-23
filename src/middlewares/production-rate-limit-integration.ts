/**
 * Production Rate Limiting Integration
 * Middleware integration for Next.js App Router
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger, safeLogger } from '../lib/logger';
import {
    apiRateLimiter,
    authRateLimiter,
    createProductionRateLimiter,
    getRateLimiterStatus,
    keyGenerators,
    paymentRateLimiter
} from './productionRateLimit';

export interface RateLimitConfig {
  windowMs: number;
  max: number;
  keyGenerator: (req: NextRequest) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  onLimitReached?: (req: NextRequest) => void;
}

/**
 * Rate limiting configurations for different endpoint types
 */
export const rateLimitConfigs = {
  // Authentication endpoints - very strict
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    keyGenerator: keyGenerators.ip,
    onLimitReached: (req: NextRequest) => {
      safeLogger.warn('Auth rate limit exceeded', {
        ip: keyGenerators.ip(req),
        url: req.url,
        userAgent: req.headers.get('user-agent')
      });
    }
  },

  // API endpoints - moderate limits
  api: {
    windowMs: 15 * 60 * 1000, // 15 minutes  
    max: 100,
    keyGenerator: keyGenerators.combined,
    skipSuccessfulRequests: false,
    onLimitReached: (req: NextRequest) => {
      safeLogger.warn('API rate limit exceeded', {
        key: keyGenerators.combined(req),
        url: req.url
      });
    }
  },

  // Payment endpoints - very strict
  payment: {
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 3,
    keyGenerator: keyGenerators.combined,
    onLimitReached: (req: NextRequest) => {
      safeLogger.error('Payment rate limit exceeded', {
        key: keyGenerators.combined(req),
        url: req.url,
        severity: 'high'
      });
    }
  },

  // Registration - prevent spam
  register: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3,
    keyGenerator: keyGenerators.ip,
    onLimitReached: (req: NextRequest) => {
      safeLogger.warn('Registration rate limit exceeded', {
        ip: keyGenerators.ip(req),
        url: req.url
      });
    }
  },

  // Password reset - prevent abuse
  passwordReset: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3,
    keyGenerator: keyGenerators.ip,
    onLimitReached: (req: NextRequest) => {
      safeLogger.warn('Password reset rate limit exceeded', {
        ip: keyGenerators.ip(req),
        url: req.url
      });
    }
  },

  // File upload - prevent abuse
  upload: {
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 10,
    keyGenerator: keyGenerators.combined,
    onLimitReached: (req: NextRequest) => {
      safeLogger.warn('Upload rate limit exceeded', {
        key: keyGenerators.combined(req),
        url: req.url
      });
    }
  },

  // Search endpoints
  search: {
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 30,
    keyGenerator: keyGenerators.combined,
    onLimitReached: (req: NextRequest) => {
      safeLogger.info('Search rate limit exceeded', {
        key: keyGenerators.combined(req),
        url: req.url
      });
    }
  }
};

/**
 * Apply rate limiting based on endpoint path
 */
export function applyRateLimitingByPath(req: NextRequest): Promise<Headers | NextResponse> {
  const { pathname } = new URL(req.url);

  // Authentication endpoints
  if (pathname.includes('/auth/') || pathname.includes('/login')) {
    return authRateLimiter(req);
  }

  // Payment endpoints
  if (pathname.includes('/payment/') || pathname.includes('/checkout/')) {
    return paymentRateLimiter(req);
  }

  // Registration
  if (pathname.includes('/register') || pathname.includes('/signup')) {
    const registerLimiter = createProductionRateLimiter(rateLimitConfigs.register);
    return registerLimiter(req);
  }

  // Password reset
  if (pathname.includes('/password-reset') || pathname.includes('/forgot-password')) {
    const passwordResetLimiter = createProductionRateLimiter(rateLimitConfigs.passwordReset);
    return passwordResetLimiter(req);
  }

  // File upload
  if (pathname.includes('/upload') && req.method === 'POST') {
    const uploadLimiter = createProductionRateLimiter(rateLimitConfigs.upload);
    return uploadLimiter(req);
  }

  // Search endpoints
  if (pathname.includes('/search') || pathname.includes('/api/search')) {
    const searchLimiter = createProductionRateLimiter(rateLimitConfigs.search);
    return searchLimiter(req);
  }

  // API endpoints (general)
  if (pathname.startsWith('/api/')) {
    return apiRateLimiter(req);
  }

  // Default rate limiting for all other endpoints
  const defaultLimiter = createProductionRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // More generous for general pages
    keyGenerator: keyGenerators.ip
  });

  return defaultLimiter(req);
}

/**
 * Create custom rate limiter for specific use cases
 */
export function createCustomRateLimit(config: RateLimitConfig) {
  return createProductionRateLimiter({
    windowMs: config.windowMs,
    max: config.max,
    keyGenerator: config.keyGenerator
  });
}

/**
 * Whitelist IPs that should bypass rate limiting
 */
const RATE_LIMIT_WHITELIST = new Set([
  '127.0.0.1',
  '::1',
  ...(process.env.RATE_LIMIT_WHITELIST?.split(',') || [])
]);

/**
 * Check if IP should bypass rate limiting
 */
export function shouldBypassRateLimit(req: NextRequest): boolean {
  const ip = req.headers.get('x-forwarded-for') || 
            req.headers.get('x-real-ip') || 
            req.headers.get('cf-connecting-ip') || 
            'unknown';

  // Check whitelist
  if (RATE_LIMIT_WHITELIST.has(ip)) {
    return true;
  }

  // Check for admin/monitoring endpoints with valid tokens
  const authHeader = req.headers.get('authorization');
  if (authHeader && req.url.includes('/admin/')) {
    // Add your admin token validation logic here
    return false; // For now, don't bypass
  }

  // Check for health check endpoints
  if (req.url.includes('/health') || req.url.includes('/metrics')) {
    return true;
  }

  return false;
}

/**
 * Enhanced middleware that applies rate limiting with bypass logic
 */
export async function enhancedRateLimit(req: NextRequest): Promise<Headers | NextResponse> {
  try {
    // Check if should bypass
    if (shouldBypassRateLimit(req)) {
      return new Headers();
    }

    // Apply rate limiting based on path
    return await applyRateLimitingByPath(req);

  } catch (error) {
    safeLogger.error('Rate limiting error:', error);
    // If rate limiting fails, allow request to proceed but log the error
    return new Headers();
  }
}

/**
 * Rate limit status endpoint for monitoring
 */
export async function getRateLimitStatus(req: NextRequest): Promise<NextResponse> {
  try {
    const status = await getRateLimiterStatus();
    
    return NextResponse.json({
      status: 'healthy',
      rateLimiter: status,
      configs: Object.keys(rateLimitConfigs),
      whitelist: Array.from(RATE_LIMIT_WHITELIST),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to get rate limit status:', error);
    
    return NextResponse.json({
      status: 'error',
      error: 'Failed to get rate limit status',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

/**
 * Advanced rate limiting with different strategies
 */
export class AdvancedRateLimiter {
  private readonly strategies = new Map<string, Function>();

  constructor() {
    this.initializeStrategies();
  }

  private initializeStrategies() {
    // Token bucket strategy (for burst allowance)
    this.strategies.set('token-bucket', createProductionRateLimiter({
      windowMs: 60 * 1000, // 1 minute
      max: 60,
      keyGenerator: keyGenerators.combined
    }));

    // Sliding window log (more accurate but resource intensive)
    this.strategies.set('sliding-window', createProductionRateLimiter({
      windowMs: 15 * 60 * 1000,
      max: 100,
      keyGenerator: keyGenerators.combined
    }));

    // Exponential backoff for repeated violations
    this.strategies.set('exponential-backoff', this.createExponentialBackoffLimiter());
  }

  private createExponentialBackoffLimiter() {
    const violations = new Map<string, { count: number; lastViolation: Date }>();

    return async (req: NextRequest) => {
      const key = keyGenerators.combined(req);
      const now = new Date();
      
      const violation = violations.get(key);
      
      if (violation) {
        const timeSinceLastViolation = now.getTime() - violation.lastViolation.getTime();
        const backoffTime = Math.min(Math.pow(2, violation.count) * 1000, 300000); // Max 5 minutes
        
        if (timeSinceLastViolation < backoffTime) {
          // Still in backoff period
          violation.count++;
          violation.lastViolation = now;
          
          return NextResponse.json({
            error: 'Rate limit exceeded - exponential backoff applied',
            retryAfter: Math.ceil((backoffTime - timeSinceLastViolation) / 1000)
          }, {
            status: 429,
            headers: {
              'Retry-After': Math.ceil((backoffTime - timeSinceLastViolation) / 1000).toString()
            }
          });
        } else {
          // Backoff period ended, reset violation count
          violations.delete(key);
        }
      }

      // Apply normal rate limiting
      const result = await apiRateLimiter(req);
      
      if (result instanceof NextResponse && result.status === 429) {
        // Rate limit exceeded, record violation
        const existingViolation = violations.get(key);
        violations.set(key, {
          count: existingViolation ? existingViolation.count + 1 : 1,
          lastViolation: now
        });
      }
      
      return result;
    };
  }

  async apply(strategy: string, req: NextRequest): Promise<Headers | NextResponse> {
    const limiter = this.strategies.get(strategy);
    
    if (!limiter) {
      throw new Error(`Unknown rate limiting strategy: ${strategy}`);
    }
    
    return limiter(req);
  }

  getAvailableStrategies(): string[] {
    return Array.from(this.strategies.keys());
  }
}

// Singleton instance
export const advancedRateLimiter = new AdvancedRateLimiter();

/**
 * Rate limiting metrics collection
 */
export class RateLimitMetrics {
  private metrics = {
    totalRequests: 0,
    blockedRequests: 0,
    bypassedRequests: 0,
    errorCount: 0
  };

  incrementTotal() {
    this.metrics.totalRequests++;
  }

  incrementBlocked() {
    this.metrics.blockedRequests++;
  }

  incrementBypassed() {
    this.metrics.bypassedRequests++;
  }

  incrementErrors() {
    this.metrics.errorCount++;
  }

  getMetrics() {
    return {
      ...this.metrics,
      blockRate: this.metrics.totalRequests > 0 ? 
        (this.metrics.blockedRequests / this.metrics.totalRequests) * 100 : 0,
      bypassRate: this.metrics.totalRequests > 0 ? 
        (this.metrics.bypassedRequests / this.metrics.totalRequests) * 100 : 0,
      errorRate: this.metrics.totalRequests > 0 ? 
        (this.metrics.errorCount / this.metrics.totalRequests) * 100 : 0
    };
  }

  reset() {
    this.metrics = {
      totalRequests: 0,
      blockedRequests: 0,
      bypassedRequests: 0,
      errorCount: 0
    };
  }
}

// Global metrics instance
export const rateLimitMetrics = new RateLimitMetrics();

/**
 * Instrumented rate limiting with metrics
 */
export async function instrumentedRateLimit(req: NextRequest): Promise<Headers | NextResponse> {
  // Skip rate limiting in development mode or during build to avoid Redis issues
  if (process.env.NODE_ENV === 'development' || process.env.NEXT_PHASE === 'phase-production-build') {
    return new Headers();
  }

  rateLimitMetrics.incrementTotal();

  try {
    if (shouldBypassRateLimit(req)) {
      rateLimitMetrics.incrementBypassed();
      return new Headers();
    }

    const result = await applyRateLimitingByPath(req);
    
    if (result instanceof NextResponse && result.status === 429) {
      rateLimitMetrics.incrementBlocked();
    }

    return result;

  } catch (error) {
    rateLimitMetrics.incrementErrors();
    safeLogger.error('Instrumented rate limiting error:', error);
    return new Headers();
  }
}

export default {
  applyRateLimitingByPath,
  enhancedRateLimit,
  instrumentedRateLimit,
  createCustomRateLimit,
  shouldBypassRateLimit,
  getRateLimitStatus,
  advancedRateLimiter,
  rateLimitMetrics,
  rateLimitConfigs
};
