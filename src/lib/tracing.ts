import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { NodeSDK } from '@opentelemetry/sdk-node';
import {
    ATTR_SERVICE_NAME,
    ATTR_SERVICE_VERSION
} from '@opentelemetry/semantic-conventions/incubating';

const traceExporter = new OTLPTraceExporter({
  url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
  headers: {},
});

const sdk = new NodeSDK({
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: 'billetterie-api',
    [ATTR_SERVICE_VERSION]: process.env.APP_VERSION || process.env.VERSION || '1.0.0',
    'deployment.environment': process.env.NODE_ENV || 'development',
  }),
  traceExporter: traceExporter as any,
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': { enabled: false },
      '@opentelemetry/instrumentation-http': { enabled: true },
      '@opentelemetry/instrumentation-express': { enabled: false },
    }),
  ],
});

/**
 * Start OpenTelemetry tracing
 * Should be called at application startup
 */
export function startTracing() {
  if (process.env.ENABLE_TRACING === 'true') {
    sdk.start();
    console.log('✅ OpenTelemetry tracing started');
  }
}

/**
 * Stop OpenTelemetry tracing
 * Should be called at application shutdown
 */
export async function stopTracing() {
  if (process.env.ENABLE_TRACING === 'true') {
    await sdk.shutdown();
    console.log('🛑 OpenTelemetry tracing stopped');
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  await stopTracing();
  process.exit(0);
});

export default sdk;
