/**
 * Production Secrets Manager
 * Comprehensive secrets management for production deployment
 */

import { getSecret, setSecret, validateCriticalSecrets } from '../config/secrets';
import { logger } from './logger';

export interface SecretsValidationResult {
  isValid: boolean;
  missingSecrets: string[];
  errors: string[];
  warnings: string[];
}

export interface SecretRotationInfo {
  key: string;
  rotateEvery: number;
  lastRotated: Date | null;
  expiresAt: Date | null;
  requiresRotation: boolean;
}

/**
 * Production Secrets Manager Class
 * Handles secrets validation, rotation, and management
 */
class ProductionSecretsManager {
  private rotationSchedule = new Map<string, SecretRotationInfo>();

  constructor() {
    this.initializeRotationSchedule();
  }

  /**
   * Initialize rotation schedule for critical secrets
   */
  private initializeRotationSchedule() {
    const criticalSecrets = [
      { key: 'JWT_SECRET', rotateEvery: 30 * 24 * 60 * 60 * 1000 }, // 30 days
      { key: 'JWT_REFRESH_SECRET', rotateEvery: 30 * 24 * 60 * 60 * 1000 },
      { key: 'DATABASE_PASSWORD', rotateEvery: 90 * 24 * 60 * 60 * 1000 }, // 90 days
      { key: 'REDIS_PASSWORD', rotateEvery: 60 * 24 * 60 * 60 * 1000 }, // 60 days
    ];

    for (const secret of criticalSecrets) {
      this.rotationSchedule.set(secret.key, {
        key: secret.key,
        rotateEvery: secret.rotateEvery,
        lastRotated: null,
        expiresAt: null,
        requiresRotation: false
      });
    }
  }

  /**
   * Validate all production secrets
   */
  async validateProductionSecrets(): Promise<SecretsValidationResult> {
    logger.info('🔍 Validating production secrets...');
    
    const result = await validateCriticalSecrets();
    const warnings: string[] = [];
    
    // Additional production-specific validations
    const productionSecrets = [
      'STRIPE_SECRET_KEY',
      'STRIPE_WEBHOOK_SECRET',
      'JWT_SECRET',
      'JWT_REFRESH_SECRET',
      'DATABASE_URL',
      'REDIS_URL',
      'EMAIL_PASSWORD',
      'ENCRYPTION_KEY',
      'BACKUP_ENCRYPTION_KEY'
    ];

    for (const secretKey of productionSecrets) {
      try {
        const value = await getSecret(secretKey);
        if (!value) {
          result.missing.push(secretKey);
          continue;
        }

        // Validate secret strength
        if (this.isWeakSecret(secretKey, value)) {
          warnings.push(`Secret ${secretKey} appears to be weak or default value`);
        }

        // Check for test/development values
        if (this.isTestValue(value)) {
          result.errors.push(`Secret ${secretKey} contains test/development value`);
        }

      } catch (error) {
        result.errors.push(`Failed to validate ${secretKey}: ${error}`);
      }
    }

    // Check for environment-specific secrets
    const env = process.env.NODE_ENV;
    if (env === 'production') {
      const prodSpecificSecrets = [
        'SSL_CERT_PATH',
        'SSL_KEY_PATH',
        'MONITORING_TOKEN',
        'SENTRY_DSN'
      ];

      for (const secretKey of prodSpecificSecrets) {
        try {
          const value = await getSecret(secretKey);
          if (!value) {
            warnings.push(`Production secret ${secretKey} is not configured`);
          }
        } catch (error) {
          warnings.push(`Could not check production secret ${secretKey}`);
        }
      }
    }

    const isValid = result.missing.length === 0 && result.errors.length === 0;
    
    if (isValid) {
      logger.info('✅ All production secrets validated successfully');
    } else {
      logger.error('❌ Production secrets validation failed', {
        missing: result.missing,
        errors: result.errors
      });
    }

    return {
      isValid,
      missingSecrets: result.missing,
      errors: result.errors,
      warnings
    };
  }

  /**
   * Check if a secret appears to be weak or default
   */
  private isWeakSecret(key: string, value: string): boolean {
    if (value.length < 32 && key.includes('SECRET')) return true;
    if (value.includes('password') || value.includes('secret')) return true;
    if (value === 'changeme' || value === 'default') return true;
    return false;
  }

  /**
   * Check if value appears to be a test/development value
   */
  private isTestValue(value: string): boolean {
    const testPatterns = [
      /test/i,
      /dev/i,
      /localhost/i,
      /127\.0\.0\.1/,
      /example\.com/,
      /fake/i,
      /mock/i
    ];

    return testPatterns.some(pattern => pattern.test(value));
  }

  /**
   * Generate secure secrets for missing ones
   */
  async generateMissingSecrets(missingSecrets: string[]): Promise<void> {
    logger.info(`🔧 Generating ${missingSecrets.length} missing secrets...`);

    for (const secretKey of missingSecrets) {
      try {
        const generatedValue = this.generateSecureSecret(secretKey);
        await setSecret(secretKey, generatedValue);
        logger.info(`✅ Generated secret for ${secretKey}`);
      } catch (error) {
        logger.error(`❌ Failed to generate secret for ${secretKey}:`, error);
        throw error;
      }
    }
  }

  /**
   * Generate a secure secret based on the key type
   */
  private generateSecureSecret(key: string): string {
    const crypto = require('crypto');

    if (key.includes('JWT')) {
      // Generate 64-byte hex string for JWT secrets
      return crypto.randomBytes(64).toString('hex');
    }

    if (key.includes('ENCRYPTION')) {
      // Generate 32-byte base64 string for encryption keys
      return crypto.randomBytes(32).toString('base64');
    }

    if (key.includes('PASSWORD')) {
      // Generate 32-char alphanumeric password
      return crypto.randomBytes(24).toString('base64').replace(/[^a-zA-Z0-9]/g, '');
    }

    // Default: 48-byte hex string
    return crypto.randomBytes(48).toString('hex');
  }

  /**
   * Check which secrets require rotation
   */
  async checkRotationRequirements(): Promise<SecretRotationInfo[]> {
    const secretsRequiringRotation: SecretRotationInfo[] = [];

    for (const [key, info] of this.rotationSchedule) {
      try {
        // Get last rotation date from metadata (if available)
        const lastRotated = await this.getLastRotationDate(key);
        const now = new Date();
        
        if (lastRotated) {
          const expiresAt = new Date(lastRotated.getTime() + info.rotateEvery);
          const requiresRotation = now > expiresAt;

          const rotationInfo: SecretRotationInfo = {
            ...info,
            lastRotated,
            expiresAt,
            requiresRotation
          };

          if (requiresRotation) {
            secretsRequiringRotation.push(rotationInfo);
          }

          this.rotationSchedule.set(key, rotationInfo);
        } else {
          // Never rotated - consider it expired
          secretsRequiringRotation.push({
            ...info,
            lastRotated: null,
            expiresAt: null,
            requiresRotation: true
          });
        }
      } catch (error) {
        logger.warn(`Could not check rotation for ${key}:`, error);
      }
    }

    return secretsRequiringRotation;
  }

  /**
   * Get last rotation date for a secret (placeholder - implement based on your metadata storage)
   */
  private async getLastRotationDate(key: string): Promise<Date | null> {
    // TODO: Implement based on your metadata storage system
    // This could be stored in:
    // - Database metadata table
    // - Redis with expiration
    // - File-based metadata
    // - Secret provider metadata (if supported)
    return null;
  }

  /**
   * Rotate a specific secret
   */
  async rotateSecret(key: string): Promise<void> {
    logger.info(`🔄 Rotating secret: ${key}`);

    try {
      // Generate new secret
      const newValue = this.generateSecureSecret(key);
      
      // Update the secret
      await setSecret(key, newValue);
      
      // Update rotation metadata
      await this.updateRotationMetadata(key, new Date());
      
      logger.info(`✅ Successfully rotated secret: ${key}`);
      
      // Notify monitoring system
      this.notifySecretRotated(key);
      
    } catch (error) {
      logger.error(`❌ Failed to rotate secret ${key}:`, error);
      throw error;
    }
  }

  /**
   * Update rotation metadata
   */
  private async updateRotationMetadata(key: string, rotationDate: Date): Promise<void> {
    // TODO: Implement metadata storage
    // For now, we'll just update our in-memory schedule
    const info = this.rotationSchedule.get(key);
    if (info) {
      info.lastRotated = rotationDate;
      info.expiresAt = new Date(rotationDate.getTime() + info.rotateEvery);
      info.requiresRotation = false;
      this.rotationSchedule.set(key, info);
    }
  }

  /**
   * Notify monitoring system of secret rotation
   */
  private notifySecretRotated(key: string): void {
    // TODO: Integrate with your monitoring/alerting system
    logger.info(`📢 Secret rotated notification: ${key}`);
  }

  /**
   * Get secrets health status
   */
  async getSecretsHealthStatus(): Promise<{
    status: 'healthy' | 'warning' | 'critical';
    totalSecrets: number;
    validSecrets: number;
    expiredSecrets: number;
    missingSecrets: number;
    details: any;
  }> {
    const validation = await this.validateProductionSecrets();
    const rotationRequired = await this.checkRotationRequirements();

    const totalSecrets = 15; // Expected number of production secrets
    const validSecrets = totalSecrets - validation.missingSecrets.length - validation.errors.length;
    const expiredSecrets = rotationRequired.length;
    const missingSecrets = validation.missingSecrets.length;

    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    
    if (missingSecrets > 0 || validation.errors.length > 0) {
      status = 'critical';
    } else if (expiredSecrets > 0 || validation.warnings.length > 0) {
      status = 'warning';
    }

    return {
      status,
      totalSecrets,
      validSecrets,
      expiredSecrets,
      missingSecrets,
      details: {
        validation,
        rotationRequired: rotationRequired.map(r => ({
          key: r.key,
          lastRotated: r.lastRotated,
          expiresAt: r.expiresAt,
          overdueDays: r.expiresAt ? Math.floor((Date.now() - r.expiresAt.getTime()) / (24 * 60 * 60 * 1000)) : null
        }))
      }
    };
  }
}

// Singleton instance
export const productionSecretsManager = new ProductionSecretsManager();

/**
 * Initialize production secrets management
 */
export async function initializeProductionSecrets(): Promise<SecretsValidationResult> {
  logger.info('🚀 Initializing production secrets management...');
  
  const validation = await productionSecretsManager.validateProductionSecrets();
  
  if (!validation.isValid) {
    logger.error('❌ Production secrets validation failed');
    
    if (process.env.AUTO_GENERATE_SECRETS === 'true') {
      logger.info('🔧 Auto-generating missing secrets...');
      await productionSecretsManager.generateMissingSecrets(validation.missingSecrets);
      
      // Re-validate after generation
      return productionSecretsManager.validateProductionSecrets();
    }
  }
  
  return validation;
}

/**
 * Schedule automatic secret rotation
 */
export function scheduleSecretRotation(): void {
  logger.info('⏰ Scheduling automatic secret rotation...');
  
  // Check every 24 hours
  setInterval(async () => {
    try {
      const rotationRequired = await productionSecretsManager.checkRotationRequirements();
      
      if (rotationRequired.length > 0) {
        logger.info(`🔄 ${rotationRequired.length} secrets require rotation`);
        
        for (const secret of rotationRequired) {
          if (process.env.AUTO_ROTATE_SECRETS === 'true') {
            await productionSecretsManager.rotateSecret(secret.key);
          } else {
            logger.warn(`Secret ${secret.key} requires rotation but auto-rotation is disabled`);
          }
        }
      }
    } catch (error) {
      logger.error('❌ Secret rotation check failed:', error);
    }
  }, 24 * 60 * 60 * 1000); // 24 hours
}

export default productionSecretsManager;
