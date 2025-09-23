/**
 * Stripe Configuration Constants
 * Centralized place for all Stripe-related configuration
 */

// Get supported API versions from environment or use defaults
const getSupportedApiVersions = (): readonly string[] => {
  const envVersions = process.env.STRIPE_SUPPORTED_VERSIONS;
  if (envVersions) {
    return envVersions.split(',').map(v => v.trim());
  }
  
  // Default supported versions (fallback)
  return [
    '2025-06-30.basil', // Latest version supported by current Stripe SDK
    '2024-06-20',
    '2024-04-10', 
    '2024-02-15',
    '2023-10-16',
  ];
};

export const SUPPORTED_STRIPE_API_VERSIONS = getSupportedApiVersions();

export type StripeApiVersion = string;

// Get default API version from environment or use the first supported version
export const getDefaultApiVersion = (): string => {
  const envDefault = process.env.STRIPE_DEFAULT_API_VERSION;
  if (envDefault) {
    return envDefault;
  }
  
  // Use the first (most recent) supported version as default
  return SUPPORTED_STRIPE_API_VERSIONS[0];
};

// Get Stripe API version from environment or use default
export const getStripeApiVersion = (): string => {
  const envVersion = process.env.STRIPE_API_VERSION;
  const defaultVersion = getDefaultApiVersion();
  
  if (envVersion && SUPPORTED_STRIPE_API_VERSIONS.includes(envVersion)) {
    return envVersion;
  }
  
  if (envVersion) {
    console.warn(`⚠️ Unsupported Stripe API version: ${envVersion}. Using default: ${defaultVersion}`);
  }
  
  return defaultVersion;
};

// Stripe configuration options with environment variable support
export const STRIPE_CONFIG = {
  // Webhook settings
  WEBHOOK_TOLERANCE: parseInt(process.env.STRIPE_WEBHOOK_TOLERANCE || '300'), // 5 minutes default
  
  // Retry settings
  MAX_RETRIES: parseInt(process.env.STRIPE_MAX_RETRIES || '3'),
  RETRY_DELAY: parseInt(process.env.STRIPE_RETRY_DELAY || '1000'), // 1 second default
  
  // Cache settings
  MAX_PROCESSED_EVENTS: parseInt(process.env.STRIPE_MAX_PROCESSED_EVENTS || '1000'),
  CACHE_CLEANUP_SIZE: parseInt(process.env.STRIPE_CACHE_CLEANUP_SIZE || '500'),
  CACHE_CLEANUP_INTERVAL: parseInt(process.env.STRIPE_CACHE_CLEANUP_INTERVAL || '3600000'), // 1 hour default
  
  // Currency settings
  DEFAULT_CURRENCY: (process.env.STRIPE_DEFAULT_CURRENCY || 'EUR').toUpperCase(),
  SUPPORTED_CURRENCIES: (process.env.STRIPE_SUPPORTED_CURRENCIES || 'EUR,USD,GBP')
    .split(',')
    .map(c => c.trim().toUpperCase()) as readonly string[],
} as const;

export type SupportedCurrency = string;

/**
 * Validate Stripe configuration
 */
export const validateStripeConfig = () => {
  const config = {
    apiVersion: getStripeApiVersion(),
    defaultCurrency: STRIPE_CONFIG.DEFAULT_CURRENCY,
    supportedCurrencies: STRIPE_CONFIG.SUPPORTED_CURRENCIES,
    webhookTolerance: STRIPE_CONFIG.WEBHOOK_TOLERANCE,
    maxRetries: STRIPE_CONFIG.MAX_RETRIES,
    cacheSettings: {
      maxEvents: STRIPE_CONFIG.MAX_PROCESSED_EVENTS,
      cleanupSize: STRIPE_CONFIG.CACHE_CLEANUP_SIZE,
      cleanupInterval: STRIPE_CONFIG.CACHE_CLEANUP_INTERVAL,
    }
  };

  console.log('🔧 Stripe Configuration:', {
    apiVersion: config.apiVersion,
    defaultCurrency: config.defaultCurrency,
    supportedCurrencies: config.supportedCurrencies.slice(0, 3), // Show first 3
    cacheMaxEvents: config.cacheSettings.maxEvents,
  });

  return config;
};

/**
 * Get Stripe configuration as a ready-to-use object
 */
export const getStripeConfig = () => ({
  apiVersion: getStripeApiVersion(),
  ...STRIPE_CONFIG,
});
