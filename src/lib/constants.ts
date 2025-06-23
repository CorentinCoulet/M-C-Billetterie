/**
 * Application constants
 */

// Application information
export const APP_NAME = process.env.APP_NAME || 'Billetterie';
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
export const APP_VERSION = '1.0.0';

// Authentication
export const AUTH = {
  JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  COOKIE_NAME: 'token',
  SESSION_EXPIRY_DAYS: 7,
  PASSWORD_RESET_EXPIRY_HOURS: 1,
  EMAIL_VERIFICATION_EXPIRY_HOURS: 24,
  SALT_ROUNDS: 10,
};

// User roles
export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
  ORGANISATEUR = 'ORGANISATEUR',
}

// Order status
export enum OrderStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}

// Payment status
export enum PaymentStatus {
  PENDING = 'PENDING',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
  PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED',
}

// Payment providers
export enum PaymentProvider {
  STRIPE = 'STRIPE',
  PAYPAL = 'PAYPAL',
}

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
};

// Date formats
export const DATE_FORMATS = {
  DEFAULT: 'DD/MM/YYYY',
  WITH_TIME: 'DD/MM/YYYY HH:mm',
  ISO: 'YYYY-MM-DD',
  ISO_WITH_TIME: 'YYYY-MM-DDTHH:mm:ss',
  MONTH_YEAR: 'MMMM YYYY',
};

// Currency
export const CURRENCY = {
  DEFAULT: 'EUR',
  SYMBOL: '€',
  DECIMAL_PLACES: 2,
};

// File upload
export const UPLOAD = {
  MAX_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
  STORAGE_PATH: process.env.UPLOAD_PATH || './public/uploads',
};

// Email
export const EMAIL = {
  FROM: process.env.EMAIL_FROM || 'noreply@billetterie.com',
  CONTACT: process.env.CONTACT_EMAIL || 'contact@billetterie.com',
  SUPPORT: process.env.SUPPORT_EMAIL || 'support@billetterie.com',
};

// API rate limiting
export const RATE_LIMIT = {
  WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  MAX_REQUESTS: 100, // limit each IP to 100 requests per windowMs
};

// Cache
export const CACHE = {
  TTL: 60 * 60, // 1 hour in seconds
  CHECK_PERIOD: 60, // 1 minute in seconds
};

// Event categories
export const EVENT_CATEGORIES = [
  'Concert',
  'Festival',
  'Théâtre',
  'Cinéma',
  'Sport',
  'Conférence',
  'Exposition',
  'Atelier',
  'Gastronomie',
  'Autre',
];

// Ticket types
export const TICKET_TYPES = [
  'Standard',
  'VIP',
  'Early Bird',
  'Groupe',
  'Étudiant',
  'Enfant',
  'Senior',
];

// Routes
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
  ADMIN: {
    DASHBOARD: '/admin',
    USERS: '/admin/users',
    EVENTS: '/admin/events',
    ORDERS: '/admin/orders',
    PAYMENTS: '/admin/payments',
    SETTINGS: '/admin/settings',
  },
  ORGANIZER: {
    DASHBOARD: '/organizer',
    EVENTS: '/organizer/events',
    CREATE_EVENT: '/organizer/events/create',
    EDIT_EVENT: (id: string) => `/organizer/events/${id}/edit`,
    TICKETS: '/organizer/tickets',
    ORDERS: '/organizer/orders',
    STATS: '/organizer/stats',
  },
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

export default {
  APP_NAME,
  APP_URL,
  API_URL,
  APP_VERSION,
  AUTH,
  UserRole,
  OrderStatus,
  PaymentStatus,
  PaymentProvider,
  PAGINATION,
  DATE_FORMATS,
  CURRENCY,
  UPLOAD,
  EMAIL,
  RATE_LIMIT,
  CACHE,
  EVENT_CATEGORIES,
  TICKET_TYPES,
  ROUTES,
};