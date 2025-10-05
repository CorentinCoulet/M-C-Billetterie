/**
 * Environment Variables Validator
 * Validates all required environment variables for production security
 */

import crypto from 'crypto';
import { logger } from './logger';

interface EnvConfig {
  name: string;
  required: boolean;
  minLength?: number;
  type?: 'string' | 'number' | 'boolean' | 'url' | 'email';
  format?: RegExp;
  sensitive?: boolean;
}

const ENV_CONFIG: EnvConfig[] = [
  // Critical Security Variables
  { name: 'JWT_SECRET', required: true, minLength: 32, sensitive: true },
  { name: 'JWT_REFRESH_SECRET', required: true, minLength: 32, sensitive: true },
  { name: 'ENCRYPTION_KEY', required: true, minLength: 32, sensitive: true },
  { name: 'AES_SECRET', required: true, minLength: 32, sensitive: true },
  { name: 'SESSION_SECRET', required: true, minLength: 32, sensitive: true },
  { name: 'DATA_ENCRYPTION_KEY', required: true, minLength: 32, sensitive: true },
  
  // Database
  { name: 'DATABASE_URL', required: true, type: 'url' },
  { name: 'REDIS_PASSWORD', required: true, minLength: 12, sensitive: true },
  
  // Stripe
  { name: 'STRIPE_SECRET_KEY', required: true, format: /^sk_(live|test)_/, sensitive: true },
  { name: 'STRIPE_WEBHOOK_SECRET', required: true, format: /^whsec_/, sensitive: true },
  
  // Email
  { name: 'SMTP_HOST', required: true },
  { name: 'SMTP_USER', required: true, type: 'email' },
  { name: 'SMTP_PASS', required: true, sensitive: true },
  
  // AWS/Backup
  { name: 'AWS_ACCESS_KEY_ID', required: false, minLength: 16 },
  { name: 'AWS_SECRET_ACCESS_KEY', required: false, minLength: 32, sensitive: true },
  { name: 'BACKUP_ENCRYPTION_KEY', required: false, minLength: 32, sensitive: true },
  
  // Monitoring
  { name: 'SENTRY_DSN', required: false, type: 'url' },
  { name: 'GRAFANA_ADMIN_PASSWORD', required: false, minLength: 12, sensitive: true },
  
  // Security
  { name: 'RATE_LIMIT_MAX', required: false, type: 'number' },
  { name: 'BCRYPT_ROUNDS', required: false, type: 'number' },
  { name: 'CORS_ORIGIN', required: true, type: 'url' },
  
  // App Config
  { name: 'NODE_ENV', required: true },
  { name: 'PORT', required: false, type: 'number' },
  { name: 'FRONTEND_URL', required: true, type: 'url' },
];

export class EnvValidator {
  private static errors: string[] = [];
  private static warnings: string[] = [];

  /**
   * Validate all environment variables
   */
  static validate(): { isValid: boolean; errors: string[]; warnings: string[] } {
    this.errors = [];
    this.warnings = [];

    logger.info('🔍 Validating environment variables...');

    // Validate each configuration
    for (const config of ENV_CONFIG) {
      this.validateVariable(config);
    }

    // Additional security checks
    this.validateProductionSecurity();
    this.checkForDefaultValues();
    this.validateSecurityCompliance();

    const isValid = this.errors.length === 0;
    
    if (isValid) {
      logger.info('✅ All environment variables are valid');
    } else {
      logger.error('❌ Environment validation failed', { 
        errors: this.errors,
        warnings: this.warnings 
      });
    }

    return {
      isValid,
      errors: this.errors,
      warnings: this.warnings
    };
  }

  /**
   * Validate a single environment variable
   */
  private static validateVariable(config: EnvConfig): void {
    const value = process.env[config.name];

    // Check if required variable is missing
    if (config.required && !value) {
      this.errors.push(`Missing required environment variable: ${config.name}`);
      return;
    }

    // Skip validation if variable is not set and not required
    if (!value && !config.required) {
      return;
    }

    // Validate minimum length
    if (config.minLength && value!.length < config.minLength) {
      this.errors.push(
        `Environment variable ${config.name} must be at least ${config.minLength} characters long`
      );
    }

    // Validate type
    if (config.type) {
      this.validateType(config.name, value!, config.type);
    }

    // Validate format
    if (config.format && !config.format.test(value!)) {
      this.errors.push(`Environment variable ${config.name} has invalid format`);
    }
  }

  /**
   * Validate variable type
   */
  private static validateType(name: string, value: string, type: string): void {
    switch (type) {
      case 'number':
        if (isNaN(Number(value))) {
          this.errors.push(`Environment variable ${name} must be a valid number`);
        }
        break;
      
      case 'boolean':
        if (!['true', 'false', '1', '0'].includes(value.toLowerCase())) {
          this.errors.push(`Environment variable ${name} must be a valid boolean`);
        }
        break;
      
      case 'url':
        try {
          new URL(value);
        } catch {
          this.errors.push(`Environment variable ${name} must be a valid URL`);
        }
        break;
      
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          this.errors.push(`Environment variable ${name} must be a valid email`);
        }
        break;
    }
  }

  /**
   * Validate production-specific security requirements
   */
  private static validateProductionSecurity(): void {
    const isProduction = process.env.NODE_ENV === 'production';
    
    if (!isProduction) {
      this.warnings.push('Not in production mode - some security checks skipped');
      return;
    }

    // HTTPS enforcement in production
    if (process.env.FRONTEND_URL && !process.env.FRONTEND_URL.startsWith('https://')) {
      this.errors.push('FRONTEND_URL must use HTTPS in production');
    }

    // Database SSL in production
    if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('sslmode=require')) {
      this.warnings.push('Database connection should use SSL in production');
    }

    // Strong secrets in production
    if (process.env.JWT_SECRET && this.isWeakSecret(process.env.JWT_SECRET)) {
      this.errors.push('JWT_SECRET is too weak for production use');
    }

    // Redis password in production
    if (!process.env.REDIS_PASSWORD) {
      this.errors.push('REDIS_PASSWORD is required in production');
    }
  }

  /**
   * Check for dangerous default values
   */
  private static checkForDefaultValues(): void {
    const dangerousDefaults = [
      { name: 'JWT_SECRET', defaults: ['your-secret-key', 'change-me', 'secret'] },
      { name: 'DATABASE_URL', defaults: ['postgres://user:password@localhost'] },
      { name: 'ENCRYPTION_KEY', defaults: ['your-encryption-key', 'change-me'] },
    ];

    for (const { name, defaults } of dangerousDefaults) {
      const value = process.env[name];
      if (value && defaults.some(def => value.includes(def))) {
        this.errors.push(`Environment variable ${name} contains default/example value`);
      }
    }
  }

  /**
   * Validate security compliance requirements
   */
  private static validateSecurityCompliance(): void {
    // PCI DSS compliance
    if (process.env.STRIPE_SECRET_KEY) {
      if (process.env.NODE_ENV === 'production' && 
          process.env.STRIPE_SECRET_KEY.startsWith('sk_test_')) {
        this.errors.push('Using test Stripe keys in production environment');
      }
    }

    // GDPR compliance
    if (process.env.NODE_ENV === 'production') {
      if (!process.env.DATA_RETENTION_DAYS) {
        this.warnings.push('DATA_RETENTION_DAYS not set - GDPR compliance may be affected');
      }
    }

    // Rate limiting
    const rateLimit = parseInt(process.env.RATE_LIMIT_MAX || '0');
    if (rateLimit > 1000) {
      this.warnings.push('RATE_LIMIT_MAX is very high - consider lowering for better security');
    }

    // Bcrypt rounds
    const bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
    if (bcryptRounds < 12) {
      this.warnings.push('BCRYPT_ROUNDS is below recommended minimum of 12');
    }
  }

  /**
   * Check if a secret is weak
   */
  private static isWeakSecret(secret: string): boolean {
    // Check minimum entropy
    if (secret.length < 32) return true;
    
    // Check for common patterns
    const weakPatterns = [
      /^[a-z]+$/i,           // Only letters
      /^[0-9]+$/,            // Only numbers
      /(.)\1{3,}/,           // Repeated characters
      /^(password|secret|key|token)/i,  // Common prefixes
    ];

    return weakPatterns.some(pattern => pattern.test(secret));
  }

  /**
   * Generate secure random values for missing variables
   */
  static generateSecureDefaults(): Record<string, string> {
    return {
      JWT_SECRET: crypto.randomBytes(64).toString('hex'),
      JWT_REFRESH_SECRET: crypto.randomBytes(64).toString('hex'),
      ENCRYPTION_KEY: crypto.randomBytes(32).toString('hex'),
      AES_SECRET: crypto.randomBytes(32).toString('hex'),
      SESSION_SECRET: crypto.randomBytes(32).toString('hex'),
      DATA_ENCRYPTION_KEY: crypto.randomBytes(32).toString('hex'),
      REDIS_PASSWORD: crypto.randomBytes(16).toString('hex'),
      BACKUP_ENCRYPTION_KEY: crypto.randomBytes(32).toString('hex'),
      GRAFANA_ADMIN_PASSWORD: crypto.randomBytes(16).toString('base64'),
    };
  }

  /**
   * Mask sensitive values for logging
   */
  static maskSensitiveValues(env: Record<string, string>): Record<string, string> {
    const masked = { ...env };
    
    const sensitiveKeys = ENV_CONFIG
      .filter(config => config.sensitive)
      .map(config => config.name);

    for (const key of sensitiveKeys) {
      if (masked[key]) {
        masked[key] = `${masked[key].substring(0, 4)}${'*'.repeat(masked[key].length - 4)}`;
      }
    }

    return masked;
  }

  /**
   * Validate at startup and throw if critical errors
   */
  static validateOrThrow(): void {
    const validation = this.validate();
    
    if (!validation.isValid) {
      const errorMessage = [
        '❌ Environment validation failed!',
        '',
        'Errors:',
        ...validation.errors.map(error => `  - ${error}`),
        '',
        'Warnings:',
        ...validation.warnings.map(warning => `  - ${warning}`),
        '',
        '🔧 Please fix these issues before starting the application.',
      ].join('\n');

      throw new Error(errorMessage);
    }

    if (validation.warnings.length > 0) {
      logger.warn('⚠️  Environment validation warnings:', validation.warnings);
    }
  }
}

// Auto-validate on import in production
if (process.env.NODE_ENV === 'production') {
  EnvValidator.validateOrThrow();
}

export default EnvValidator;
