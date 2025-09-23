// This file configures the initialization of Sentry for edge runtime.
import * as Sentry from "@sentry/nextjs";
import {
    baseSentryConfig,
    createTracesSampler,
    getInitialScope,
    getSampleRates,
    isSentryConfigured
} from './sentry.config.shared.js';

if (isSentryConfigured()) {
  const sampleRates = getSampleRates('edge');
  
  Sentry.init({
    ...baseSentryConfig,
    
    // Sample rates pour l'edge
    tracesSampleRate: sampleRates.traces,
    
    // Edge runtime specific settings
    integrations: [
      new Sentry.Integrations.Http({ tracing: true }),
    ],
    
    // Traces sampler
    tracesSampler: createTracesSampler('edge'),
    
    // Initial scope
    initialScope: getInitialScope('edge'),
  });
}
