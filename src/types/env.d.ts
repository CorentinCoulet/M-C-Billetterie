declare global {
  namespace NodeJS {
    interface ProcessEnv {
      // Core
      NODE_ENV: 'development' | 'production' | 'test';
      PORT?: string;
      
      // Database
      DATABASE_URL: string;
      
      // Authentication & Security
      JWT_SECRET: string;
      JWT_EXPIRES_IN?: string;
      ENCRYPTION_KEY: string;
      SESSION_SECRET: string;
      BCRYPT_SALT_ROUNDS?: string;
      MFA_SECRET?: string;
      
      // Stripe Payment
      STRIPE_SECRET_KEY?: string;
      STRIPE_PUBLISHABLE_KEY?: string;
      STRIPE_WEBHOOK_SECRET?: string;
      STRIPE_CURRENCY?: string;
      STRIPE_API_VERSION?: string;
      STRIPE_DEFAULT_API_VERSION?: string;
      STRIPE_SUPPORTED_VERSIONS?: string;
      STRIPE_DEFAULT_CURRENCY?: string;
      STRIPE_SUPPORTED_CURRENCIES?: string;
      STRIPE_WEBHOOK_TOLERANCE?: string;
      STRIPE_MAX_RETRIES?: string;
      STRIPE_RETRY_DELAY?: string;
      STRIPE_MAX_PROCESSED_EVENTS?: string;
      STRIPE_CACHE_CLEANUP_SIZE?: string;
      STRIPE_CACHE_CLEANUP_INTERVAL?: string;
      
      // Email
      EMAIL_FROM?: string;
      CONTACT_EMAIL?: string;
      SMTP_HOST?: string;
      SMTP_PORT?: string;
      SMTP_USER?: string;
      SMTP_PASS?: string;
      
      // URLs
      NEXT_PUBLIC_APP_URL?: string;
      
      // Feature Flags
      FEATURE_AUTH_ENABLED?: string;
      FEATURE_PAYMENTS_ENABLED?: string;
      FEATURE_EMAIL_ENABLED?: string;
      
      // File Upload
      UPLOAD_BASE_DIR?: string;
      MAX_FILE_SIZE?: string;
      
      // Cache & Performance
      CACHE_ENABLED?: string;
      CACHE_TTL?: string;
      
      // Rate Limiting
      RATE_LIMIT_WINDOW_MS?: string;
      RATE_LIMIT_MAX_REQUESTS?: string;
      
      // Monitoring & Observability
      NEXT_PUBLIC_SENTRY_DSN?: string;
      SENTRY_RELEASE?: string;
      SENTRY_ENVIRONMENT?: string;
      SENTRY_DEBUG?: string;
      PROMETHEUS_ENABLED?: string;
      PROMETHEUS_PORT?: string;
      GRAFANA_ENABLED?: string;
      GRAFANA_PORT?: string;
      GRAFANA_ADMIN_USER?: string;
      GRAFANA_ADMIN_PASSWORD?: string;
      
      // Security
      HELMET_ENABLED?: string;
      CORS_ENABLED?: string;
    }
  }
}

export { };

