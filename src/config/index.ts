/**
 * 🎯 Configuration Index - Point d'entrée unifié
 * 
 * Exporte toutes les configurations de manière centralisée et cohérente.
 * Fournit des exports compatibles avec l'ancien code tout en favorisant
 * l'utilisation de la nouvelle structure.
 * 
 * @example
 * // Import recommandé (nouvelle structure)
 * import { APP_CONFIG, AUTH_CONFIG } from '@/config';
 * 
 * // Import compatible (ancien code)
 * import { APP_NAME, AUTH } from '@/config';
 * 
 * @module config
 */

import {
    APP_CONFIG,
    AUTH_CONFIG,
    CACHE_CONFIG,
    EMAIL_CONFIG,
    ENV_CONFIG,
    EVENT_CATEGORIES,
    FEATURES,
    FORMAT_CONFIG,
    MONITORING_CONFIG,
    OrderStatus,
    PAGINATION_CONFIG,
    PaymentProvider,
    PaymentStatus,
    ROUTES,
    SECURITY_CONFIG,
    TICKET_TYPES,
    UPLOAD_CONFIG,
    UserRole
} from './constants';

// ==================== Exports principaux ====================

export {
    APP_CONFIG,
    AUTH_CONFIG,
    CACHE_CONFIG,
    EMAIL_CONFIG,
    ENV_CONFIG,
    FEATURES,
    FORMAT_CONFIG,
    MONITORING_CONFIG,
    PAGINATION_CONFIG,
    ROUTES,
    SECURITY_CONFIG,
    UPLOAD_CONFIG
};

// ==================== Types et Enums ====================

    export {
        OrderStatus,
        PaymentProvider,
        PaymentStatus,
        UserRole
    };

// ==================== Données métier ====================

    export {
        EVENT_CATEGORIES,
        TICKET_TYPES
    };

// ==================== Exports de compatibilité (ancienne structure) ====================

/**
 * @deprecated Utilisez APP_CONFIG.NAME à la place
 */
export const APP_NAME = APP_CONFIG.NAME;

/**
 * @deprecated Utilisez APP_CONFIG.URL à la place
 */
export const APP_URL = APP_CONFIG.URL;

/**
 * @deprecated Utilisez APP_CONFIG.VERSION à la place
 */
export const APP_VERSION = APP_CONFIG.VERSION;

/**
 * @deprecated Utilisez AUTH_CONFIG à la place
 */
export const AUTH = AUTH_CONFIG;

/**
 * @deprecated Utilisez PAGINATION_CONFIG à la place
 */
export const PAGINATION = PAGINATION_CONFIG;

/**
 * @deprecated Utilisez FORMAT_CONFIG.DATE_FORMATS à la place
 */
export const DATE_FORMATS = FORMAT_CONFIG.DATE_FORMATS;

/**
 * @deprecated Utilisez FORMAT_CONFIG.CURRENCY à la place
 */
export const CURRENCY = FORMAT_CONFIG.CURRENCY;

/**
 * @deprecated Utilisez UPLOAD_CONFIG à la place
 */
export const UPLOAD = UPLOAD_CONFIG;

/**
 * @deprecated Utilisez EMAIL_CONFIG à la place
 */
export const EMAIL = EMAIL_CONFIG;

/**
 * @deprecated Utilisez SECURITY_CONFIG.RATE_LIMIT à la place
 */
export const RATE_LIMIT = SECURITY_CONFIG.RATE_LIMIT;

/**
 * @deprecated Utilisez CACHE_CONFIG à la place
 */
export const CACHE = CACHE_CONFIG;

// ==================== Export par défaut ====================

/**
 * Export par défaut pour compatibilité avec l'ancien code.
 * @deprecated Préférez les imports nommés directs
 */
export default {
  app: APP_CONFIG,
  auth: AUTH_CONFIG,
  cache: CACHE_CONFIG,
  email: EMAIL_CONFIG,
  env: ENV_CONFIG,
  features: FEATURES,
  format: FORMAT_CONFIG,
  monitoring: MONITORING_CONFIG,
  pagination: PAGINATION_CONFIG,
  routes: ROUTES,
  security: SECURITY_CONFIG,
  upload: UPLOAD_CONFIG,
  
  // Business constants
  eventCategories: EVENT_CATEGORIES,
  ticketTypes: TICKET_TYPES,
  
  // Enums
  UserRole,
  OrderStatus,
  PaymentStatus,
  PaymentProvider
};
