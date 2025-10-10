import { z } from 'zod';

/**
 * Environment Variables Validation Schema
 * Validates all required environment variables at startup
 */
const envSchema = z.object({
  // Node Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // Database
  DATABASE_URL: z.string().url().startsWith('postgresql://', 'Database URL must be a PostgreSQL connection string'),
  
  // Security - MUST be 32+ chars for cryptographic security
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters for security'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters for security'),
  ENCRYPTION_KEY: z.string().min(32, 'ENCRYPTION_KEY must be at least 32 characters for security'),
  AES_SECRET: z.string().min(32, 'AES_SECRET must be at least 32 characters for security'),
  
  // JWT Configuration
  JWT_EXPIRATION: z.string().optional().default('1h'),
  JWT_REFRESH_EXPIRATION: z.string().optional().default('7d'),
  
  // Stripe Payment
  STRIPE_SECRET_KEY: z.string().startsWith('sk_', 'STRIPE_SECRET_KEY must start with sk_'),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_', 'STRIPE_WEBHOOK_SECRET must start with whsec_'),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().startsWith('pk_', 'STRIPE_PUBLISHABLE_KEY must start with pk_'),
  
  // Email Configuration
  EMAIL_HOST: z.string().min(1, 'EMAIL_HOST is required'),
  EMAIL_PORT: z.coerce.number().int().positive('EMAIL_PORT must be a positive integer'),
  EMAIL_USER: z.string().email('EMAIL_USER must be a valid email address'),
  EMAIL_PASSWORD: z.string().min(1, 'EMAIL_PASSWORD is required'),
  EMAIL_FROM: z.string().email('EMAIL_FROM must be a valid email address'),
  EMAIL_SECURE: z.coerce.boolean().optional().default(true),
  
  // Application URLs
  NEXT_PUBLIC_APP_URL: z.string().url('NEXT_PUBLIC_APP_URL must be a valid URL'),
  
  // Redis (optional for caching)
  REDIS_URL: z.string().url('REDIS_URL must be a valid URL').optional(),
  
  // Monitoring & Error Tracking (optional)
  NEXT_PUBLIC_SENTRY_DSN: z.string().url('SENTRY_DSN must be a valid URL').optional(),
  SENTRY_ORG: z.string().optional(),
  SENTRY_PROJECT: z.string().optional(),
  SENTRY_AUTH_TOKEN: z.string().optional(),
  
  // QR Code Configuration (optional)
  QR_CODE_SIZE: z.coerce.number().int().positive().optional().default(200),
  QR_CODE_MARGIN: z.coerce.number().int().positive().optional().default(4),
  QR_ROTATION_INTERVAL_HOURS: z.coerce.number().int().positive().optional().default(24),
  
  // Rate Limiting (optional)
  RATE_LIMIT_MAX: z.coerce.number().int().positive().optional().default(100),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().optional().default(900000), // 15 minutes
  
  // File Upload (optional)
  MAX_FILE_SIZE: z.coerce.number().int().positive().optional().default(5242880), // 5MB
  UPLOAD_DIR: z.string().optional().default('./uploads'),
});

/**
 * Parse and validate environment variables
 * This will throw an error if any required variable is missing or invalid
 */
export const env = envSchema.parse(process.env);

/**
 * Type-safe environment variables
 */
export type Env = z.infer<typeof envSchema>;

/**
 * Validate environment on module load (will throw if invalid)
 * This ensures the app won't start with invalid configuration
 */
if (typeof window === 'undefined') {
  try {
    envSchema.parse(process.env);
    console.log('✅ Environment variables validated successfully');
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Invalid environment variables:');
      error.errors.forEach(err => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
      throw new Error('Environment validation failed. Please check your .env file.');
    }
    throw error;
  }
}
