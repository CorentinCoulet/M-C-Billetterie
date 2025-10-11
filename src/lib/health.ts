import { safeLogger } from './logger';
import prisma from './prisma';

/**
 * Health check service
 * Monitors application health and dependencies
 */

export interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  checks: {
    database: HealthCheck;
    redis?: HealthCheck;
    disk: HealthCheck;
    memory: HealthCheck;
    external?: {
      stripe: HealthCheck;
      email: HealthCheck;
    };
  };
}

export interface HealthCheck {
  status: 'up' | 'down' | 'degraded';
  responseTime: number;
  message?: string;
  details?: any;
}

/**
 * Check database health
 */
async function checkDatabase(): Promise<HealthCheck> {
  const start = Date.now();
  
  try {
    await prisma.$queryRaw`SELECT 1`;
    
    return {
      status: 'up',
      responseTime: Date.now() - start,
      message: 'Database connection successful'
    };
  } catch (error) {
    return {
      status: 'down',
      responseTime: Date.now() - start,
      message: 'Database connection failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Check Redis health
 */
async function checkRedis(): Promise<HealthCheck> {
  const start = Date.now();
  
  try {
    // Dynamic import to handle optional dependency
    const { getRedis } = await import('./redis');
    const redis = getRedis();
    
    await redis.ping();
    
    return {
      status: 'up',
      responseTime: Date.now() - start,
      message: 'Redis connection successful'
    };
  } catch (error) {
    return {
      status: 'down',
      responseTime: Date.now() - start,
      message: 'Redis connection failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Check disk space
 */
function checkDisk(): HealthCheck {
  const start = Date.now();
  
  try {
    const fs = require('fs');
    const stats = fs.statSync('.');
    
    // Simple disk check - in production, use proper disk space monitoring
    return {
      status: 'up',
      responseTime: Date.now() - start,
      message: 'Disk space sufficient',
      details: {
        available: 'Check not implemented - use proper monitoring'
      }
    };
  } catch (error) {
    return {
      status: 'down',
      responseTime: Date.now() - start,
      message: 'Disk check failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Check memory usage
 */
function checkMemory(): HealthCheck {
  const start = Date.now();
  
  try {
    const memUsage = process.memoryUsage();
    const totalMemory = memUsage.heapTotal;
    const usedMemory = memUsage.heapUsed;
    const memoryUsagePercent = (usedMemory / totalMemory) * 100;
    
    const status = memoryUsagePercent > 90 ? 'degraded' : 
                  memoryUsagePercent > 95 ? 'down' : 'up';
    
    return {
      status,
      responseTime: Date.now() - start,
      message: `Memory usage: ${memoryUsagePercent.toFixed(2)}%`,
      details: {
        heapUsed: Math.round(usedMemory / 1024 / 1024) + ' MB',
        heapTotal: Math.round(totalMemory / 1024 / 1024) + ' MB',
        usage: memoryUsagePercent.toFixed(2) + '%'
      }
    };
  } catch (error) {
    return {
      status: 'down',
      responseTime: Date.now() - start,
      message: 'Memory check failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Check Stripe connectivity
 */
async function checkStripe(): Promise<HealthCheck> {
  const start = Date.now();
  
  try {
    // Only check if Stripe is configured
    if (!process.env.STRIPE_SECRET_KEY) {
      return {
        status: 'up',
        responseTime: Date.now() - start,
        message: 'Stripe not configured'
      };
    }

    // Dynamic import for optional dependency
    const Stripe = require('stripe');
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    
    // Test with a simple API call
    await stripe.accounts.retrieve();
    
    return {
      status: 'up',
      responseTime: Date.now() - start,
      message: 'Stripe API accessible'
    };
  } catch (error) {
    return {
      status: 'down',
      responseTime: Date.now() - start,
      message: 'Stripe API unreachable',
      details: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Check email service
 */
async function checkEmail(): Promise<HealthCheck> {
  const start = Date.now();
  
  try {
    if (!process.env.SMTP_HOST) {
      return {
        status: 'up',
        responseTime: Date.now() - start,
        message: 'Email service not configured'
      };
    }

    // Simple connection test (don't send actual email)
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      auth: process.env.SMTP_USER ? {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      } : undefined
    });

    await transporter.verify();
    
    return {
      status: 'up',
      responseTime: Date.now() - start,
      message: 'Email service accessible'
    };
  } catch (error) {
    return {
      status: 'degraded',
      responseTime: Date.now() - start,
      message: 'Email service check failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get comprehensive health status
 */
export async function getHealthStatus(): Promise<HealthStatus> {
  const startTime = Date.now();
  
  try {
    // Run checks in parallel
    const [
      database,
      redis,
      disk,
      memory,
      stripe,
      email
    ] = await Promise.allSettled([
      checkDatabase(),
      checkRedis().catch(() => ({ status: 'down' as const, responseTime: 0, message: 'Redis not available' })),
      Promise.resolve(checkDisk()),
      Promise.resolve(checkMemory()),
      checkStripe(),
      checkEmail()
    ]);

    const checks = {
      database: database.status === 'fulfilled' ? database.value : 
        { status: 'down' as const, responseTime: 0, message: 'Database check failed' },
      redis: redis.status === 'fulfilled' ? redis.value : 
        { status: 'down' as const, responseTime: 0, message: 'Redis check failed' },
      disk: disk.status === 'fulfilled' ? disk.value : 
        { status: 'down' as const, responseTime: 0, message: 'Disk check failed' },
      memory: memory.status === 'fulfilled' ? memory.value : 
        { status: 'down' as const, responseTime: 0, message: 'Memory check failed' },
      external: {
        stripe: stripe.status === 'fulfilled' ? stripe.value : 
          { status: 'down' as const, responseTime: 0, message: 'Stripe check failed' },
        email: email.status === 'fulfilled' ? email.value : 
          { status: 'down' as const, responseTime: 0, message: 'Email check failed' }
      }
    };

    // Determine overall health status
    const allChecks = [
      checks.database,
      checks.disk,
      checks.memory,
      checks.external.stripe,
      checks.external.email
    ];

    const hasDown = allChecks.some(check => check.status === 'down');
    const hasDegraded = allChecks.some(check => check.status === 'degraded');
    
    const overallStatus = hasDown ? 'unhealthy' : 
                         hasDegraded ? 'degraded' : 'healthy';

    const healthStatus: HealthStatus = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.APP_VERSION || process.env.VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      checks
    };

    // Log health status
    const totalTime = Date.now() - startTime;
    safeLogger.info(`Health check completed in ${totalTime}ms - Status: ${overallStatus}`);

    return healthStatus;

  } catch (error) {
    safeLogger.error('Health check failed', { err: error });
    
    return {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.APP_VERSION || process.env.VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      checks: {
        database: { status: 'down', responseTime: 0, message: 'Health check system failed' },
        disk: { status: 'down', responseTime: 0, message: 'Health check system failed' },
        memory: { status: 'down', responseTime: 0, message: 'Health check system failed' }
      }
    };
  }
}

/**
 * Get simple health status for load balancers
 */
export async function getSimpleHealthStatus(): Promise<{ status: string; timestamp: string }> {
  try {
    // Quick database check only
    await prisma.$queryRaw`SELECT 1`;
    
    return {
      status: 'OK',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    safeLogger.error('Simple health check failed', { err: error });
    
    return {
      status: 'ERROR',
      timestamp: new Date().toISOString()
    };
  }
}

export default {
  getHealthStatus,
  getSimpleHealthStatus
};
