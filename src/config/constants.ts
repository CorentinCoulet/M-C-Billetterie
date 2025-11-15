/**
 * 🎯 Application Constants - Configuration unifiée
 * 
 * Point central pour toutes les constantes de configuration de l'application.
 * Remplace les anciens fichiers éparpillés (src/lib/constants.ts, src/config/app.ts)
 * 
 * @module config/constants
 */

// ==================== Application Information ====================
export const APP_CONFIG = {
  NAME: process.env.APP_NAME || 'M&C Society Ticketing',
  VERSION: process.env.VERSION || process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
  URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api',
  DEFAULT_LOCALE: process.env.DEFAULT_LOCALE || 'en',
  SUPPORTED_LOCALES: (process.env.SUPPORTED_LOCALES || 'en,fr').split(','),
  DEFAULT_TIMEZONE: process.env.DEFAULT_TIMEZONE || 'Europe/Paris',
  DEFAULT_CURRENCY: process.env.DEFAULT_CURRENCY || 'EUR',
};

// ==================== User Roles & Status ====================
export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
  ORGANISATEUR = 'ORGANISATEUR',
}

export enum OrderStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
  PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED',
}

export enum PaymentProvider {
  STRIPE = 'STRIPE',
  PAYPAL = 'PAYPAL',
}

// ==================== Authentication ====================
export const AUTH_CONFIG = {
  JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  COOKIE_NAME: 'token',
  SESSION_EXPIRY_DAYS: 7,
  PASSWORD_RESET_EXPIRY_HOURS: 1,
  EMAIL_VERIFICATION_EXPIRY_HOURS: 24,
  SALT_ROUNDS: 10,
  PASSWORD: {
    MIN_LENGTH: 8,
    STRENGTH_REGEX: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    STRENGTH_MESSAGE: 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character'
  },
};

// ==================== Pagination & Limits ====================
export const PAGINATION_CONFIG = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
  DEFAULT_PAGE_SIZE: parseInt(process.env.DEFAULT_PAGE_SIZE || '10', 10),
  MAX_PAGE_SIZE: parseInt(process.env.MAX_PAGE_SIZE || '100', 10),
};

// ==================== Date & Currency ====================
export const FORMAT_CONFIG = {
  DATE_FORMATS: {
    DEFAULT: 'DD/MM/YYYY',
    WITH_TIME: 'DD/MM/YYYY HH:mm',
    ISO: 'YYYY-MM-DD',
    ISO_WITH_TIME: 'YYYY-MM-DDTHH:mm:ss',
    MONTH_YEAR: 'MMMM YYYY',
  },
  CURRENCY: {
    DEFAULT: 'EUR',
    SYMBOL: '€',
    DECIMAL_PLACES: 2,
  },
};

// ==================== File Upload ====================
export const UPLOAD_CONFIG = {
  MAX_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
  STORAGE_PATH: process.env.UPLOAD_PATH || './public/uploads',
  PATHS: {
    BASE: process.env.UPLOAD_BASE_PATH || './public/uploads',
    EVENTS: 'events',
    USERS: 'users',
    VENUES: 'venues',
    TICKETS: 'tickets',
    TEMP: 'temp'
  }
};

// ==================== Email ====================
export const EMAIL_CONFIG = {
  FROM: process.env.EMAIL_FROM || 'noreply@ticketing.com',
  CONTACT: process.env.CONTACT_EMAIL || 'contact@ticketing.com',
  SUPPORT: process.env.SUPPORT_EMAIL || 'support@ticketing.com',
  FROM_NAME: process.env.EMAIL_FROM_NAME || 'M&C Society',
  TEMPLATES_DIR: 'src/templates/emails',
  SUBJECTS: {
    WELCOME: 'Welcome to M&C Society',
    EMAIL_VERIFICATION: 'Verify your email',
    PASSWORD_RESET: 'Reset your password',
    ORDER_CONFIRMATION: 'Order confirmation',
    TICKET_PURCHASE: 'Your tickets',
  }
};

// ==================== Rate Limiting & Security ====================
export const SECURITY_CONFIG = {
  RATE_LIMIT: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: 100, // limit each IP to 100 requests per windowMs
    ENABLED: process.env.RATE_LIMIT_ENABLED !== 'false',
  },
  CSRF: {
    ENABLED: process.env.CSRF_ENABLED !== 'false',
    COOKIE_NAME: process.env.CSRF_COOKIE_NAME || 'csrf',
    HEADER_NAME: process.env.CSRF_HEADER_NAME || 'X-CSRF-Token',
  },
  CSP: {
    ENABLED: process.env.CSP_ENABLED !== 'false',
    REPORT_ONLY: process.env.CSP_REPORT_ONLY === 'true',
  },
};

// ==================== Cache ====================
export const CACHE_CONFIG = {
  TTL: 60 * 60, // 1 hour in seconds
  CHECK_PERIOD: 60, // 1 minute in seconds
  ENABLED: process.env.CACHE_ENABLED !== 'false',
  PREFIX: process.env.CACHE_PREFIX || 'mc-society:',
};

// ==================== Business Logic ====================
export const EVENT_CATEGORIES = [
  'Concert',
  'Festival',
  'Theater',
  'Cinema',
  'Sport',
  'Conference',
  'Exhibition',
  'Workshop',
  'Gastronomy',
  'Other',
];

export const TICKET_TYPES = [
  'Standard',
  'VIP',
  'Early Bird',
  'Group',
  'Student',
  'Child',
  'Senior',
];

// ==================== Routes ====================
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  VERIFY_EMAIL: '/verify-email',
  PROFILE: '/profile',
  EVENTS: '/events',
  EVENT_DETAILS: (id: string) => `/events/${id}`,
  CHECKOUT: '/checkout',
  ORDERS: '/orders',
  ORDER_DETAILS: (id: string) => `/orders/${id}`,
  TICKETS: '/tickets',
  
  // Admin routes
  ADMIN: {
    DASHBOARD: '/admin',
    USERS: '/admin/users',
    EVENTS: '/admin/events',
    ORDERS: '/admin/orders',
    PAYMENTS: '/admin/payments',
    SETTINGS: '/admin/settings',
  },
  
  // Organizer routes
  ORGANIZER: {
    // L'espace organisateur est servi sous /dashboard (rétro-compatibilité avec /organizer via redirections)
    DASHBOARD: '/dashboard',
    EVENTS: '/dashboard/events',
    CREATE_EVENT: '/dashboard/events/new',
    EDIT_EVENT: (id: string) => `/dashboard/events/${id}/edit`,
    TICKETS: '/dashboard/tickets',
    ORDERS: '/dashboard/orders',
    STATS: '/dashboard/stats',
  },
  
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
};

// ==================== Feature Flags ====================
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

// ==================== Environment Config ====================
export const ENV_CONFIG = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
  IS_DEVELOPMENT: process.env.NODE_ENV === 'development',
  IS_TEST: process.env.NODE_ENV === 'test',
  HOST: process.env.HOST || 'localhost',
  PORT: parseInt(process.env.PORT || '3000', 10),
};

// ==================== Monitoring ====================
export const MONITORING_CONFIG = {
  LOGGING_ENABLED: process.env.MONITORING_LOGGING_ENABLED !== 'false',
  LOG_LEVEL: process.env.MONITORING_LOG_LEVEL || 'info',
  METRICS_ENABLED: process.env.MONITORING_METRICS_ENABLED === 'true',
  TRACING_ENABLED: process.env.MONITORING_TRACING_ENABLED === 'true',
};

// ==================== Default Export for Compatibility ====================
export default {
  APP_CONFIG,
  AUTH_CONFIG,
  PAGINATION_CONFIG,
  FORMAT_CONFIG,
  UPLOAD_CONFIG,
  EMAIL_CONFIG,
  SECURITY_CONFIG,
  CACHE_CONFIG,
  ROUTES,
  FEATURES,
  ENV_CONFIG,
  MONITORING_CONFIG,
  // Types/Enums
  UserRole,
  OrderStatus,
  PaymentStatus,
  PaymentProvider,
  // Business data
  EVENT_CATEGORIES,
  TICKET_TYPES,
};
