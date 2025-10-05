/**
 * Multi-Factor Authentication (MFA) Service
 * Handles TOTP, backup codes, and MFA enforcement for administrators
 */

import crypto from 'crypto';
import QRCode from 'qrcode';
import { AuditService } from './audit-service';
import { logger } from './logger';
import prisma from './prisma';
import { secretsManager } from './secrets-manager';

interface TOTPSecret {
  secret: string;
  backupCodes: string[];
  qrCodeUrl: string;
}

interface MFAConfig {
  enabled: boolean;
  method: 'totp' | 'sms' | 'email';
  backupCodes: string[];
  lastUsedBackupCode?: string;
  createdAt: Date;
  lastUsed?: Date;
}

// Base32 encoding for TOTP secrets
const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

class MFAService {
  private readonly issuer = 'Billetterie-System';
  private readonly algorithm = 'SHA1';
  private readonly digits = 6;
  private readonly period = 30;

  /**
   * Generate a new TOTP secret for a user
   */
  async generateTOTPSecret(userId: string, userEmail: string): Promise<TOTPSecret> {
    try {
      // Generate random secret
      const buffer = crypto.randomBytes(20);
      const secret = this.base32Encode(buffer);

      // Generate backup codes
      const backupCodes = this.generateBackupCodes();

      // Create QR code URL
      const otpAuthUrl = `otpauth://totp/${encodeURIComponent(userEmail)}?secret=${secret}&issuer=${encodeURIComponent(this.issuer)}&algorithm=${this.algorithm}&digits=${this.digits}&period=${this.period}`;
      
      // Generate QR code as data URL
      const qrCodeUrl = await QRCode.toDataURL(otpAuthUrl);

      // Store in database (disabled by default until verified)
      await this.storeMFAConfig(userId, {
        enabled: false,
        method: 'totp',
        backupCodes,
        createdAt: new Date()
      });

      // Store secret securely
      await secretsManager.createSecret(
        `mfa_secret_${userId}`,
        secret,
        { tags: ['mfa', 'totp'], rotationInterval: 90 }
      );

      await AuditService.logEvent({
        action: 'mfa.secret_generated',
        resourceType: 'user',
        resourceId: userId,
        userEmail,
        ipAddress: 'system',
        details: { method: 'totp' },
        result: 'success',
        riskLevel: 'medium'
      });

      return { secret, backupCodes, qrCodeUrl };

    } catch (error) {
      logger.error('Failed to generate TOTP secret:', error);
      throw new Error('Failed to generate MFA secret');
    }
  }

  /**
   * Verify TOTP code
   */
  async verifyTOTP(userId: string, code: string, ipAddress: string): Promise<boolean> {
    try {
      const secret = await secretsManager.getSecret(`mfa_secret_${userId}`);
      if (!secret) {
        return false;
      }

      const isValid = this.verifyTOTPCode(secret, code);
      
      if (isValid) {
        await this.updateLastUsed(userId);
        
        await AuditService.logEvent({
          action: 'mfa.totp_verified',
          resourceType: 'user',
          resourceId: userId,
          ipAddress,
          details: { method: 'totp', code: code.slice(0, 2) + '****' },
          result: 'success',
          riskLevel: 'low'
        });
      } else {
        await AuditService.logEvent({
          action: 'mfa.totp_failed',
          resourceType: 'user',
          resourceId: userId,
          ipAddress,
          details: { method: 'totp', code: code.slice(0, 2) + '****' },
          result: 'failure',
          riskLevel: 'medium'
        });
      }

      return isValid;

    } catch (error) {
      logger.error('TOTP verification failed:', error);
      return false;
    }
  }

  /**
   * Verify backup code
   */
  async verifyBackupCode(userId: string, code: string, ipAddress: string): Promise<boolean> {
    try {
      const mfaConfig = await this.getMFAConfig(userId);
      if (!mfaConfig || !mfaConfig.enabled) {
        return false;
      }

      const codeIndex = mfaConfig.backupCodes.indexOf(code);
      if (codeIndex === -1 || mfaConfig.lastUsedBackupCode === code) {
        await AuditService.logEvent({
          action: 'mfa.backup_code_failed',
          resourceType: 'user',
          resourceId: userId,
          ipAddress,
          details: { code: code.slice(0, 2) + '****' },
          result: 'failure',
          riskLevel: 'medium'
        });
        return false;
      }

      // Mark backup code as used
      mfaConfig.backupCodes.splice(codeIndex, 1);
      mfaConfig.lastUsedBackupCode = code;
      await this.storeMFAConfig(userId, mfaConfig);

      await AuditService.logEvent({
        action: 'mfa.backup_code_used',
        resourceType: 'user',
        resourceId: userId,
        ipAddress,
        details: { 
          code: code.slice(0, 2) + '****',
          remainingCodes: mfaConfig.backupCodes.length 
        },
        result: 'success',
        riskLevel: 'high'
      });

      return true;

    } catch (error) {
      logger.error('Backup code verification failed:', error);
      return false;
    }
  }

  /**
   * Enable MFA for a user (after TOTP verification)
   */
  async enableMFA(userId: string, totpCode: string, ipAddress: string): Promise<boolean> {
    try {
      // First verify the TOTP code
      const isCodeValid = await this.verifyTOTP(userId, totpCode, ipAddress);
      if (!isCodeValid) {
        return false;
      }

      // Enable MFA
      const mfaConfig = await this.getMFAConfig(userId);
      if (mfaConfig) {
        mfaConfig.enabled = true;
        await this.storeMFAConfig(userId, mfaConfig);
      }

      await AuditService.logEvent({
        action: 'mfa.enabled',
        resourceType: 'user',
        resourceId: userId,
        ipAddress,
        details: { method: 'totp' },
        result: 'success',
        riskLevel: 'high'
      });

      logger.info(`MFA enabled for user ${userId}`);
      return true;

    } catch (error) {
      logger.error('Failed to enable MFA:', error);
      return false;
    }
  }

  /**
   * Disable MFA for a user
   */
  async disableMFA(userId: string, adminUserId: string, ipAddress: string): Promise<void> {
    try {
      // Remove MFA config
      await prisma.user.update({
        where: { id: userId },
        data: { metadata: {} } // Reset metadata where MFA config might be stored
      });

      // Remove secret
      await secretsManager.deleteSecret(`mfa_secret_${userId}`);

      await AuditService.logEvent({
        action: 'mfa.disabled',
        resourceType: 'user',
        resourceId: userId,
        userId: adminUserId,
        ipAddress,
        details: { target_user: userId },
        result: 'success',
        riskLevel: 'critical'
      });

      logger.info(`MFA disabled for user ${userId} by admin ${adminUserId}`);

    } catch (error) {
      logger.error('Failed to disable MFA:', error);
      throw error;
    }
  }

  /**
   * Check if user has MFA enabled
   */
  async isMFAEnabled(userId: string): Promise<boolean> {
    try {
      const mfaConfig = await this.getMFAConfig(userId);
      return mfaConfig?.enabled || false;
    } catch (error) {
      logger.error('Failed to check MFA status:', error);
      return false;
    }
  }

  /**
   * Check if user is admin and requires MFA
   */
  async requiresMFA(userId: string): Promise<boolean> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true }
      });

      // Require MFA for admins and elevated roles
      const adminRoles = ['ADMIN', 'SUPER_ADMIN', 'MODERATOR'];
      return user ? adminRoles.includes(user.role) : false;

    } catch (error) {
      logger.error('Failed to check MFA requirement:', error);
      return false;
    }
  }

  /**
   * Generate new backup codes
   */
  async regenerateBackupCodes(userId: string, ipAddress: string): Promise<string[]> {
    try {
      const mfaConfig = await this.getMFAConfig(userId);
      if (!mfaConfig) {
        throw new Error('MFA not configured for user');
      }

      const newBackupCodes = this.generateBackupCodes();
      mfaConfig.backupCodes = newBackupCodes;
      mfaConfig.lastUsedBackupCode = undefined;

      await this.storeMFAConfig(userId, mfaConfig);

      await AuditService.logEvent({
        action: 'mfa.backup_codes_regenerated',
        resourceType: 'user',
        resourceId: userId,
        ipAddress,
        details: { count: newBackupCodes.length },
        result: 'success',
        riskLevel: 'high'
      });

      return newBackupCodes;

    } catch (error) {
      logger.error('Failed to regenerate backup codes:', error);
      throw error;
    }
  }

  /**
   * Get MFA status for dashboard
   */
  async getMFAStatus(userId: string): Promise<{
    enabled: boolean;
    method?: string;
    backupCodesRemaining?: number;
    lastUsed?: Date;
    createdAt?: Date;
  }> {
    try {
      const mfaConfig = await this.getMFAConfig(userId);
      if (!mfaConfig) {
        return { enabled: false };
      }

      return {
        enabled: mfaConfig.enabled,
        method: mfaConfig.method,
        backupCodesRemaining: mfaConfig.backupCodes.length,
        lastUsed: mfaConfig.lastUsed,
        createdAt: mfaConfig.createdAt
      };

    } catch (error) {
      logger.error('Failed to get MFA status:', error);
      return { enabled: false };
    }
  }

  // Private helper methods

  private base32Encode(buffer: Buffer): string {
    let bits = 0;
    let value = 0;
    let output = '';

    for (let i = 0; i < buffer.length; i++) {
      value = (value << 8) | buffer[i];
      bits += 8;

      while (bits >= 5) {
        output += base32Chars[(value >>> (bits - 5)) & 31];
        bits -= 5;
      }
    }

    if (bits > 0) {
      output += base32Chars[(value << (5 - bits)) & 31];
    }

    return output;
  }

  private generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < 10; i++) {
      // Generate 8-character backup codes
      const code = crypto.randomBytes(4).toString('hex').toLowerCase();
      codes.push(code);
    }
    return codes;
  }

  private verifyTOTPCode(secret: string, code: string): boolean {
    const timeStep = Math.floor(Date.now() / 1000 / this.period);
    
    // Check current time step and previous/next for clock drift
    for (let i = -1; i <= 1; i++) {
      const expectedCode = this.generateTOTPCode(secret, timeStep + i);
      if (expectedCode === code) {
        return true;
      }
    }
    
    return false;
  }

  private generateTOTPCode(secret: string, timeStep: number): string {
    // Decode base32 secret
    const keyBuffer = this.base32Decode(secret);
    
    // Convert time step to buffer
    const timeBuffer = Buffer.alloc(8);
    timeBuffer.writeUInt32BE(0, 0);
    timeBuffer.writeUInt32BE(timeStep, 4);
    
    // HMAC-SHA1
    const hmac = crypto.createHmac('sha1', keyBuffer);
    hmac.update(timeBuffer);
    const digest = hmac.digest();
    
    // Dynamic truncation
    const offset = digest[digest.length - 1] & 0xf;
    const code = ((digest[offset] & 0x7f) << 24) |
                 ((digest[offset + 1] & 0xff) << 16) |
                 ((digest[offset + 2] & 0xff) << 8) |
                 (digest[offset + 3] & 0xff);
    
    return (code % Math.pow(10, this.digits)).toString().padStart(this.digits, '0');
  }

  private base32Decode(base32: string): Buffer {
    base32 = base32.toUpperCase().replace(/=+$/, '');
    const length = base32.length;
    let bits = 0;
    let value = 0;
    let index = 0;
    const output = Buffer.alloc(((length * 5) / 8) | 0);

    for (let i = 0; i < length; i++) {
      const idx = base32Chars.indexOf(base32[i]);
      if (idx === -1) throw new Error('Invalid base32 character');
      
      value = (value << 5) | idx;
      bits += 5;

      if (bits >= 8) {
        output[index++] = (value >>> (bits - 8)) & 0xff;
        bits -= 8;
      }
    }

    return output.slice(0, index);
  }

  private async storeMFAConfig(userId: string, config: MFAConfig): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: {
        metadata: {
          mfa: config
        }
      }
    });
  }

  private async getMFAConfig(userId: string): Promise<MFAConfig | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { metadata: true }
      });

      if (!user?.metadata || typeof user.metadata !== 'object') {
        return null;
      }

      const metadata = user.metadata as any;
      return metadata.mfa || null;

    } catch (error) {
      logger.error('Failed to get MFA config:', error);
      return null;
    }
  }

  private async updateLastUsed(userId: string): Promise<void> {
    try {
      const mfaConfig = await this.getMFAConfig(userId);
      if (mfaConfig) {
        mfaConfig.lastUsed = new Date();
        await this.storeMFAConfig(userId, mfaConfig);
      }
    } catch (error) {
      logger.error('Failed to update MFA last used:', error);
    }
  }
}

export const mfaService = new MFAService();
