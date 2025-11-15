#!/usr/bin/env node

/**
 * Production Initialization Script
 * Sets up secrets management, SSL certificates, and validates production readiness
 */

import { logger } from '@/lib/logger';
import { initializeProductionSecrets, scheduleSecretRotation } from '../../src/lib/production-secrets-manager';
import { initializeProductionSSL } from '../../src/lib/production-ssl-manager';
import { getRateLimiterStatus } from '../../src/middlewares/productionRateLimit';

async function initializeProduction() {
  console.log('🚀 Starting production initialization...');
  console.log('==========================================');

  let hasErrors = false;

  try {
    // 1. Initialize and validate secrets
    console.log('\n📋 Step 1: Secrets Management');
    console.log('------------------------------');
    
    const secretsValidation = await initializeProductionSecrets();
    
    if (secretsValidation.isValid) {
      console.log('✅ All critical secrets validated successfully');
      
      // Start secret rotation scheduling
      scheduleSecretRotation();
      console.log('⏰ Automatic secret rotation scheduled');
    } else {
      console.log('❌ Secrets validation failed:');
      secretsValidation.missingSecrets.forEach((secret: string) => {
        console.log(`  - Missing: ${secret}`);
      });
      secretsValidation.errors.forEach((error: string) => {
        console.log(`  - Error: ${error}`);
      });
      hasErrors = true;
    }

    if (secretsValidation.warnings.length > 0) {
      console.log('⚠️ Warnings:');
      secretsValidation.warnings.forEach((warning: string) => {
        console.log(`  - ${warning}`);
      });
    }

    // 2. Initialize SSL/TLS
    console.log('\n🔒 Step 2: SSL/TLS Configuration');
    console.log('---------------------------------');
    
    try {
      await initializeProductionSSL();
      console.log('✅ SSL/TLS configuration initialized successfully');
    } catch (sslError) {
      console.log('❌ SSL/TLS initialization failed:', sslError);
      hasErrors = true;
    }

    // 3. Check Rate Limiting
    console.log('\n🛡️ Step 3: Rate Limiting System');
    console.log('-------------------------------');
    
    try {
      const rateLimitStatus = await getRateLimiterStatus();
      console.log(`✅ Rate limiting system: ${rateLimitStatus.redis ? 'Redis' : 'Memory fallback'}`);
      console.log(`   - Redis available: ${rateLimitStatus.redis}`);
      console.log(`   - Fallback entries: ${rateLimitStatus.keys}`);
    } catch (rateLimitError) {
      console.log('⚠️ Rate limiting check failed:', rateLimitError);
      // Not critical, as fallback exists
    }

    // 4. Environment validation
    console.log('\n🌍 Step 4: Environment Validation');
    console.log('----------------------------------');
    
    const requiredEnvVars = [
      'NODE_ENV',
      'DATABASE_URL',
      'JWT_SECRET',
      'STRIPE_SECRET_KEY'
    ];

    let envValid = true;
    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        console.log(`❌ Missing environment variable: ${envVar}`);
        envValid = false;
      } else {
        console.log(`✅ ${envVar} is set`);
      }
    }

    if (!envValid) {
      hasErrors = true;
    }

    // 5. Production readiness check
    console.log('\n📊 Step 5: Production Readiness');
    console.log('-------------------------------');
    
    if (process.env.NODE_ENV !== 'production') {
      console.log('⚠️ NODE_ENV is not set to "production"');
    } else {
      console.log('✅ NODE_ENV is set to production');
    }

    // Check for development-only configurations
    const devWarnings = [];
    
    if (process.env.AUTO_GENERATE_SECRETS === 'true') {
      devWarnings.push('AUTO_GENERATE_SECRETS is enabled (should be disabled in production)');
    }
    
    if (process.env.LOG_LEVEL === 'debug') {
      devWarnings.push('LOG_LEVEL is set to debug (consider warn or error for production)');
    }

    if (devWarnings.length > 0) {
      console.log('⚠️ Development configurations detected:');
      devWarnings.forEach(warning => {
        console.log(`  - ${warning}`);
      });
    } else {
      console.log('✅ No development configurations detected');
    }

    // 6. Performance recommendations
    console.log('\n⚡ Step 6: Performance Recommendations');
    console.log('-------------------------------------');
    
    const recommendations = [];
    
    if (!process.env.REDIS_URL) {
      recommendations.push('Configure Redis for improved rate limiting and caching');
    }
    
    if (!process.env.CDN_URL) {
      recommendations.push('Configure CDN for static asset delivery');
    }
    
    if (!process.env.SENTRY_DSN) {
      recommendations.push('Configure Sentry for error monitoring');
    }

    if (recommendations.length > 0) {
      console.log('💡 Recommendations:');
      recommendations.forEach(rec => {
        console.log(`  - ${rec}`);
      });
    } else {
      console.log('✅ All performance optimizations configured');
    }

    // Final summary
    console.log('\n🎯 Initialization Summary');
    console.log('=========================');
    
    if (hasErrors) {
      console.log('❌ Production initialization completed with ERRORS');
      console.log('   Please resolve the above issues before deploying to production.');
      process.exit(1);
    } else {
      console.log('✅ Production initialization completed successfully!');
      console.log('   Your application is ready for production deployment.');
      
      // Display next steps
      console.log('\n📋 Next Steps:');
      console.log('--------------');
      console.log('1. Review and resolve any warnings above');
      console.log('2. Test your application thoroughly');
      console.log('3. Set up monitoring and alerting');
      console.log('4. Configure backup systems');
      console.log('5. Deploy to production environment');
      
      process.exit(0);
    }

  } catch (error) {
    console.error('💥 Critical error during production initialization:', error);
    logger.error({ error }, 'Production initialization failed');
    process.exit(1);
  }
}

// Health check function for production monitoring
export async function productionHealthCheck() {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    checks: {} as any,
    errors: [] as string[]
  };

  try {
    // Check secrets
    const { initializeProductionSecrets } = await import('../../src/lib/production-secrets-manager');
    const secretsValidation = await initializeProductionSecrets();
    health.checks.secrets = {
      status: secretsValidation.isValid ? 'healthy' : 'critical',
      details: secretsValidation
    };

    if (!secretsValidation.isValid) {
      health.status = 'critical';
      health.errors.push('Secrets validation failed');
    }

    // Check SSL
    const { productionSSLManager } = await import('../../src/lib/production-ssl-manager');
    const sslStatus = await productionSSLManager.getSSLHealthStatus();
    health.checks.ssl = sslStatus;

    if (sslStatus.status === 'critical') {
      health.status = 'critical';
      health.errors.push('SSL certificates critical');
    } else if (sslStatus.status === 'warning' && health.status === 'healthy') {
      health.status = 'warning';
    }

    // Check rate limiting
    const rateLimitStatus = await getRateLimiterStatus();
    health.checks.rateLimiting = {
      status: rateLimitStatus.redis ? 'healthy' : 'warning',
      details: rateLimitStatus
    };

    if (!rateLimitStatus.redis && health.status === 'healthy') {
      health.status = 'warning';
    }

  } catch (error) {
    health.status = 'critical';
    health.errors.push(`Health check failed: ${error}`);
  }

  return health;
}

// Run initialization if called directly
if (require.main === module) {
  initializeProduction();
}
