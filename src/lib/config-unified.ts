/**
 * Unified Configuration Service
 * Consolidates all configuration constants and environment variables
 */

// =====================================
// Environment Variables
// =====================================

export const ENV = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
  IS_DEVELOPMENT: process.env.NODE_ENV === 'development',
  IS_TEST: process.env.NODE_ENV === 'test',
};

// =====================================
// Application Configuration
// =====================================

export const APP = {
  NAME: process.env.APP_NAME || 'M&C Society Ticketing',
  VERSION: process.env.npm_package_version || process.env.VERSION || '1.0.0',
  URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api',
  DEFAULT_LOCALE: process.env.DEFAULT_LOCALE || 'fr',
  SUPPORTED_LOCALES: (process.env.SUPPORTED_LOCALES || 'fr,en').split(','),
  DEFAULT_TIMEZONE: process.env.DEFAULT_TIMEZONE || 'Europe/Paris',
  DEFAULT_CURRENCY: process.env.DEFAULT_CURRENCY || 'EUR',
};

// =====================================
// Server Configuration
// =====================================

export const SERVER = {
  HOST: process.env.HOST || 'localhost',
  PORT: parseInt(process.env.PORT || '3000', 10),
  BASE_URL: process.env.NEXT_PUBLIC_APP_URL || `http://localhost:${process.env.PORT || 3000}`,
  API_VERSION: process.env.API_VERSION || 'v1',
};

// =====================================
// Database Configuration
// =====================================

export const DATABASE = {
  URL: process.env.DATABASE_URL,
  LOG_QUERIES: ENV.IS_DEVELOPMENT,
  MAX_CONNECTIONS: parseInt(process.env.DATABASE_MAX_CONNECTIONS || '10', 10),
  TIMEOUT: parseInt(process.env.DATABASE_TIMEOUT || '30000', 10), // 30 seconds
};

// =====================================
// Security Configuration
// =====================================

export const SECURITY = {
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  COOKIE_SECRET: process.env.COOKIE_SECRET,
  
  // Password
  PASSWORD_SALT_ROUNDS: parseInt(process.env.PASSWORD_SALT_ROUNDS || '10', 10),
  PASSWORD_MIN_LENGTH: parseInt(process.env.PASSWORD_MIN_LENGTH || '8', 10),
  
  // Session
  SESSION_SECRET: process.env.SESSION_SECRET,
  SESSION_EXPIRES: parseInt(process.env.SESSION_EXPIRES || '604800000', 10), // 7 days
  
  // Rate limiting
  RATE_LIMIT_ENABLED: process.env.RATE_LIMIT_ENABLED !== 'false',
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
  
  // CORS
  CORS_ORIGINS: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3001'],
  
  // CSRF
  CSRF_ENABLED: process.env.CSRF_ENABLED !== 'false',
  CSRF_COOKIE_NAME: process.env.CSRF_COOKIE_NAME || 'csrf',
  CSRF_HEADER_NAME: process.env.CSRF_HEADER_NAME || 'X-CSRF-Token',
  
  // Helmet
  HELMET_ENABLED: process.env.HELMET_ENABLED !== 'false',
};

// =====================================
// External Services
// =====================================

export const REDIS = {
  URL: process.env.REDIS_URL,
  PASSWORD: process.env.REDIS_PASSWORD,
  HOST: process.env.REDIS_HOST || 'localhost',
  PORT: parseInt(process.env.REDIS_PORT || '6379', 10),
  DB: parseInt(process.env.REDIS_DB || '0', 10),
};

export const EMAIL = {
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '587', 10),
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
  FROM: process.env.EMAIL_FROM || 'noreply@billetterie.com',
  CONTACT: process.env.CONTACT_EMAIL || 'contact@billetterie.com',
  SUPPORT: process.env.SUPPORT_EMAIL || 'support@billetterie.com',
};

export const STRIPE = {
  PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  TEST_MODE: process.env.STRIPE_TEST_MODE !== 'false',
};

// =====================================
// Feature Flags
// =====================================

export const FEATURES = {
  // Authentication
  REGISTRATION_ENABLED: process.env.FEATURE_REGISTRATION_ENABLED !== 'false',
  EMAIL_VERIFICATION_REQUIRED: process.env.FEATURE_EMAIL_VERIFICATION_REQUIRED !== 'false',
  PASSWORD_RESET_ENABLED: process.env.FEATURE_PASSWORD_RESET_ENABLED !== 'false',
  SOCIAL_LOGIN_ENABLED: process.env.FEATURE_SOCIAL_LOGIN_ENABLED === 'true',
  
  // Events
  EVENT_CREATION_ENABLED: process.env.FEATURE_EVENT_CREATION_ENABLED !== 'false',
  EVENT_CATEGORIES_ENABLED: process.env.FEATURE_EVENT_CATEGORIES_ENABLED !== 'false',
  EVENT_TAGS_ENABLED: process.env.FEATURE_EVENT_TAGS_ENABLED !== 'false',
  RECURRING_EVENTS_ENABLED: process.env.FEATURE_RECURRING_EVENTS_ENABLED === 'true',
  
  // Payments
  PAYMENT_ENABLED: process.env.FEATURE_PAYMENT_ENABLED !== 'false',
  PAYMENT_TEST_MODE: process.env.FEATURE_PAYMENT_TEST_MODE !== 'false',
  
  // Tickets
  QR_CODE_ENABLED: process.env.FEATURE_QR_CODE_ENABLED !== 'false',
  TICKET_TRANSFER_ENABLED: process.env.FEATURE_TICKET_TRANSFER_ENABLED === 'true',
  TICKET_RESALE_ENABLED: process.env.FEATURE_TICKET_RESALE_ENABLED === 'true',
  
  // Admin
  ADMIN_PANEL_ENABLED: process.env.FEATURE_ADMIN_PANEL_ENABLED !== 'false',
  
  // GDPR
  GDPR_COMPLIANCE_ENABLED: process.env.FEATURE_GDPR_ENABLED !== 'false',
  DATA_EXPORT_ENABLED: process.env.FEATURE_DATA_EXPORT_ENABLED !== 'false',
  DATA_DELETION_ENABLED: process.env.FEATURE_DATA_DELETION_ENABLED !== 'false',
};

// =====================================
// Business Constants
// =====================================

export const BUSINESS = {
  // Currencies
  SUPPORTED_CURRENCIES: ['EUR', 'USD', 'GBP'],
  DEFAULT_CURRENCY: 'EUR',
  CURRENCY_SYMBOL: '€',
  DECIMAL_PLACES: 2,
  
  // Pagination
  DEFAULT_PAGE_SIZE: parseInt(process.env.DEFAULT_PAGE_SIZE || '10', 10),
  MAX_PAGE_SIZE: parseInt(process.env.MAX_PAGE_SIZE || '100', 10),
  
  // Upload limits
  UPLOAD_MAX_SIZE: parseInt(process.env.UPLOAD_MAX_SIZE || '5242880', 10), // 5MB
  UPLOAD_ALLOWED_TYPES: (process.env.UPLOAD_ALLOWED_TYPES || 'image/jpeg,image/png,image/gif,application/pdf').split(','),
  
  // Event categories
  EVENT_CATEGORIES: [
    'Concert',
    'Festival', 
    'Théâtre',
    'Cinéma',
    'Sport',
    'Conférence',
    'Exposition',
    'Atelier',
    'Gastronomie',
    'Autre'
  ],
  
  // Ticket types
  TICKET_TYPES: [
    'Standard',
    'VIP',
    'Early Bird',
    'Groupe',
    'Étudiant',
    'Enfant',
    'Senior'
  ],
};

// =====================================
// Monitoring Configuration
// =====================================

export const MONITORING = {
  LOGGING_ENABLED: process.env.MONITORING_LOGGING_ENABLED !== 'false',
  LOG_LEVEL: process.env.MONITORING_LOG_LEVEL || 'info',
  METRICS_ENABLED: process.env.MONITORING_METRICS_ENABLED === 'true',
  TRACING_ENABLED: process.env.MONITORING_TRACING_ENABLED === 'true',
  HEALTH_CHECK_ENABLED: process.env.MONITORING_HEALTH_CHECK_ENABLED !== 'false',
};

// =====================================
// Cache Configuration
// =====================================

export const CACHE = {
  ENABLED: process.env.CACHE_ENABLED !== 'false',
  TTL: parseInt(process.env.CACHE_TTL || '3600', 10), // 1 hour
  PREFIX: process.env.CACHE_PREFIX || 'mc-society:',
  CHECK_PERIOD: parseInt(process.env.CACHE_CHECK_PERIOD || '600', 10), // 10 minutes
};

// =====================================
// Routes Configuration
// =====================================

export const ROUTES = {
  // Public routes
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  VERIFY_EMAIL: '/verify-email',
  EVENTS: '/events',
  
  // User routes
  PROFILE: '/profile',
  ORDERS: '/orders',
  TICKETS: '/tickets',
  
  // API routes
  API: {
    AUTH: {
      LOGIN: '/api/auth/login',
      REGISTER: '/api/auth/register',
      LOGOUT: '/api/auth/logout',
      ME: '/api/auth/me',
      FORGOT_PASSWORD: '/api/auth/forgot-password',
      RESET_PASSWORD: '/api/auth/reset-password',
      VERIFY_EMAIL: '/api/auth/verify-email',
    },
    USERS: '/api/users',
    EVENTS: '/api/events',
    TICKETS: '/api/tickets',
    ORDERS: '/api/orders',
    PAYMENTS: '/api/payments',
    WEBHOOK: '/api/webhook',
  },
  
  // Admin routes
  ADMIN: {
    DASHBOARD: '/admin',
    USERS: '/admin/users',
    EVENTS: '/admin/events',
    ORDERS: '/admin/orders',
    PAYMENTS: '/admin/payments',
    SETTINGS: '/admin/settings',
  },
};

// =====================================
// Validation Functions
// =====================================

export function validateRequiredEnvVars(): { valid: boolean; missing: string[] } {
  const required = [
    'DATABASE_URL',
    'JWT_SECRET',
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  return {
    valid: missing.length === 0,
    missing
  };
}

export function validateSecurityEnvVars(): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];
  
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    warnings.push('JWT_SECRET should be at least 32 characters long');
  }
  
  if (!process.env.SESSION_SECRET) {
    warnings.push('SESSION_SECRET is not set');
  }
  
  if (ENV.IS_PRODUCTION) {
    if (!process.env.REDIS_URL) {
      warnings.push('REDIS_URL should be set in production');
    }
    
    if (FEATURES.PAYMENT_ENABLED && !process.env.STRIPE_SECRET_KEY) {
      warnings.push('STRIPE_SECRET_KEY is required when payments are enabled');
    }
  }
  
  return {
    valid: warnings.length === 0,
    warnings
  };
}

// =====================================
// Export consolidated configuration
// =====================================

export const CONFIG = {
  ENV,
  APP,
  SERVER,
  DATABASE,
  SECURITY,
  REDIS,
  EMAIL,
  STRIPE,
  FEATURES,
  BUSINESS,
  MONITORING,
  CACHE,
  ROUTES,
};

export default CONFIG;
