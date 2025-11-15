/**
 * Logger utility - Safe logger for production use
 *
 * Supporte deux styles d'API (compat pino-like):
 *  - logger.info('message', ...args)
 *  - logger.info({ obj }, 'message')
 *  - logger.info({ objOnly })
 */

type LogPayload = unknown;

function formatLog(namespace: string, level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG', args: any[]): any[] {
  // pino-like support: first arg can be object (context), second arg optional message
  if (args.length === 0) return [`[${namespace}:${level}]`];

  const [first, second, ...rest] = args;
  const prefix = `[${namespace}:${level}]`;

  // If first is an object and second is a string (message)
  if (first && typeof first === 'object' && typeof second === 'string') {
    return [prefix, second as string, first as LogPayload, ...rest];
  }
  // If only an object provided
  if (first && typeof first === 'object' && typeof second === 'undefined') {
    return [prefix, first as LogPayload];
  }
  // Default: first is message string
  return [prefix, first, second, ...rest].filter(v => typeof v !== 'undefined');
}

// Simple logger that works in all environments
const createLogger = (namespace: string = 'app') => ({
  info: (...args: any[]) => {
    console.log(...formatLog(namespace, 'INFO', args));
  },
  warn: (...args: any[]) => {
    console.warn(...formatLog(namespace, 'WARN', args));
  },
  error: (...args: any[]) => {
    console.error(...formatLog(namespace, 'ERROR', args));
  },
  debug: (...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(...formatLog(namespace, 'DEBUG', args));
    }
  },
});

export const logger = createLogger('app');
export const safeLogger = createLogger('safe');
export const appLogger = createLogger('app');

// Placeholder exports for compatibility
export const createRequestLogger = (options?: any) => logger;
export const logAuditEvent = (message: any, ...args: any[]) => logger.info(message, ...args);
export const logPaymentEvent = (message: any, ...args: any[]) => logger.info(message, ...args);
export const logSecurityEvent = (message: any, ...args: any[]) => logger.warn(message, ...args);

export default logger;

