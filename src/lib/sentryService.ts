/**
 * Sentry Service for monitoring endpoints
 */

import * as Sentry from '@sentry/nextjs';

interface SentryHealthCheck {
  status: 'healthy' | 'unhealthy';
  enabled: boolean;
  dsn?: string;
  environment?: string;
  release?: string;
}

interface CaptureOptions {
  tags?: Record<string, string>;
  extra?: Record<string, any>;
  user?: {
    id: string;
    email?: string;
    username?: string;
  };
}

class SentryService {
  private get isEnabled(): boolean {
    return !!process.env.SENTRY_DSN;
  }

  healthCheck(): SentryHealthCheck {
    return {
      status: this.isEnabled ? 'healthy' : 'unhealthy',
      enabled: this.isEnabled,
      dsn: this.isEnabled ? process.env.SENTRY_DSN?.substring(0, 20) + '...' : undefined,
      environment: process.env.NODE_ENV || 'development',
      release: process.env.npm_package_version || process.env.VERSION || '1.0.0'
    };
  }

  captureException(error: Error, options: CaptureOptions = {}): string | null {
    if (!this.isEnabled) {
      return null;
    }

    return Sentry.withScope(scope => {
      if (options.tags) {
        Object.keys(options.tags).forEach(key => {
          scope.setTag(key, options.tags![key]);
        });
      }

      if (options.extra) {
        Object.keys(options.extra).forEach(key => {
          scope.setExtra(key, options.extra![key]);
        });
      }

      if (options.user) {
        scope.setUser(options.user);
      }

      return Sentry.captureException(error);
    });
  }

  captureMessage(
    message: string, 
    level: 'fatal' | 'error' | 'warning' | 'info' | 'debug' = 'info',
    options: CaptureOptions = {}
  ): string | null {
    if (!this.isEnabled) {
      return null;
    }

    return Sentry.withScope(scope => {
      if (options.tags) {
        Object.keys(options.tags).forEach(key => {
          scope.setTag(key, options.tags![key]);
        });
      }

      if (options.extra) {
        Object.keys(options.extra).forEach(key => {
          scope.setExtra(key, options.extra![key]);
        });
      }

      if (options.user) {
        scope.setUser(options.user);
      }

      scope.setLevel(level);
      return Sentry.captureMessage(message);
    });
  }

  trackBusinessMetric(
    metric: string,
    value: number,
    tags?: Record<string, string>,
    userId?: string
  ): void {
    if (!this.isEnabled) {
      return;
    }

    Sentry.withScope(scope => {
      scope.setTag('metric_type', 'business');
      scope.setTag('metric_name', metric);
      
      if (tags) {
        Object.keys(tags).forEach(key => {
          scope.setTag(key, tags[key]);
        });
      }

      if (userId) {
        scope.setUser({ id: userId });
      }

      scope.setExtra('metric_value', value);
      
      Sentry.captureMessage(`Business Metric: ${metric} = ${value}`, 'info');
    });
  }
}

export const sentryService = new SentryService();
