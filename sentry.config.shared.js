/**
 * Configuration Sentry partagée
 */

// Configuration de base partagée
export const baseSentryConfig = {
  // Conditional DSN loading
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Environment et release
  environment: process.env.NODE_ENV || 'development',
  release: process.env.SENTRY_RELEASE || 'billetterie@1.0.0',
  
  // Debug en développement uniquement
  debug: process.env.NODE_ENV === 'development',
  
  // Filtre de données sensibles
  beforeSend(event) {
    // Supprimer les informations sensibles
    if (event.request?.headers) {
      delete event.request.headers['authorization'];
      delete event.request.headers['cookie'];
      delete event.request.headers['x-api-key'];
    }
    
    // Ne pas envoyer d'événements en test
    if (process.env.NODE_ENV === 'test') {
      return null;
    }
    
    return event;
  },
  
  // Erreurs à ignorer (communes à tous les environnements)
  ignoreErrors: [
    'ResizeObserver loop limit exceeded',
    'Non-Error promise rejection captured',
    'ChunkLoadError',
    'Loading chunk',
    'Network request failed',
    'AbortError',
    'NetworkError',
  ],
};

// Configuration d'échantillonnage par environnement
export const getSampleRates = (runtime = 'client') => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  const rates = {
    client: {
      traces: isProduction ? 0.1 : 1.0,
      replaysSession: isProduction ? 0.01 : 0.1,
      replaysError: isProduction ? 0.1 : 1.0,
      profiles: isProduction ? 0.1 : 1.0,
    },
    server: {
      traces: isProduction ? 0.1 : 1.0,
      profiles: isProduction ? 0.1 : 1.0,
    },
    edge: {
      traces: isProduction ? 0.05 : 1.0,
    }
  };
  
  return rates[runtime] || rates.client;
};

// Échantillonnage intelligent des traces
export const createTracesSampler = (runtime = 'client') => {
  return (samplingContext) => {
    const url = samplingContext.request?.url || samplingContext.location?.pathname;
    
    // Ne pas tracer les endpoints de santé
    if (url?.includes('/health') || url?.includes('/metrics')) {
      return 0;
    }
    
    // Taux élevé pour les pages importantes
    if (url?.includes('/events/') || url?.includes('/tickets/')) {
      return 1.0;
    }
    
    // Taux réduit pour l'admin en production
    if (process.env.NODE_ENV === 'production' && url?.includes('/admin')) {
      return 0.05;
    }
    
    // Taux par défaut selon le runtime
    const rates = getSampleRates(runtime);
    return rates.traces;
  };
};

// Tags de base selon le composant
export const getInitialScope = (component) => ({
  tags: {
    component,
    service: 'billetterie',
  },
});

// Vérification si Sentry est configuré
export const isSentryConfigured = () => {
  const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) {
    console.warn('Sentry DSN not configured. Error tracking disabled.');
    return false;
  }
  return true;
};
