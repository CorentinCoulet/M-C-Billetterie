/**
 * Secrets Rotation Service
 * Automatically rotates secrets based on configured intervals
 */

import crypto from 'crypto';
import cron from 'node-cron';
import { AuditService } from './audit-service';
import { safeLogger } from './logger';
import { secretsManager } from './secrets-manager';

interface RotationStrategy {
  name: string;
  generate: () => Promise<string>;
}

class SecretsRotationService {
  private strategies: Map<string, RotationStrategy> = new Map();
  private isRunning = false;

  constructor() {
    this.initializeStrategies();
    this.scheduleCronJobs();
  }

  private initializeStrategies(): void {
    // JWT Secret rotation
    this.strategies.set('jwt', {
      name: 'JWT Secret',
      generate: async () => {
        return crypto.randomBytes(64).toString('hex');
      }
    });

    // API Key rotation
    this.strategies.set('api_key', {
      name: 'API Key',
      generate: async () => {
        const prefix = 'sk_';
        const randomPart = crypto.randomBytes(32).toString('base64url');
        return prefix + randomPart;
      }
    });

    // Database encryption key rotation
    this.strategies.set('db_encryption', {
      name: 'Database Encryption Key',
      generate: async () => {
        return crypto.randomBytes(32).toString('hex');
      }
    });

    // Session secret rotation
    this.strategies.set('session_secret', {
      name: 'Session Secret',
      generate: async () => {
        return crypto.randomBytes(64).toString('hex');
      }
    });

    // Webhook secret rotation
    this.strategies.set('webhook_secret', {
      name: 'Webhook Secret',
      generate: async () => {
        return crypto.randomBytes(32).toString('hex');
      }
    });
  }

  private scheduleCronJobs(): void {
    // Check for rotation needs every hour
    cron.schedule('0 * * * *', async () => {
      await this.checkAndRotateSecrets();
    });

    // Daily security scan
    cron.schedule('0 2 * * *', async () => {
      await this.performSecurityScan();
    });

    safeLogger.info('Secrets rotation service scheduled');
  }

  async checkAndRotateSecrets(): Promise<void> {
    if (this.isRunning) {
      safeLogger.info('Secrets rotation already in progress, skipping');
      return;
    }

    this.isRunning = true;
    safeLogger.info('Starting secrets rotation check');

    try {
      const secretsNeedingRotation = await secretsManager.checkRotationNeeded();
      
      for (const secretName of secretsNeedingRotation) {
        await this.rotateSecret(secretName);
      }

      if (secretsNeedingRotation.length > 0) {
        await AuditService.logEvent({
          action: 'secrets.rotation_completed',
          resourceType: 'system',
          details: { rotatedSecrets: secretsNeedingRotation },
          result: 'success',
          riskLevel: 'medium',
          ipAddress: 'system'
        });
      }

    } catch (error) {
      safeLogger.error('Error during secrets rotation', { error });
      await AuditService.logEvent({
        action: 'secrets.rotation_failed',
        resourceType: 'system',
        details: { error: String(error) },
        result: 'error',
        riskLevel: 'high',
        ipAddress: 'system'
      });
    } finally {
      this.isRunning = false;
      safeLogger.info('Secrets rotation check completed');
    }
  }

  async rotateSecret(secretName: string): Promise<void> {
    safeLogger.info(`Rotating secret: ${secretName}`);

    try {
      // Extract strategy from secret name (e.g., "jwt_secret" -> "jwt")
      const strategyKey = secretName.split('_')[0];
      const strategy = this.strategies.get(strategyKey);

      if (!strategy) {
        safeLogger.warn(`No rotation strategy found for secret: ${secretName}`);
        return;
      }

      // Generate new secret value
      const newValue = await strategy.generate();
      
      // Rotate the secret
      await secretsManager.rotateSecret(secretName, newValue);
      
      // Log the rotation
      await AuditService.logEvent({
        action: 'secrets.rotated',
        resourceType: 'secret',
        resourceId: secretName,
        details: { strategy: strategy.name },
        result: 'success',
        riskLevel: 'medium',
        ipAddress: 'system'
      });

      // Notify relevant services about the rotation
      await this.notifySecretRotation(secretName, newValue);

    } catch (error) {
      safeLogger.error(`Failed to rotate secret ${secretName}`, { error, secretName });
      await AuditService.logEvent({
        action: 'secrets.rotation_failed',
        resourceType: 'secret',
        resourceId: secretName,
        details: { error: String(error) },
        result: 'error',
        riskLevel: 'high',
        ipAddress: 'system'
      });
      throw error;
    }
  }

  private async notifySecretRotation(secretName: string, newValue: string): Promise<void> {
    // Update environment variables or configuration as needed
    switch (secretName) {
      case 'jwt_secret':
        // Update JWT configuration
        process.env.JWT_SECRET = newValue;
        break;
      case 'session_secret':
        // Update session configuration
        process.env.SESSION_SECRET = newValue;
        break;
      default:
        safeLogger.info(`No specific notification needed for ${secretName}`);
    }
  }

  async forceRotateSecret(secretName: string): Promise<void> {
    safeLogger.info(`Forcing rotation of secret: ${secretName}`);
    
    await AuditService.logEvent({
      action: 'secrets.force_rotation_initiated',
      resourceType: 'secret',
      resourceId: secretName,
      details: { manual: true },
      result: 'success',
      riskLevel: 'medium',
      ipAddress: 'system'
    });

    await this.rotateSecret(secretName);
  }

  async performSecurityScan(): Promise<void> {
    safeLogger.info('Performing security scan of secrets');

    try {
      const secrets = await secretsManager.listSecrets();
      const now = new Date();
      const warnings: string[] = [];

      for (const secret of secrets) {
        // Check for expired secrets
        if (secret.expiresAt && secret.expiresAt < now) {
          warnings.push(`Secret ${secret.name} is expired`);
        }

        // Check for secrets without rotation intervals
        if (!secret.rotationInterval) {
          warnings.push(`Secret ${secret.name} has no rotation interval configured`);
        }

        // Check for old secrets (over 90 days)
        const ageInDays = (now.getTime() - secret.createdAt.getTime()) / (1000 * 60 * 60 * 24);
        if (ageInDays > 90 && !secret.lastRotated) {
          warnings.push(`Secret ${secret.name} is ${Math.floor(ageInDays)} days old and never rotated`);
        }
      }

      if (warnings.length > 0) {
        safeLogger.warn('Security scan found issues', { warnings, count: warnings.length });
        await AuditService.logEvent({
          action: 'secrets.security_scan_warnings',
          resourceType: 'system',
          details: { warnings, count: warnings.length },
          result: 'success',
          riskLevel: 'medium',
          ipAddress: 'system'
        });
      } else {
        safeLogger.info('Security scan completed with no issues');
      }

    } catch (error) {
      safeLogger.error('Security scan failed', { error });
      await AuditService.logEvent({
        action: 'secrets.security_scan_failed',
        resourceType: 'system',
        details: { error: String(error) },
        result: 'error',
        riskLevel: 'high',
        ipAddress: 'system'
      });
    }
  }

  async addRotationStrategy(key: string, strategy: RotationStrategy): Promise<void> {
    this.strategies.set(key, strategy);
    safeLogger.info(`Added rotation strategy: ${key} - ${strategy.name}`);
  }

  async getRotationStatus(): Promise<any> {
    const secrets = await secretsManager.listSecrets();
    const now = new Date();
    
    return secrets.map(secret => {
      const lastRotated = secret.lastRotated || secret.createdAt;
      const daysSinceRotation = (now.getTime() - lastRotated.getTime()) / (1000 * 60 * 60 * 24);
      
      let status = 'healthy';
      if (secret.rotationInterval && daysSinceRotation > secret.rotationInterval) {
        status = 'needs_rotation';
      } else if (daysSinceRotation > 90) {
        status = 'old';
      }

      return {
        name: secret.name,
        version: secret.version,
        lastRotated,
        daysSinceRotation: Math.floor(daysSinceRotation),
        status,
        expiresAt: secret.expiresAt
      };
    });
  }
}

export const secretsRotationService = new SecretsRotationService();
