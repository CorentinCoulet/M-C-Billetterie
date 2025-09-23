import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.string().default('3001').transform(Number),
  DATABASE_URL: z.string().min(1),
  
  // Security
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('7d'),
  ENCRYPTION_KEY: z.string().min(32),
  SESSION_SECRET: z.string().default('session-secret'),
  
  // Auth
  BCRYPT_SALT_ROUNDS: z.string().default('12').transform(Number),
  MFA_SECRET: z.string().optional(),
  
  // Stripe
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_CURRENCY: z.string().default('eur'),
  
  // Email
  EMAIL_FROM: z.string().default('noreply@billetterie.com'),
  CONTACT_EMAIL: z.string().default('contact@billetterie.com'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().default('587').transform(Number),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  
  // URLs
  NEXT_PUBLIC_APP_URL: z.string().default('http://localhost:3000'),
  
  // Features
  FEATURE_AUTH_ENABLED: z.string().default('true').transform(val => val !== 'false'),
  FEATURE_PAYMENTS_ENABLED: z.string().default('true').transform(val => val !== 'false'),
  FEATURE_EMAIL_ENABLED: z.string().default('true').transform(val => val !== 'false'),
  
  // Upload
  UPLOAD_BASE_DIR: z.string().optional(),
  MAX_FILE_SIZE: z.string().default('5242880').transform(Number), // 5MB
  
  // Cache
  CACHE_ENABLED: z.string().default('true').transform(val => val !== 'false'),
  CACHE_TTL: z.string().default('3600').transform(Number),
  
  // Rate limiting
  RATE_LIMIT_WINDOW_MS: z.string().default('900000').transform(Number), // 15min
  RATE_LIMIT_MAX_REQUESTS: z.string().default('100').transform(Number),
  
  // Security
  HELMET_ENABLED: z.string().default('true').transform(val => val !== 'false'),
  CORS_ENABLED: z.string().default('true').transform(val => val !== 'false'),
});

// Validation et parsing de l'environnement
const env = envSchema.parse(process.env);

// Configuration unifiée
export const CONFIG = {
  // Environment
  ENV: env.NODE_ENV,
  IS_DEVELOPMENT: env.NODE_ENV === 'development',
  IS_PRODUCTION: env.NODE_ENV === 'production',
  IS_TEST: env.NODE_ENV === 'test',
  
  // Server
  SERVER: {
    PORT: env.PORT,
  },
  
  // Database
  DATABASE: {
    URL: env.DATABASE_URL,
  },
  
  // Authentication
  AUTH: {
    JWT_SECRET: env.JWT_SECRET,
    JWT_EXPIRES_IN: env.JWT_EXPIRES_IN,
    BCRYPT_SALT_ROUNDS: env.BCRYPT_SALT_ROUNDS,
    SESSION_SECRET: env.SESSION_SECRET,
    MFA_SECRET: env.MFA_SECRET,
  },
  
  // Security
  SECURITY: {
    ENCRYPTION_KEY: env.ENCRYPTION_KEY,
    HELMET_ENABLED: env.HELMET_ENABLED && env.NODE_ENV === 'production',
    CORS_ENABLED: env.CORS_ENABLED,
  },
  
  // Stripe Payment
  STRIPE: {
    SECRET_KEY: env.STRIPE_SECRET_KEY || 'sk_test_your_test_key',
    PUBLIC_KEY: env.STRIPE_PUBLISHABLE_KEY || 'pk_test_your_test_key',
    WEBHOOK_SECRET: env.STRIPE_WEBHOOK_SECRET || 'whsec_your_webhook_secret',
    CURRENCY: env.STRIPE_CURRENCY,
    PAYMENT_METHODS: ['card'],
    SUCCESS_URL: `${env.NEXT_PUBLIC_APP_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    CANCEL_URL: `${env.NEXT_PUBLIC_APP_URL}/checkout/cancel?session_id={CHECKOUT_SESSION_ID}`,
    AUTO_TAX: false,
    PAYMENT_INTENT_EXPIRATION: 30 * 60, // 30 minutes
    METADATA: {
      ORDER_ID: 'order_id',
      USER_ID: 'user_id',
      EVENT_ID: 'event_id',
    },
  },
  
  // Email
  EMAIL: {
    FROM: env.EMAIL_FROM,
    CONTACT: env.CONTACT_EMAIL,
    SMTP: {
      HOST: env.SMTP_HOST,
      PORT: env.SMTP_PORT,
      USER: env.SMTP_USER,
      PASS: env.SMTP_PASS,
    },
  },
  
  // Features
  FEATURES: {
    AUTH: env.FEATURE_AUTH_ENABLED,
    PAYMENTS: env.FEATURE_PAYMENTS_ENABLED,
    EMAIL: env.FEATURE_EMAIL_ENABLED,
  },
  
  // Upload
  UPLOAD: {
    BASE_DIR: env.UPLOAD_BASE_DIR || './public/uploads',
    MAX_SIZE: env.MAX_FILE_SIZE,
    ALLOWED_TYPES: {
      IMAGE: ['image/jpeg', 'image/png', 'image/webp'],
      DOCUMENT: ['application/pdf'],
    },
    PATHS: {
      EVENTS: 'events',
      USERS: 'users',
      TICKETS: 'tickets',
      TEMP: 'temp',
    },
  },
  
  // Cache
  CACHE: {
    ENABLED: env.CACHE_ENABLED,
    TTL: env.CACHE_TTL,
    PREFIX: 'billetterie:',
  },
  
  // Rate limiting
  RATE_LIMIT: {
    WINDOW_MS: env.RATE_LIMIT_WINDOW_MS,
    MAX_REQUESTS: env.RATE_LIMIT_MAX_REQUESTS,
  },
  
  // Event categories
  EVENT_CATEGORIES: [
    'Concert',
    'Theatre',
    'Sport',
    'Conference',
    'Festival',
    'Exhibition',
    'Cinema',
    'Other',
  ] as const,
  
  // URLs
  URLS: {
    APP: env.NEXT_PUBLIC_APP_URL,
  },
} as const;

// Types dérivés
export type EventCategory = typeof CONFIG.EVENT_CATEGORIES[number];
export type Environment = typeof CONFIG.ENV;

// Export par défaut
export default CONFIG;
