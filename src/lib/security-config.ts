import { CONFIG } from '../core/config';

/**
 * Security configuration using centralized config
 */

// Password policy
export const PASSWORD_POLICY = {
  MIN_LENGTH: 12,
  REQUIRE_UPPERCASE: true,
  REQUIRE_LOWERCASE: true,
  REQUIRE_NUMBERS: true,
  REQUIRE_SPECIAL_CHARS: true,
  FORBIDDEN_PASSWORDS: [
    'password', '123456', 'qwerty', 'admin', 'user',
    'password123', '123456789', '12345678'
  ] as string[],
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION: 30 * 60 * 1000, // 30 minutes
  PASSWORD_HISTORY: 5, // Remember last 5 passwords
  BCRYPT_ROUNDS: CONFIG.AUTH.BCRYPT_SALT_ROUNDS,
} as const;

// Session security
export const SESSION_SECURITY = {
  ROTATE_ON_LOGIN: true,
  MAX_CONCURRENT_SESSIONS: 3,
  IDLE_TIMEOUT: 30 * 60 * 1000, // 30 minutes
  ABSOLUTE_TIMEOUT: 8 * 60 * 60 * 1000, // 8 hours
  SECURE_COOKIES: CONFIG.IS_PRODUCTION,
  SAME_SITE: 'strict' as const,
  SECRET: CONFIG.AUTH.SESSION_SECRET,
} as const;

// Request limits (using centralized rate limiting config)
export const REQUEST_LIMITS = {
  GENERAL: { 
    max: CONFIG.RATE_LIMIT.MAX_REQUESTS, 
    windowMs: CONFIG.RATE_LIMIT.WINDOW_MS 
  },
  AUTH: { max: 5, windowMs: 15 * 60 * 1000 }, // 5 auth attempts per 15 min
  PASSWORD_RESET: { max: 3, windowMs: 60 * 60 * 1000 }, // 3 resets per hour
  PAYMENT: { max: 10, windowMs: 60 * 60 * 1000 }, // 10 payments per hour
} as const;

// Input validation (using centralized upload config)
export const INPUT_VALIDATION = {
  MAX_STRING_LENGTH: 10000,
  MAX_ARRAY_LENGTH: 1000,
  MAX_OBJECT_DEPTH: 10,
  ALLOWED_MIME_TYPES: [
    ...CONFIG.UPLOAD.ALLOWED_TYPES.IMAGE,
    ...CONFIG.UPLOAD.ALLOWED_TYPES.DOCUMENT,
    'text/csv'
  ],
  MAX_FILE_SIZE: CONFIG.UPLOAD.MAX_SIZE,
} as const;

// IP Security
export const IP_SECURITY = {
  BLACKLIST_ENABLED: true,
  WHITELIST_ENABLED: false,
  GEO_BLOCKING: false,
  MAX_REQUESTS_PER_IP: REQUEST_LIMITS.GENERAL.max,
  BAN_DURATION: 24 * 60 * 60 * 1000, // 24 hours
  TRUSTED_PROXIES: ['127.0.0.1', '::1'],
} as const;

// Audit configuration
export const AUDIT_CONFIG = {
  ENABLED: CONFIG.IS_PRODUCTION,
  LOG_FAILED_LOGINS: true,
  LOG_ADMIN_ACTIONS: true,
  LOG_PAYMENT_ACTIONS: true,
  LOG_DATA_ACCESS: true,
  LOG_ALL_REQUESTS: CONFIG.IS_DEVELOPMENT,
  RETENTION_DAYS: 365,
  ANONYMIZE_IPS: CONFIG.IS_PRODUCTION,
  SENSITIVE_OPERATIONS: [
    'user.login.failed',
    'user.password.reset',
    'admin.user.delete',
    'admin.event.delete',
    'payment.process',
    'payment.refund',
    'data.export',
    'config.change'
  ] as string[],
} as const;

// JWT Configuration
export const JWT_CONFIG = {
  SECRET: CONFIG.AUTH.JWT_SECRET,
  EXPIRES_IN: CONFIG.AUTH.JWT_EXPIRES_IN,
  ISSUER: 'billetterie',
  AUDIENCE: 'billetterie-users',
  ALGORITHM: 'HS256' as const,
} as const;

// Encryption configuration
export const ENCRYPTION_CONFIG = {
  ALGORITHM: 'aes-256-gcm',
  KEY: CONFIG.SECURITY.ENCRYPTION_KEY,
  IV_LENGTH: 16,
  TAG_LENGTH: 16,
} as const;

// CORS Configuration
export const CORS_CONFIG = {
  ENABLED: CONFIG.SECURITY.CORS_ENABLED,
  ORIGIN: CONFIG.IS_DEVELOPMENT 
    ? [CONFIG.URLS.APP, 'http://localhost:3000', 'http://localhost:3001']
    : [CONFIG.URLS.APP],
  METHODS: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  ALLOWED_HEADERS: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'X-CSRF-Token'
  ],
  CREDENTIALS: true,
} as const;

// Helmet Configuration
export const HELMET_CONFIG = {
  ENABLED: CONFIG.SECURITY.HELMET_ENABLED,
  CONTENT_SECURITY_POLICY: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "https://api.stripe.com"],
      frameSrc: ["'self'", "https://js.stripe.com"],
    },
  },
  HSTS: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
} as const;

export default {
  PASSWORD_POLICY,
  SESSION_SECURITY,
  REQUEST_LIMITS,
  INPUT_VALIDATION,
  IP_SECURITY,
  AUDIT_CONFIG,
  JWT_CONFIG,
  ENCRYPTION_CONFIG,
  CORS_CONFIG,
  HELMET_CONFIG,
} as const;
