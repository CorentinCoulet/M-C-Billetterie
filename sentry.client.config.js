// This file configures the initialization of Sentry on the browser side.
import * as Sentry from "@sentry/nextjs";
import {
    baseSentryConfig,
    createTracesSampler,
    getInitialScope,
    getSampleRates,
    isSentryConfigured
} from './sentry.config.shared.js';

if (isSentryConfigured()) {
  const sampleRates = getSampleRates('client');
  
  Sentry.init({
    ...baseSentryConfig,
    
    // Sample rates pour le client
    tracesSampleRate: sampleRates.traces,
    replaysOnErrorSampleRate: sampleRates.replaysError,
    replaysSessionSampleRate: sampleRates.replaysSession,
    
    // Browser specific integrations
    integrations: [
      new Sentry.Replay({
        sessionSampleRate: sampleRates.replaysSession,
        errorSampleRate: sampleRates.replaysError,
        maskAllText: false,
        maskAllInputs: true,
        blockAllMedia: true,
      }),
      new Sentry.BrowserTracing({
        // Set up automatic route change tracking for Next.js App Router
        routingInstrumentation: Sentry.nextRouterInstrumentation({
          normalizeTransactionName: (name) => name.replace(/^\/app/, ''),
        }),
      }),
    ],
    
    // Performance Monitoring
    beforeNavigate: (context) => ({
      ...context,
      name: context.location.pathname,
    }),
    
    // Additional client-specific ignored errors
    ignoreErrors: [
      ...baseSentryConfig.ignoreErrors,
      'Hydration failed because the initial UI does not match',
      'There was an error while hydrating',
    ],
    
    // Traces sampler
    tracesSampler: createTracesSampler('client'),
    
    // Initial scope
    initialScope: getInitialScope('client'),
  });
  
  // Set user context if available
  if (typeof window !== 'undefined') {
    const userId = localStorage.getItem('userId');
    const userEmail = localStorage.getItem('userEmail');
    
    if (userId || userEmail) {
      Sentry.setUser({
        id: userId || undefined,
        email: userEmail || undefined,
      });
    }
  }
}
