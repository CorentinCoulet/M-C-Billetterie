import { NextRequest, NextResponse } from 'next/server';

// Get rate limit settings from environment variables
const RATE_LIMIT_WINDOW = parseInt(process.env.RATE_LIMIT_WINDOW || '15', 10); // Default: 15 minutes
const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX || '100', 10); // Default: 100 requests

// In-memory store for rate limiting
// Note: This is not suitable for production with multiple instances
// For production, use Redis or another distributed store
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60 * 1000); // Clean up every minute

interface RateLimitOptions {
  windowMs?: number;
  max?: number;
}

/**
 * Rate limiting middleware for App Router
 */
export function createRateLimiter(options: RateLimitOptions = {}) {
  const windowMs = options.windowMs || RATE_LIMIT_WINDOW * 60 * 1000;
  const max = options.max || RATE_LIMIT_MAX;

  return async function rateLimiter(request: NextRequest) {
    const ip = (request as any).ip || request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'anonymous';
    const now = Date.now();
    
    // Get or create rate limit entry
    let rateLimit = rateLimitStore.get(ip);
    if (!rateLimit || rateLimit.resetTime < now) {
      rateLimit = { count: 0, resetTime: now + windowMs };
      rateLimitStore.set(ip, rateLimit);
    }
    
    // Increment count
    rateLimit.count++;
    
    // Set headers
    const headers = new Headers();
    headers.set('X-RateLimit-Limit', max.toString());
    headers.set('X-RateLimit-Remaining', Math.max(0, max - rateLimit.count).toString());
    headers.set('X-RateLimit-Reset', Math.ceil(rateLimit.resetTime / 1000).toString());
    
    // Check if rate limit exceeded
    if (rateLimit.count > max) {
      return NextResponse.json(
        { message: 'Too many requests, please try again later.' },
        { status: 429, headers }
      );
    }
    
    return headers;
  };
}

// Auth rate limiter - more strict for authentication endpoints
export const authRateLimiter = createRateLimiter({
  max: 10, // Keep stricter limit for auth endpoints
});

// General API rate limiter
export const apiRateLimiter = createRateLimiter();