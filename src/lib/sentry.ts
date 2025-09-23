/**
 * Sentry Error Tracking Configuration
 * Production-ready error monitoring and performance tracking
 */

import * as Sentry from '@sentry/nextjs';
import { logger } from '../lib/logger';

// Sentry configuration
export const SENTRY_CONFIG = {
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || 'development',
  release: process.env.npm_package_version || '1.0.0',
  
  // Performance Monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // Error filtering
  ignoreErrors: [
    // Browser errors
    'Script error',
    'Network request failed',
    'Non-Error promise rejection captured',
    
    // Next.js specific
    'ChunkLoadError',
    'Loading chunk',
    'Loading CSS chunk',
    
    // Common bot errors
    'ResizeObserver loop limit exceeded',
    'Permission denied to access property',
    
    // Rate limiting (these are expected)
    'Too many requests',
    'Rate limit exceeded'
  ],
  
  // Data sanitization
  beforeSend: (event) => {
    // Remove sensitive data
    if (event.request) {
      if (event.request.headers) {
        delete event.request.headers['Authorization'];
        delete event.request.headers['Cookie'];
        delete event.request.headers['X-API-Key'];
      }
      
      if (event.request.data) {
        // Remove password fields
        if (typeof event.request.data === 'object') {
          const sanitized = { ...event.request.data };
          delete sanitized.password;
          delete sanitized.token;
          delete sanitized.secret;
          event.request.data = sanitized;
        }
      }
    }
    
    // Remove exception values that contain sensitive data
    if (event.exception?.values) {
      event.exception.values.forEach(exception => {
        if (exception.value?.includes('password') || 
            exception.value?.includes('token') || 
            exception.value?.includes('secret')) {
          exception.value = exception.value.replace(
            /\b\w*(?:password|token|secret|key)\w*\s*[:=]\s*\S+/gi, 
            '[REDACTED]'
          );
        }
      });
    }
    
    return event;
  },
  
  // Additional integrations
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
    new Sentry.Integrations.OnUncaughtException({
      onFatalError: (error) => {
        logger.error('Fatal uncaught exception:', error);
        process.exit(1);
      }
    }),
    new Sentry.Integrations.OnUnhandledRejection({
      mode: 'warn'
    })
  ]
};

/**
 * Initialize Sentry
 */
export function initSentry() {
  if (!SENTRY_CONFIG.dsn) {
    logger.warn('Sentry DSN not configured, error tracking disabled');
    return;
  }

  try {
    Sentry.init(SENTRY_CONFIG);
    logger.info('Sentry error tracking initialized');
  } catch (error) {
    logger.error('Failed to initialize Sentry:', error);
  }
}

/**
 * Custom error handler with Sentry integration
 */
export class ErrorHandler {
  static captureException(error: Error, context?: Record<string, any>) {
    logger.error('Exception captured:', error, context);
    
    if (SENTRY_CONFIG.dsn) {
      Sentry.withScope(scope => {
        if (context) {
          Object.keys(context).forEach(key => {
            scope.setExtra(key, context[key]);
          });
        }
        
        scope.setLevel('error');
        Sentry.captureException(error);
      });
    }
  }

  static captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info', context?: Record<string, any>) {
    logger[level === 'warning' ? 'warn' : level](message, context);
    
    if (SENTRY_CONFIG.dsn) {
      Sentry.withScope(scope => {
        if (context) {
          Object.keys(context).forEach(key => {
            scope.setExtra(key, context[key]);
          });
        }
        
        scope.setLevel(level);
        Sentry.captureMessage(message);
      });
    }
  }

  static setUser(user: { id: string; email?: string; username?: string }) {
    if (SENTRY_CONFIG.dsn) {
      Sentry.setUser(user);
    }
  }

  static clearUser() {
    if (SENTRY_CONFIG.dsn) {
      Sentry.setUser(null);
    }
  }

  static addBreadcrumb(breadcrumb: {
    message: string;
    category?: string;
    level?: 'info' | 'warning' | 'error';
    data?: Record<string, any>;
  }) {
    if (SENTRY_CONFIG.dsn) {
      Sentry.addBreadcrumb({
        message: breadcrumb.message,
        category: breadcrumb.category || 'custom',
        level: breadcrumb.level || 'info',
        data: breadcrumb.data,
        timestamp: Date.now() / 1000
      });
    }
  }

  static startTransaction(name: string, operation: string) {
    if (SENTRY_CONFIG.dsn) {
      return Sentry.startTransaction({
        name,
        op: operation
      });
    }
    return null;
  }
}

/**
 * Next.js API error handler middleware
 */
export function withSentryErrorHandler<T extends (...args: any[]) => any>(handler: T): T {
  return (async (...args) => {
    try {
      return await handler(...args);
    } catch (error) {
      ErrorHandler.captureException(error as Error, {
        handler: handler.name,
        args: args.map(arg => typeof arg === 'object' ? '[Object]' : arg)
      });
      throw error;
    }
  }) as T;
}

/**
 * Database error handler
 */
export function handleDatabaseError(error: any, context?: Record<string, any>) {
  const isDatabaseError = error.code?.startsWith('P') || // Prisma errors
                         error.message?.includes('database') ||
                         error.message?.includes('connection');

  if (isDatabaseError) {
    ErrorHandler.captureException(error, {
      type: 'database_error',
      ...context
    });
  } else {
    ErrorHandler.captureException(error, context);
  }
}

/**
 * API route error handler
 */
export function handleAPIError(error: any, endpoint: string, method: string) {
  ErrorHandler.captureException(error, {
    type: 'api_error',
    endpoint,
    method,
    status: error.status || error.statusCode || 500
  });
}

/**
 * Authentication error handler
 */
export function handleAuthError(error: any, context?: Record<string, any>) {
  ErrorHandler.captureMessage('Authentication error occurred', 'warning', {
    type: 'auth_error',
    error: error.message,
    ...context
  });
}

/**
 * Payment error handler
 */
export function handlePaymentError(error: any, paymentId?: string, amount?: number) {
  ErrorHandler.captureException(error, {
    type: 'payment_error',
    paymentId,
    amount,
    critical: true
  });
}

/**
 * Performance monitoring
 */
export class PerformanceMonitor {
  static measureOperation<T>(
    operationName: string,
    operation: () => Promise<T>,
    context?: Record<string, any>
  ): Promise<T> {
    return new Promise(async (resolve, reject) => {
      const transaction = ErrorHandler.startTransaction(operationName, 'operation');
      const startTime = Date.now();

      try {
        ErrorHandler.addBreadcrumb({
          message: `Starting operation: ${operationName}`,
          category: 'performance',
          level: 'info',
          data: context
        });

        const result = await operation();
        
        const duration = Date.now() - startTime;
        
        ErrorHandler.addBreadcrumb({
          message: `Operation completed: ${operationName}`,
          category: 'performance',
          level: 'info',
          data: { duration, ...context }
        });

        if (transaction) {
          transaction.setData('duration', duration);
          transaction.setData('success', true);
          if (context) {
            Object.keys(context).forEach(key => {
              transaction.setData(key, context[key]);
            });
          }
          transaction.finish();
        }

        resolve(result);
      } catch (error) {
        const duration = Date.now() - startTime;
        
        ErrorHandler.addBreadcrumb({
          message: `Operation failed: ${operationName}`,
          category: 'performance',
          level: 'error',
          data: { duration, error: (error as Error).message, ...context }
        });

        if (transaction) {
          transaction.setData('duration', duration);
          transaction.setData('success', false);
          transaction.setData('error', (error as Error).message);
          transaction.finish();
        }

        ErrorHandler.captureException(error as Error, {
          operation: operationName,
          duration,
          ...context
        });

        reject(error);
      }
    });
  }
}

// Initialize Sentry if DSN is available
if (typeof window === 'undefined') {
  // Server-side initialization
  initSentry();
}

export { Sentry };
export default ErrorHandler;
