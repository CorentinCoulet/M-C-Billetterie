/**
 * General application configuration
 */

// Environment configuration
export const ENV = {
  // Node environment
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // Is production environment
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
  
  // Is development environment
  IS_DEVELOPMENT: process.env.NODE_ENV === 'development',
  
  // Is test environment
  IS_TEST: process.env.NODE_ENV === 'test',
};

// Server configuration
export const SERVER = {
  // Host
  HOST: process.env.HOST || 'localhost',
  
  // Port
  PORT: parseInt(process.env.PORT || '3000', 10),
  
  // Base URL
  BASE_URL: process.env.NEXT_PUBLIC_APP_URL || `http://localhost:${process.env.PORT || 3000}`,
  
  // API URL
  API_URL: process.env.NEXT_PUBLIC_API_URL || `http://localhost:${process.env.PORT || 3000}/api`,
  
  // API version
  API_VERSION: process.env.API_VERSION || 'v1',
};

// Application configuration
export const APP = {
  // Application name
  NAME: process.env.APP_NAME || 'M&C Society Ticketing',
  
  // Application version
  VERSION: process.env.npm_package_version || '1.0.0',
  
  // Default locale
  DEFAULT_LOCALE: process.env.DEFAULT_LOCALE || 'fr',
  
  // Supported locales
  SUPPORTED_LOCALES: (process.env.SUPPORTED_LOCALES || 'fr,en').split(','),
  
  // Default timezone
  DEFAULT_TIMEZONE: process.env.DEFAULT_TIMEZONE || 'Europe/Paris',
  
  // Default currency
  DEFAULT_CURRENCY: process.env.DEFAULT_CURRENCY || 'EUR',
  
  // Default page size for pagination
  DEFAULT_PAGE_SIZE: parseInt(process.env.DEFAULT_PAGE_SIZE || '10', 10),
  
  // Maximum page size for pagination
  MAX_PAGE_SIZE: parseInt(process.env.MAX_PAGE_SIZE || '100', 10),
};

// Security configuration
export const SECURITY = {
  // CSRF protection
  CSRF: {
    ENABLED: process.env.CSRF_ENABLED !== 'false',
    COOKIE_NAME: process.env.CSRF_COOKIE_NAME || 'csrf',
    HEADER_NAME: process.env.CSRF_HEADER_NAME || 'X-CSRF-Token',
  },
  
  // Content Security Policy
  CSP: {
    ENABLED: process.env.CSP_ENABLED !== 'false',
    REPORT_ONLY: process.env.CSP_REPORT_ONLY === 'true',
  },
  
  // Rate limiting
  RATE_LIMIT: {
    ENABLED: process.env.RATE_LIMIT_ENABLED !== 'false',
    MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10), // 1 minute
  },
};

// Feature flags
export const FEATURES = {
  // User features
  USER: {
    REGISTRATION_ENABLED: process.env.FEATURE_USER_REGISTRATION_ENABLED !== 'false',
    EMAIL_VERIFICATION_REQUIRED: process.env.FEATURE_USER_EMAIL_VERIFICATION_REQUIRED !== 'false',
    PASSWORD_RESET_ENABLED: process.env.FEATURE_USER_PASSWORD_RESET_ENABLED !== 'false',
    SOCIAL_LOGIN_ENABLED: process.env.FEATURE_USER_SOCIAL_LOGIN_ENABLED === 'true',
  },
  
  // Payment features
  PAYMENT: {
    ENABLED: process.env.FEATURE_PAYMENT_ENABLED !== 'false',
    TEST_MODE: process.env.FEATURE_PAYMENT_TEST_MODE !== 'false',
    CURRENCIES: (process.env.FEATURE_PAYMENT_CURRENCIES || 'EUR').split(','),
    METHODS: (process.env.FEATURE_PAYMENT_METHODS || 'card').split(','),
  },
  
  // Event features
  EVENT: {
    CREATION_ENABLED: process.env.FEATURE_EVENT_CREATION_ENABLED !== 'false',
    CATEGORIES_ENABLED: process.env.FEATURE_EVENT_CATEGORIES_ENABLED !== 'false',
    TAGS_ENABLED: process.env.FEATURE_EVENT_TAGS_ENABLED !== 'false',
    RECURRING_ENABLED: process.env.FEATURE_EVENT_RECURRING_ENABLED === 'true',
  },
  
  // Ticket features
  TICKET: {
    QR_CODE_ENABLED: process.env.FEATURE_TICKET_QR_CODE_ENABLED !== 'false',
    TRANSFER_ENABLED: process.env.FEATURE_TICKET_TRANSFER_ENABLED === 'true',
    RESALE_ENABLED: process.env.FEATURE_TICKET_RESALE_ENABLED === 'true',
  },
};

// Cache configuration
export const CACHE = {
  // Enable caching
  ENABLED: process.env.CACHE_ENABLED !== 'false',
  
  // Cache TTL (in seconds)
  TTL: parseInt(process.env.CACHE_TTL || '3600', 10), // 1 hour
  
  // Cache prefix
  PREFIX: process.env.CACHE_PREFIX || 'mc-society:',
};

// Monitoring configuration
export const MONITORING = {
  // Enable logging
  LOGGING_ENABLED: process.env.MONITORING_LOGGING_ENABLED !== 'false',
  
  // Log level
  LOG_LEVEL: process.env.MONITORING_LOG_LEVEL || 'info',
  
  // Enable metrics
  METRICS_ENABLED: process.env.MONITORING_METRICS_ENABLED === 'true',
  
  // Enable tracing
  TRACING_ENABLED: process.env.MONITORING_TRACING_ENABLED === 'true',
};

// Export all configurations
export default {
  ENV,
  SERVER,
  APP,
  SECURITY,
  FEATURES,
  CACHE,
  MONITORING,
};