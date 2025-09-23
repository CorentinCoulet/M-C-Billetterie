import crypto from 'crypto';
import { NextApiRequest, NextApiResponse } from 'next';

/**
 * Unified Security Middleware
 * Combines essential security features in a single, maintainable middleware
 * Includes: CORS, CSRF, Rate Limiting, Security Headers, Input Validation
 */

// Type for next function in API routes
type NextFunction = () => void;

// Security headers configuration
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';",
};

// CORS configuration
const CORS_CONFIG = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token'],
};

// CSRF configuration
const CSRF_CONFIG = {
  tokenLength: 32,
  cookieName: '_csrf',
  headerName: 'x-csrf-token',
  safeMethods: ['GET', 'HEAD', 'OPTIONS'],
};

// Simple rate limiting storage (use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Generate a cryptographically secure CSRF token
 */
function generateCSRFToken(): string {
  return crypto.randomBytes(CSRF_CONFIG.tokenLength).toString('hex');
}

/**
 * Extract CSRF token from request
 */
function extractCSRFToken(req: NextApiRequest): string | null {
  // Check header first
  let token = req.headers[CSRF_CONFIG.headerName] as string;
  
  if (!token) {
    // Check body
    token = req.body?._csrf || req.body?.csrf_token;
  }
  
  if (!token) {
    // Check query params
    token = req.query._csrf as string || req.query.csrf_token as string;
  }
  
  return token || null;
}

/**
 * Validate CSRF token
 */
function validateCSRFToken(cookieToken: string, requestToken: string): boolean {
  if (!cookieToken || !requestToken) {
    return false;
  }
  
  // Constant time comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(cookieToken, 'hex'),
      Buffer.from(requestToken, 'hex')
    );
  } catch {
    return false;
  }
}

/**
 * Handle CSRF protection
 */
function handleCSRF(req: NextApiRequest, res: NextApiResponse): boolean {
  const method = req.method?.toUpperCase();
  const path = req.url || '';
  
  // Skip CSRF protection for safe methods
  if (CSRF_CONFIG.safeMethods.includes(method || '')) {
    return true;
  }
  
  // Skip CSRF protection for specific paths
  const skipPaths = ['/api/health', '/api/webhook'];
  if (skipPaths.some(skipPath => path.startsWith(skipPath))) {
    return true;
  }
  
  // Get existing CSRF token from cookie
  let csrfToken = req.cookies[CSRF_CONFIG.cookieName];
  
  // Generate new token if not present
  if (!csrfToken) {
    csrfToken = generateCSRFToken();
    
    // Set secure cookie
    res.setHeader('Set-Cookie', 
      `${CSRF_CONFIG.cookieName}=${csrfToken}; HttpOnly; SameSite=Strict; Path=/; ${
        process.env.NODE_ENV === 'production' ? 'Secure' : ''
      }`
    );
  }
  
  // For state-changing methods, validate CSRF token
  const requestToken = extractCSRFToken(req);
  
  if (!requestToken) {
    res.status(403).json({
      error: 'CSRF token required',
      code: 'CSRF_TOKEN_MISSING'
    });
    return false;
  }
  
  if (!validateCSRFToken(csrfToken, requestToken)) {
    res.status(403).json({
      error: 'Invalid CSRF token',
      code: 'CSRF_TOKEN_INVALID'
    });
    return false;
  }
  
  // Add CSRF token to response for client use
  res.setHeader('X-CSRF-Token', csrfToken);
  
  return true;
}

/**
 * Apply security headers to response
 */
function applySecurityHeaders(res: NextApiResponse) {
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    res.setHeader(key, value);
  });
}

/**
 * Handle CORS
 */
function handleCors(req: NextApiRequest, res: NextApiResponse) {
  const origin = req.headers.origin;
  
  if (CORS_CONFIG.origin.includes('*') || (origin && CORS_CONFIG.origin.includes(origin))) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }
  
  if (CORS_CONFIG.credentials) {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  
  res.setHeader('Access-Control-Allow-Methods', CORS_CONFIG.methods.join(', '));
  res.setHeader('Access-Control-Allow-Headers', CORS_CONFIG.allowedHeaders.join(', '));
  res.setHeader('Access-Control-Max-Age', '3600');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return true; // Indicates preflight was handled
  }
  
  return false;
}

/**
 * Simple rate limiting
 */
function checkRateLimit(req: NextApiRequest, res: NextApiResponse, maxRequests = 100, windowMs = 15 * 60 * 1000) {
  const key = req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  
  // Clean up expired entries
  for (const [k, v] of rateLimitStore.entries()) {
    if (now > v.resetTime) {
      rateLimitStore.delete(k);
    }
  }
  
  const current = rateLimitStore.get(key);
  
  if (!current || now > current.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (current.count >= maxRequests) {
    res.status(429).json({ message: 'Too many requests' });
    return false;
  }
  
  current.count++;
  return true;
}

/**
 * Basic input validation and sanitization
 */
function validateInput(req: NextApiRequest) {
  // Check for common malicious patterns
  const maliciousPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /(union|select|insert|delete|update|drop|create|alter)\s+/gi
  ];
  
  const checkString = (str: string): boolean => {
    return !maliciousPatterns.some(pattern => pattern.test(str));
  };
  
  const validateObject = (obj: any): boolean => {
    if (typeof obj === 'string') {
      return checkString(obj);
    }
    
    if (Array.isArray(obj)) {
      return obj.every(validateObject);
    }
    
    if (obj && typeof obj === 'object') {
      return Object.values(obj).every(validateObject);
    }
    
    return true;
  };
  
  // Validate query parameters and body
  return validateObject(req.query) && validateObject(req.body);
}

/**
 * Main security middleware
 */
export function securityMiddleware(options: {
  rateLimit?: { maxRequests?: number; windowMs?: number };
  skipCors?: boolean;
  skipRateLimit?: boolean;
  skipInputValidation?: boolean;
  skipCSRF?: boolean;
  csrfSkipPaths?: string[];
} = {}) {
  return async (req: NextApiRequest, res: NextApiResponse, next?: NextFunction) => {
    try {
      // Apply security headers
      applySecurityHeaders(res);
      
      // Handle CORS
      if (!options.skipCors) {
        const isPreflightHandled = handleCors(req, res);
        if (isPreflightHandled) return;
      }
      
      // CSRF Protection
      if (!options.skipCSRF) {
        if (!handleCSRF(req, res)) {
          return;
        }
      }
      
      // Rate limiting
      if (!options.skipRateLimit) {
        const { maxRequests = 100, windowMs = 15 * 60 * 1000 } = options.rateLimit || {};
        if (!checkRateLimit(req, res, maxRequests, windowMs)) {
          return;
        }
      }
      
      // Input validation
      if (!options.skipInputValidation) {
        if (!validateInput(req)) {
          res.status(400).json({ message: 'Invalid input detected' });
          return;
        }
      }
      
      // Call next function if provided
      if (next) {
        next();
      }
    } catch (error) {
      console.error('Security middleware error:', error);
      res.status(500).json({ message: 'Security check failed' });
    }
  };
}

// Predefined security configurations
export const authSecurityMiddleware = securityMiddleware({
  rateLimit: { maxRequests: 10, windowMs: 15 * 60 * 1000 },
  skipCSRF: false
});

export const apiSecurityMiddleware = securityMiddleware({
  rateLimit: { maxRequests: 100, windowMs: 15 * 60 * 1000 },
  skipCSRF: false
});

export const publicSecurityMiddleware = securityMiddleware({
  rateLimit: { maxRequests: 200, windowMs: 15 * 60 * 1000 },
  skipCSRF: true
});

export const webhookSecurityMiddleware = securityMiddleware({
  skipCSRF: true,
  skipCors: true,
  rateLimit: { maxRequests: 50, windowMs: 15 * 60 * 1000 }
});

/**
 * Get CSRF token for client-side use
 */
export function getCSRFToken(req: NextApiRequest, res: NextApiResponse) {
  let csrfToken = req.cookies[CSRF_CONFIG.cookieName];
  
  if (!csrfToken) {
    csrfToken = generateCSRFToken();
    
    res.setHeader('Set-Cookie', 
      `${CSRF_CONFIG.cookieName}=${csrfToken}; HttpOnly; SameSite=Strict; Path=/; ${
        process.env.NODE_ENV === 'production' ? 'Secure' : ''
      }`
    );
  }
  
  return res.json({
    csrfToken,
    headerName: CSRF_CONFIG.headerName
  });
}

/**
 * Helper function to apply security middleware to API routes
 * Usage: export default withSecurity(handler, options);
 */
export function withSecurity(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void> | void,
  options: Parameters<typeof securityMiddleware>[0] = {}
) {
  const middleware = securityMiddleware(options);
  
  return async (req: NextApiRequest, res: NextApiResponse) => {
    return new Promise<void>((resolve, reject) => {
      middleware(req, res, () => {
        try {
          const result = handler(req, res);
          if (result instanceof Promise) {
            result.then(resolve).catch(reject);
          } else {
            resolve();
          }
        } catch (error) {
          reject(error);
        }
      });
    });
  };
}
