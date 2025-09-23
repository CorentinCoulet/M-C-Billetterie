// This file configures the initialization of Sentry on the server.
import * as Sentry from "@sentry/nextjs";
import {
    baseSentryConfig,
    createTracesSampler,
    getInitialScope,
    getSampleRates,
    isSentryConfigured
} from './sentry.config.shared.js';

if (isSentryConfigured()) {
  const sampleRates = getSampleRates('server');
  
  Sentry.init({
    ...baseSentryConfig,
    
    // Sample rates pour le serveur
    tracesSampleRate: sampleRates.traces,
    profilesSampleRate: sampleRates.profiles,
    
    // Server name
    serverName: process.env.HOSTNAME || 'billetterie-server',
    
    // Server integrations
    integrations: [
      new Sentry.Integrations.Http({ tracing: true }),
      new Sentry.Integrations.Console(),
      new Sentry.Integrations.OnUncaughtException(),
      new Sentry.Integrations.OnUnhandledRejection(),
    ],
    
    // Traces sampler
    tracesSampler: createTracesSampler('server'),
    
    // Initial scope
    initialScope: getInitialScope('server'),
  });
}
