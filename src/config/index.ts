/**
 * Configuration index file - Point d'entrée unifié
 * Exporte toutes les configurations de manière centralisée
 */

// Import des configurations unifiées
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

// Import des configurations spécialisées existantes (si disponibles)
// import { EMAIL_CONFIG as OLD_EMAIL_CONFIG } from './email';
// import { STRIPE_CONFIG } from './stripe';

// ==================== Exports unifiés ====================

// Configuration principale
export {
    APP_CONFIG,
    AUTH_CONFIG, CACHE_CONFIG, ENV_CONFIG, FEATURES, FORMAT_CONFIG, MONITORING_CONFIG, PAGINATION_CONFIG, ROUTES, SECURITY_CONFIG, UPLOAD_CONFIG
};

// Types et enums
    export {
        OrderStatus, PaymentProvider, PaymentStatus, UserRole
    };

// Données métier
    export {
        EVENT_CATEGORIES,
        TICKET_TYPES
    };

// Configurations spécialisées (pour compatibilité descendante)
// export { STRIPE_CONFIG }; // À décommenter quand le fichier sera créé

// Configuration email unifiée (temporaire - sera mergée plus tard)
export const UNIFIED_EMAIL_CONFIG = EMAIL_CONFIG;

// ==================== Exports de compatibilité ====================

// Pour les imports existants de type: import { constante } from 'config'
export const {
  // App config
  NAME: APP_NAME,
  URL: APP_URL,
  VERSION: APP_VERSION,
} = APP_CONFIG;

// Auth constants pour compatibilité
export const AUTH = AUTH_CONFIG;

// Routes pour compatibilité (éviter duplication)
// export { ROUTES }; // Déjà exporté plus haut

// Pagination pour compatibilité
export const PAGINATION = PAGINATION_CONFIG;

// Date formats pour compatibilité
export const DATE_FORMATS = FORMAT_CONFIG.DATE_FORMATS;
export const CURRENCY = FORMAT_CONFIG.CURRENCY;

// Upload pour compatibilité
export const UPLOAD = UPLOAD_CONFIG;

// Email pour compatibilité
export const EMAIL = {
  ...EMAIL_CONFIG,
  ...UNIFIED_EMAIL_CONFIG
};

// Security pour compatibilité
export const RATE_LIMIT = SECURITY_CONFIG.RATE_LIMIT;

// Cache pour compatibilité
export const CACHE = CACHE_CONFIG;

// ==================== Export par défaut ====================
export default {
  // Configurations principales
  app: APP_CONFIG,
  auth: AUTH_CONFIG,
  pagination: PAGINATION_CONFIG,
  format: FORMAT_CONFIG,
  upload: UPLOAD_CONFIG,
  email: UNIFIED_EMAIL_CONFIG,
  security: SECURITY_CONFIG,
  // Configuration spécialisées (temporaire)
  // stripe: STRIPE_CONFIG, // À décommenter quand disponible
  
  // Data
  routes: ROUTES,
  features: FEATURES,
  env: ENV_CONFIG,
  monitoring: MONITORING_CONFIG,
  
  // Business constants
  eventCategories: EVENT_CATEGORIES,
  ticketTypes: TICKET_TYPES,
  
  // Enums
  UserRole,
  OrderStatus,
  PaymentStatus,
  PaymentProvider
};
