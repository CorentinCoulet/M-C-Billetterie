/**
 * Unified Sentry Configuration for all runtimes
 * Auto-detects environment (client, server, edge)
 */
import * as Sentry from "@sentry/nextjs";

// ===================================================================
// BASE CONFIGURATION
// ===================================================================

const baseSentryConfig = {
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV || 'development',
  release: process.env.SENTRY_RELEASE || 'billetterie@1.0.0',
  debug: process.env.NODE_ENV === 'development',
  
  beforeSend(event) {
    // Remove sensitive information
    if (event.request?.headers) {
      delete event.request.headers['authorization'];
      delete event.request.headers['cookie'];
      delete event.request.headers['x-api-key'];
    }
    
    // Don't send events in test environment
    if (process.env.NODE_ENV === 'test') {
      return null;
    }
    
    return event;
  },
  
  ignoreErrors: [
    'ResizeObserver loop limit exceeded',
    'Non-Error promise rejection captured',
    'ChunkLoadError',
    'Loading chunk',
    'Network request failed',
    'AbortError',
    'NetworkError',
    // Client-specific errors
    'Hydration failed because the initial UI does not match',
    'There was an error while hydrating',
  ],
};

// ===================================================================
// SAMPLE RATES BY ENVIRONMENT
// ===================================================================

const getSampleRates = (runtime = 'client') => {
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

// ===================================================================
// INTELLIGENT TRACE SAMPLING
// ===================================================================

const createTracesSampler = (runtime = 'client') => {
  return (samplingContext) => {
    const url = samplingContext.request?.url || samplingContext.location?.pathname;
    
    // Don't trace health check endpoints
    if (url?.includes('/health') || url?.includes('/metrics')) {
      return 0;
    }
    
    // Higher rate for important pages
    if (url?.includes('/events/') || url?.includes('/tickets/')) {
      return 1.0;
    }
    
    // Reduced rate for admin in production
    if (process.env.NODE_ENV === 'production' && url?.includes('/admin')) {
      return 0.05;
    }
    
    const rates = getSampleRates(runtime);
    return rates.traces;
  };
};

// ===================================================================
// RUNTIME DETECTION
// ===================================================================

const detectRuntime = () => {
  // Edge runtime
  if (typeof EdgeRuntime !== 'undefined') {
    return 'edge';
  }
  
  // Browser/Client
  if (typeof window !== 'undefined') {
    return 'client';
  }
  
  // Server
  return 'server';
};

// ===================================================================
// CONFIGURATION VERIFICATION
// ===================================================================

const isSentryConfigured = () => {
  const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) {
    console.warn('Sentry DSN not configured. Error tracking disabled.');
    return false;
  }
  return true;
};

// ===================================================================
// INITIALIZATION BASED ON RUNTIME
// ===================================================================

if (isSentryConfigured()) {
  const runtime = detectRuntime();
  const sampleRates = getSampleRates(runtime);
  
  const baseConfig = {
    ...baseSentryConfig,
    tracesSampler: createTracesSampler(runtime),
    initialScope: {
      tags: {
        component: runtime,
        service: 'billetterie',
      },
    },
  };

  // CLIENT-SPECIFIC CONFIGURATION
  if (runtime === 'client') {
    Sentry.init({
      ...baseConfig,
      tracesSampleRate: sampleRates.traces,
      replaysOnErrorSampleRate: sampleRates.replaysError,
      replaysSessionSampleRate: sampleRates.replaysSession,
      
      integrations: [
        new Sentry.Replay({
          sessionSampleRate: sampleRates.replaysSession,
          errorSampleRate: sampleRates.replaysError,
          maskAllText: false,
          maskAllInputs: true,
          blockAllMedia: true,
        }),
        new Sentry.BrowserTracing({
          routingInstrumentation: Sentry.nextRouterInstrumentation({
            normalizeTransactionName: (name) => name.replace(/^\/app/, ''),
          }),
        }),
      ],
      
      beforeNavigate: (context) => ({
        ...context,
        name: context.location.pathname,
      }),
    });
    
    // Set user context if available
    const userId = localStorage.getItem('userId');
    const userEmail = localStorage.getItem('userEmail');
    
    if (userId || userEmail) {
      Sentry.setUser({
        id: userId || undefined,
        email: userEmail || undefined,
      });
    }
  }
  
  // SERVER-SPECIFIC CONFIGURATION
  else if (runtime === 'server') {
    Sentry.init({
      ...baseConfig,
      tracesSampleRate: sampleRates.traces,
      profilesSampleRate: sampleRates.profiles,
      serverName: process.env.HOSTNAME || 'billetterie-server',
      
      integrations: [
        new Sentry.Integrations.Http({ tracing: true }),
        new Sentry.Integrations.Console(),
        new Sentry.Integrations.OnUncaughtException(),
        new Sentry.Integrations.OnUnhandledRejection(),
      ],
    });
  }
  
  // EDGE-SPECIFIC CONFIGURATION
  else if (runtime === 'edge') {
    Sentry.init({
      ...baseConfig,
      tracesSampleRate: sampleRates.traces,
      
      integrations: [
        new Sentry.Integrations.Http({ tracing: true }),
      ],
    });
  }
}

export {
    baseSentryConfig, createTracesSampler,
    detectRuntime, getSampleRates, isSentryConfigured
};

