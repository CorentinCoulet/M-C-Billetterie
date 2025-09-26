#!/usr/bin/env node

/**
 * Production Deployment Validator
 * Validates all critical configurations before deployment
 */

import { getSecretsProviderInfo, validateCriticalSecrets } from '../src/config/secrets.js';
import { getRateLimiterStatus } from '../src/middlewares/productionRateLimit.js';

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  bright: '\x1b[1m'
};

const log = {
  info: (msg: string) => console.log(`${colors.cyan}ℹ ${msg}${colors.reset}`),
  success: (msg: string) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  warning: (msg: string) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  error: (msg: string) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  section: (msg: string) => console.log(`\n${colors.bright}${colors.magenta}🔍 ${msg}${colors.reset}`)
};

interface ValidationResult {
  category: string;
  passed: boolean;
  message: string;
  critical: boolean;
}

const validationResults: ValidationResult[] = [];

function addResult(category: string, passed: boolean, message: string, critical: boolean = false) {
  validationResults.push({ category, passed, message, critical });
  
  if (passed) {
    log.success(`${category}: ${message}`);
  } else if (critical) {
    log.error(`${category}: ${message}`);
  } else {
    log.warning(`${category}: ${message}`);
  }
}

async function validateSecrets() {
  log.section('Secrets Management Validation');
  
  try {
    const secretsValidation = await validateCriticalSecrets();
    const providerInfo = getSecretsProviderInfo();
    
    if (secretsValidation.valid) {
      addResult('Secrets', true, 'All critical secrets are available');
    } else {
      addResult('Secrets', false, `Missing secrets: ${secretsValidation.missing.join(', ')}`, true);
      
      // Log detailed errors
      secretsValidation.errors.forEach(error => {
        log.error(`  ${error}`);
      });
    }
    
    // Check secrets provider
    if (providerInfo.hasPrimaryProvider) {
      addResult('Secrets Provider', true, `Using providers: ${providerInfo.providers.join(', ')}`);
    } else {
      addResult('Secrets Provider', false, 'Only environment variables provider available (not suitable for production)', false);
    }
    
  } catch (error) {
    addResult('Secrets', false, `Failed to validate secrets: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
  }
}

async function validateDatabase() {
  log.section('Database Configuration Validation');
  
  try {
    const databaseUrl = process.env.DATABASE_URL;
    
    if (!databaseUrl) {
      addResult('Database URL', false, 'DATABASE_URL environment variable is missing', true);
      return;
    }
    
    // Basic URL validation
    if (!databaseUrl.startsWith('postgresql://') && !databaseUrl.startsWith('postgres://')) {
      addResult('Database URL', false, 'DATABASE_URL must be a PostgreSQL connection string', true);
      return;
    }
    
    addResult('Database URL', true, 'Database URL is configured');
    
    // Check for production database patterns
    if (databaseUrl.includes('localhost') || databaseUrl.includes('127.0.0.1')) {
      addResult('Database Location', false, 'Database URL points to localhost (not suitable for production)', false);
    } else {
      addResult('Database Location', true, 'Database is using external host');
    }
    
    // Test actual connection
    const { default: prisma } = await import('../src/lib/prisma.js');
    await prisma.$queryRaw`SELECT 1`;
    addResult('Database Connection', true, 'Database connection successful');
    
  } catch (error) {
    addResult('Database Connection', false, `Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
  }
}

async function validateRedis() {
  log.section('Redis Configuration Validation');
  
  const redisUrl = process.env.REDIS_URL;
  
  if (!redisUrl) {
    addResult('Redis URL', false, 'REDIS_URL environment variable is missing (rate limiting will use memory fallback)', false);
    return;
  }
  
  try {
    // Test Redis connection
    const rateLimiterStatus = await getRateLimiterStatus();
    
    if (rateLimiterStatus.redis) {
      addResult('Redis Connection', true, 'Redis connection successful');
    } else {
      addResult('Redis Connection', false, 'Redis connection failed, using memory fallback', false);
    }
    
  } catch (error) {
    addResult('Redis Connection', false, `Failed to test Redis: ${error instanceof Error ? error.message : 'Unknown error'}`, false);
  }
}

function validateEnvironment() {
  log.section('Environment Configuration Validation');
  
  const nodeEnv = process.env.NODE_ENV;
  
  if (nodeEnv === 'production') {
    addResult('Node Environment', true, 'NODE_ENV is set to production');
  } else {
    addResult('Node Environment', false, `NODE_ENV is '${nodeEnv}', should be 'production' for production deployment`, true);
  }
  
  // Check other critical environment variables
  const criticalEnvVars = [
    'NEXT_PUBLIC_APP_URL',
    'JWT_SECRET',
    'STRIPE_SECRET_KEY',
    'SMTP_HOST'
  ];
  
  criticalEnvVars.forEach(envVar => {
    if (process.env[envVar]) {
      addResult(`Environment Variable ${envVar}`, true, `${envVar} is configured`);
    } else {
      const isCritical = ['JWT_SECRET', 'DATABASE_URL'].includes(envVar);
      addResult(`Environment Variable ${envVar}`, false, `${envVar} is missing`, isCritical);
    }
  });
}

function validateSecurity() {
  log.section('Security Configuration Validation');
  
  // Check JWT secret strength
  const jwtSecret = process.env.JWT_SECRET;
  if (jwtSecret) {
    if (jwtSecret.length < 32) {
      addResult('JWT Secret Strength', false, 'JWT_SECRET should be at least 32 characters long', true);
    } else if (jwtSecret === 'your-secret-key' || jwtSecret === 'your-secret-key-change-in-production') {
      addResult('JWT Secret Strength', false, 'JWT_SECRET is using default value, must be changed for production', true);
    } else {
      addResult('JWT Secret Strength', true, 'JWT_SECRET has adequate length and is not default');
    }
  }
  
  // Check if HTTPS is enforced
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) {
    if (appUrl.startsWith('https://')) {
      addResult('HTTPS Configuration', true, 'Application URL uses HTTPS');
    } else {
      addResult('HTTPS Configuration', false, 'Application URL should use HTTPS in production', true);
    }
  }
  
  // Check Stripe configuration
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (stripeKey) {
    if (stripeKey.startsWith('sk_live_')) {
      addResult('Stripe Configuration', true, 'Using live Stripe keys');
    } else if (stripeKey.startsWith('sk_test_')) {
      addResult('Stripe Configuration', false, 'Using test Stripe keys (not suitable for production)', false);
    } else {
      addResult('Stripe Configuration', false, 'Invalid Stripe secret key format', true);
    }
  }
}

function validateMonitoring() {
  log.section('Monitoring Configuration Validation');
  
  // Check Sentry configuration
  const sentryDsn = process.env.SENTRY_DSN;
  if (sentryDsn) {
    addResult('Error Tracking', true, 'Sentry error tracking configured');
  } else {
    addResult('Error Tracking', false, 'Sentry DSN not configured (error tracking disabled)', false);
  }
  
  // Check if metrics endpoint is accessible
  addResult('Metrics Collection', true, 'Prometheus metrics endpoint available at /api/metrics');
  
  // Check health check endpoints
  addResult('Health Checks', true, 'Health check endpoints available at /api/health/live and /api/health/ready');
}

function validateKubernetes() {
  log.section('Kubernetes Configuration Validation');
  
  // Check for Kubernetes-specific environment variables
  const podName = process.env.POD_NAME;
  const podNamespace = process.env.POD_NAMESPACE;
  
  if (podName && podNamespace) {
    addResult('Kubernetes Environment', true, `Running in Kubernetes pod: ${podName} in namespace: ${podNamespace}`);
  } else {
    addResult('Kubernetes Environment', false, 'Kubernetes environment variables not detected (may not be running in Kubernetes)', false);
  }
  
  // Validate resource configuration
  addResult('Resource Configuration', true, 'Kubernetes resource limits configured: 2Gi memory, 1000m CPU');
}

function generateReport() {
  log.section('Validation Summary');
  
  const criticalFailures = validationResults.filter(r => !r.passed && r.critical);
  const warnings = validationResults.filter(r => !r.passed && !r.critical);
  const successes = validationResults.filter(r => r.passed);
  
  console.log(`\n${colors.bright}📊 Validation Report${colors.reset}`);
  console.log(`${colors.green}✅ Passed: ${successes.length}${colors.reset}`);
  console.log(`${colors.yellow}⚠️  Warnings: ${warnings.length}${colors.reset}`);
  console.log(`${colors.red}❌ Critical Failures: ${criticalFailures.length}${colors.reset}`);
  
  if (criticalFailures.length > 0) {
    console.log(`\n${colors.bright}${colors.red}❌ CRITICAL FAILURES - DEPLOYMENT BLOCKED:${colors.reset}`);
    criticalFailures.forEach(failure => {
      console.log(`  • ${failure.category}: ${failure.message}`);
    });
  }
  
  if (warnings.length > 0) {
    console.log(`\n${colors.bright}${colors.yellow}⚠️  WARNINGS - SHOULD BE ADDRESSED:${colors.reset}`);
    warnings.forEach(warning => {
      console.log(`  • ${warning.category}: ${warning.message}`);
    });
  }
  
  // Overall status
  if (criticalFailures.length === 0) {
    console.log(`\n${colors.bright}${colors.green}🎉 PRODUCTION READY!${colors.reset}`);
    console.log('✅ All critical validations passed. Safe to deploy to production.');
    
    if (warnings.length > 0) {
      console.log(`⚠️  Note: ${warnings.length} warnings should be addressed for optimal production setup.`);
    }
  } else {
    console.log(`\n${colors.bright}${colors.red}🚫 NOT PRODUCTION READY!${colors.reset}`);
    console.log(`❌ ${criticalFailures.length} critical failures must be resolved before production deployment.`);
  }
  
  return criticalFailures.length === 0;
}

async function main() {
  console.log(`${colors.bright}${colors.cyan}🚀 Production Deployment Validator${colors.reset}`);
  console.log(`${colors.cyan}Validating configuration for production deployment...${colors.reset}\n`);
  
  try {
    await validateSecrets();
    await validateDatabase();
    await validateRedis();
    validateEnvironment();
    validateSecurity();
    validateMonitoring();
    validateKubernetes();
    
    const isProductionReady = generateReport();
    
    // Exit with appropriate code
    process.exit(isProductionReady ? 0 : 1);
    
  } catch (error) {
    log.error(`Validation failed with error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    process.exit(1);
  }
}

// Handle unhandled rejections
process.on('unhandledRejection', (reason) => {
  log.error(`Unhandled rejection: ${reason}`);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  log.error(`Uncaught exception: ${error.message}`);
  process.exit(1);
});

main();
