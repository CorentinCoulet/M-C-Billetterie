import { NextRequest } from 'next/server';
import { NextApiResponse } from './next-api-helpers';

/**
 * Advanced rate limiting with multiple strategies
 */

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (request: NextRequest) => string;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
  blocked?: boolean;
}

// In-memory store (in production, use Redis)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Global rate limits per endpoint
const endpointLimits: Record<string, RateLimitConfig> = {
  '/api/auth/login': {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 attempts per IP
  },
  '/api/auth/register': {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3, // 3 registrations per IP
  },
  '/api/auth/forgot-password': {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3, // 3 requests per IP
  },
  default: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100, // 100 requests per IP
  },
};

/**
 * Generate a unique key for rate limiting
 */
function generateKey(request: NextRequest, config: RateLimitConfig): string {
  if (config.keyGenerator) {
    return config.keyGenerator(request);
  }

  const ip = request.headers.get('x-forwarded-for') || 
             request.headers.get('x-real-ip') || 
             'unknown';
  
  const path = new URL(request.url).pathname;
  return `${ip}:${path}`;
}

/**
 * Clean up expired entries
 */
function cleanupExpiredEntries(): void {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * Rate limiting middleware for Next.js API routes
 */
export function createRateLimit(config?: Partial<RateLimitConfig>) {
  return async function rateLimitMiddleware(
    request: NextRequest,
    handler: () => Promise<Response>
  ): Promise<Response> {
    // Get rate limit configuration for this endpoint
    const path = new URL(request.url).pathname;
    const endpointConfig = endpointLimits[path] || endpointLimits.default;
    const finalConfig = { ...endpointConfig, ...config };

    // Generate unique key for this request
    const key = generateKey(request, finalConfig);
    
    // Clean up expired entries periodically
    if (Math.random() < 0.01) { // 1% chance
      cleanupExpiredEntries();
    }

    const now = Date.now();
    let entry = rateLimitStore.get(key);

    // Create new entry if doesn't exist or expired
    if (!entry || entry.resetTime < now) {
      entry = {
        count: 0,
        resetTime: now + finalConfig.windowMs,
        blocked: false,
      };
      rateLimitStore.set(key, entry);
    }

    // Check if request is blocked
    if (entry.blocked || entry.count >= finalConfig.maxRequests) {
      // Calculate remaining time
      const remainingMs = entry.resetTime - now;
      const remainingMinutes = Math.ceil(remainingMs / (1000 * 60));
      
      entry.blocked = true; // Mark as blocked
      
      const response = NextApiResponse.error(
        `Trop de tentatives. Réessayez dans ${remainingMinutes} minute(s).`,
        429
      );
      
      // Add rate limit headers
      response.headers.set('X-RateLimit-Limit', finalConfig.maxRequests.toString());
      response.headers.set('X-RateLimit-Remaining', '0');
      response.headers.set('X-RateLimit-Reset', Math.ceil(entry.resetTime / 1000).toString());
      response.headers.set('Retry-After', Math.ceil(remainingMs / 1000).toString());
      
      return response;
    }

    // Execute the handler
    let response: Response;
    let requestFailed = false;
    
    try {
      response = await handler();
      requestFailed = response.status >= 400;
    } catch (error) {
      requestFailed = true;
      throw error;
    }

    // Update rate limit counter
    const shouldCount = 
      (!finalConfig.skipSuccessfulRequests || requestFailed) &&
      (!finalConfig.skipFailedRequests || !requestFailed);

    if (shouldCount) {
      entry.count++;
      rateLimitStore.set(key, entry);
    }

    // Add rate limit headers to response
    const remaining = Math.max(0, finalConfig.maxRequests - entry.count);
    response.headers.set('X-RateLimit-Limit', finalConfig.maxRequests.toString());
    response.headers.set('X-RateLimit-Remaining', remaining.toString());
    response.headers.set('X-RateLimit-Reset', Math.ceil(entry.resetTime / 1000).toString());

    return response;
  };
}

/**
 * IP-based blocking for severe violations
 */
const blockedIPs = new Set<string>();
const ipViolations = new Map<string, { count: number; lastViolation: number }>();

export function blockAbusiveIPs(request: NextRequest): boolean {
  const ip = request.headers.get('x-forwarded-for') || 
             request.headers.get('x-real-ip') || 
             'unknown';

  // Check if IP is already blocked
  if (blockedIPs.has(ip)) {
    return false; // Block the request
  }

  const now = Date.now();
  const violation = ipViolations.get(ip);

  // Track violations (when rate limit is exceeded)
  if (violation) {
    // If multiple violations within 1 hour, block the IP
    if (violation.count >= 5 && (now - violation.lastViolation) < 60 * 60 * 1000) {
      blockedIPs.add(ip);
      console.warn(`Blocked IP ${ip} due to repeated violations`);
      return false;
    }
  }

  return true; // Allow the request
}

/**
 * Record a rate limit violation for an IP
 */
export function recordViolation(request: NextRequest): void {
  const ip = request.headers.get('x-forwarded-for') || 
             request.headers.get('x-real-ip') || 
             'unknown';

  const now = Date.now();
  const violation = ipViolations.get(ip) || { count: 0, lastViolation: 0 };

  // Reset counter if last violation was more than 1 hour ago
  if (now - violation.lastViolation > 60 * 60 * 1000) {
    violation.count = 1;
  } else {
    violation.count++;
  }

  violation.lastViolation = now;
  ipViolations.set(ip, violation);
}

/**
 * Default rate limit middleware for API routes
 */
export const apiRateLimit = createRateLimit();

/**
 * Strict rate limit for authentication endpoints
 */
export const authRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5,
});

/**
 * Cleanup function to be called periodically
 */
export function cleanup(): void {
  cleanupExpiredEntries();
  
  // Clean up old violations
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  for (const [ip, violation] of ipViolations.entries()) {
    if (violation.lastViolation < oneHourAgo) {
      ipViolations.delete(ip);
    }
  }

  // Clean up blocked IPs after 24 hours
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  // Note: In a real implementation, you'd need to track when IPs were blocked
  // For now, we'll just clear all blocked IPs periodically
  if (Math.random() < 0.001) { // 0.1% chance
    blockedIPs.clear();
  }
}
