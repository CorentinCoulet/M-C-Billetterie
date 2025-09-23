import { Request } from 'express';
import pino from 'pino';

// Pino logger configuration
const logger = pino({
  level: process.env.PINO_LOG_LEVEL || process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'development' 
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'yyyy-mm-dd HH:MM:ss',
          ignore: 'pid,hostname'
        }
      }
    : undefined,
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: [
      'password',
      'token',
      'authorization',
      'cookie',
      'secret',
      'key',
      'creditCard',
      'ssn'
    ],
    censor: '[REDACTED]'
  }
});

/**
 * Create child logger with request context
 */
export function createRequestLogger(req: Request, correlationId?: string) {
  return logger.child({
    correlationId: correlationId || generateCorrelationId(),
    method: req.method,
    url: req.url,
    userAgent: req.headers['user-agent'],
    ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip,
    userId: (req as any).user?.id
  });
}

/**
 * Generate unique correlation ID for request tracing
 */
function generateCorrelationId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Logger for different contexts
 */
export const appLogger = {
  // General app logger
  app: logger.child({ context: 'app' }),
  
  // Authentication logger
  auth: logger.child({ context: 'auth' }),
  
  // Database logger
  db: logger.child({ context: 'database' }),
  
  // Payment logger
  payment: logger.child({ context: 'payment' }),
  
  // Email logger
  email: logger.child({ context: 'email' }),
  
  // QR Code logger
  qr: logger.child({ context: 'qr' }),
  
  // Security logger
  security: logger.child({ context: 'security' })
};

/**
 * Log security events
 */
export function logSecurityEvent(
  event: string, 
  details: any, 
  req?: Request,
  level: 'info' | 'warn' | 'error' = 'info'
) {
  const securityLogger = req 
    ? createRequestLogger(req).child({ context: 'security' })
    : appLogger.security;

  securityLogger[level]({
    securityEvent: event,
    timestamp: new Date().toISOString(),
    ...details
  }, `Security Event: ${event}`);
}

/**
 * Log payment events
 */
export function logPaymentEvent(
  event: string,
  details: any,
  req?: Request,
  level: 'info' | 'warn' | 'error' = 'info'
) {
  const paymentLogger = req 
    ? createRequestLogger(req).child({ context: 'payment' })
    : appLogger.payment;

  paymentLogger[level]({
    paymentEvent: event,
    timestamp: new Date().toISOString(),
    ...details
  }, `Payment Event: ${event}`);
}

/**
 * Log audit events
 */
export function logAuditEvent(
  action: string,
  resource: string,
  userId: string,
  details?: any,
  req?: Request
) {
  const auditLogger = req 
    ? createRequestLogger(req).child({ context: 'audit' })
    : logger.child({ context: 'audit' });

  auditLogger.info({
    auditEvent: {
      action,
      resource,
      userId,
      timestamp: new Date().toISOString(),
      ...details
    }
  }, `Audit: ${action} on ${resource} by ${userId}`);
}

/**
 * Safe logger helpers that ensure proper pino usage
 */
export const safeLogger = {
  info: (message: string, data?: any) => {
    if (data) {
      logger.info(data, message);
    } else {
      logger.info(message);
    }
  },
  warn: (message: string, data?: any) => {
    if (data) {
      logger.warn(data, message);
    } else {
      logger.warn(message);
    }
  },
  error: (message: string, data?: any) => {
    if (data) {
      logger.error(data, message);
    } else {
      logger.error(message);
    }
  },
  debug: (message: string, data?: any) => {
    if (data) {
      logger.debug(data, message);
    } else {
      logger.debug(message);
    }
  }
};

export { logger };
export default logger;
