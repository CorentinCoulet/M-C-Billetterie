/**
 * Logger utility - Safe logger for production use
 */

// Simple logger that works in all environments
const createLogger = (namespace: string = 'app') => ({
  info: (message: string, ...args: any[]) => {
    console.log(`[${namespace}:INFO]`, message, ...args);
  },
  warn: (message: string, ...args: any[]) => {
    console.warn(`[${namespace}:WARN]`, message, ...args);
  },
  error: (message: string, ...args: any[]) => {
    console.error(`[${namespace}:ERROR]`, message, ...args);
  },
  debug: (message: string, ...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[${namespace}:DEBUG]`, message, ...args);
    }
  },
});

export const logger = createLogger('app');
export const safeLogger = createLogger('safe');
export const appLogger = createLogger('app');

// Placeholder exports for compatibility
export const createRequestLogger = (options?: any) => logger;
export const logAuditEvent = (message: string, ...args: any[]) => logger.info(message, ...args);
export const logPaymentEvent = (message: string, ...args: any[]) => logger.info(message, ...args);
export const logSecurityEvent = (message: string, ...args: any[]) => logger.warn(message, ...args);

export default logger;

