import rateLimit from 'express-rate-limit';

// Get rate limit settings from environment variables
const RATE_LIMIT_WINDOW = parseInt(process.env.RATE_LIMIT_WINDOW || '15', 10); // Default: 15 minutes
const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX || '100', 10); // Default: 100 requests

// Auth rate limiter - more strict for authentication endpoints
export const authRateLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW * 60 * 1000, // Convert minutes to milliseconds
  max: 10, // Keep stricter limit for auth endpoints
  message: { message: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// General API rate limiter
export const apiRateLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW * 60 * 1000, // Convert minutes to milliseconds
  max: RATE_LIMIT_MAX,
  message: { message: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
