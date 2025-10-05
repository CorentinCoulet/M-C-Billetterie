/**
 * Advanced Secrets Management System
 * Handles encryption, rotation, and secure storage of secrets
 */

import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { logger } from './logger';

interface SecretMetadata {
  id: string;
  name: string;
  version: number;
  createdAt: Date;
  expiresAt?: Date;
  rotationInterval?: number; // days
  isActive: boolean;
  tags: string[];
  lastRotated?: Date;
}

interface EncryptedSecret {
  encrypted: string;
  iv: string;
  salt: string;
  algorithm: string;
}

interface Secret {
  metadata: SecretMetadata;
  data: EncryptedSecret;
}

class SecretsManager {
  private readonly masterKey: string;
  private readonly algorithm = 'aes-256-gcm';
  private readonly secretsPath: string;
  private secrets: Map<string, Secret> = new Map();

  constructor() {
    this.masterKey = this.getMasterKey();
    this.secretsPath = path.join(process.cwd(), '.secrets');
    this.initializeSecretsDirectory();
    this.loadSecrets();
  }

  private getMasterKey(): string {
    const key = process.env.SECRETS_MASTER_KEY;
    if (!key || key.length < 32) {
      throw new Error('SECRETS_MASTER_KEY must be at least 32 characters long');
    }
    return key;
  }

  private async initializeSecretsDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.secretsPath, { recursive: true });
      await fs.writeFile(
        path.join(this.secretsPath, '.gitignore'),
        '*\n!.gitignore\n',
        { flag: 'wx' }
      );
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
        logger.error('Failed to initialize secrets directory:', error);
      }
    }
  }

  private encrypt(data: string, key: string): EncryptedSecret {
    const salt = crypto.randomBytes(32);
    const iv = crypto.randomBytes(16);
    const derivedKey = crypto.pbkdf2Sync(key, salt, 100000, 32, 'sha512');
    
    const cipher = crypto.createCipheriv(this.algorithm, derivedKey, iv);
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted: encrypted + ':' + authTag.toString('hex'),
      iv: iv.toString('hex'),
      salt: salt.toString('hex'),
      algorithm: this.algorithm
    };
  }

  private decrypt(encryptedSecret: EncryptedSecret, key: string): string {
    const { encrypted, iv, salt, algorithm } = encryptedSecret;
    const [encryptedData, authTag] = encrypted.split(':');
    
    const derivedKey = crypto.pbkdf2Sync(key, Buffer.from(salt, 'hex'), 100000, 32, 'sha512');
    const decipher = crypto.createDecipheriv(algorithm, derivedKey, Buffer.from(iv, 'hex'));
    (decipher as any).setAuthTag(Buffer.from(authTag, 'hex'));
    
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  private async loadSecrets(): Promise<void> {
    try {
      const files = await fs.readdir(this.secretsPath);
      const secretFiles = files.filter(file => file.endsWith('.secret.json'));
      
      for (const file of secretFiles) {
        try {
          const filePath = path.join(this.secretsPath, file);
          const content = await fs.readFile(filePath, 'utf8');
          const secret: Secret = JSON.parse(content);
          
          // Convert date strings back to Date objects
          secret.metadata.createdAt = new Date(secret.metadata.createdAt);
          if (secret.metadata.expiresAt) {
            secret.metadata.expiresAt = new Date(secret.metadata.expiresAt);
          }
          if (secret.metadata.lastRotated) {
            secret.metadata.lastRotated = new Date(secret.metadata.lastRotated);
          }
          
          this.secrets.set(secret.metadata.name, secret);
        } catch (error) {
          logger.error(`Failed to load secret from ${file}:`, error);
        }
      }
      
      logger.info(`Loaded ${this.secrets.size} secrets`);
    } catch (error) {
      logger.error('Failed to load secrets:', error);
    }
  }

  private async saveSecret(secret: Secret): Promise<void> {
    const filename = `${secret.metadata.id}.secret.json`;
    const filePath = path.join(this.secretsPath, filename);
    
    try {
      await fs.writeFile(filePath, JSON.stringify(secret, null, 2));
      logger.info(`Secret ${secret.metadata.name} saved`);
    } catch (error) {
      logger.error(`Failed to save secret ${secret.metadata.name}:`, error);
      throw error;
    }
  }

  async createSecret(
    name: string,
    value: string,
    options: {
      expiresIn?: number; // days
      rotationInterval?: number; // days
      tags?: string[];
    } = {}
  ): Promise<string> {
    if (this.secrets.has(name)) {
      throw new Error(`Secret ${name} already exists`);
    }

    const id = crypto.randomUUID();
    const now = new Date();
    const expiresAt = options.expiresIn 
      ? new Date(now.getTime() + options.expiresIn * 24 * 60 * 60 * 1000)
      : undefined;

    const metadata: SecretMetadata = {
      id,
      name,
      version: 1,
      createdAt: now,
      expiresAt,
      rotationInterval: options.rotationInterval,
      isActive: true,
      tags: options.tags || [],
    };

    const encryptedData = this.encrypt(value, this.masterKey);
    
    const secret: Secret = {
      metadata,
      data: encryptedData
    };

    this.secrets.set(name, secret);
    await this.saveSecret(secret);
    
    logger.info(`Secret ${name} created with ID ${id}`);
    return id;
  }

  async getSecret(name: string): Promise<string | null> {
    const secret = this.secrets.get(name);
    if (!secret || !secret.metadata.isActive) {
      return null;
    }

    // Check if secret is expired
    if (secret.metadata.expiresAt && secret.metadata.expiresAt < new Date()) {
      logger.warn(`Secret ${name} is expired`);
      return null;
    }

    try {
      return this.decrypt(secret.data, this.masterKey);
    } catch (error) {
      logger.error(`Failed to decrypt secret ${name}:`, error);
      return null;
    }
  }

  async rotateSecret(name: string, newValue: string): Promise<void> {
    const secret = this.secrets.get(name);
    if (!secret) {
      throw new Error(`Secret ${name} not found`);
    }

    // Create new version
    const newEncryptedData = this.encrypt(newValue, this.masterKey);
    secret.metadata.version += 1;
    secret.metadata.lastRotated = new Date();
    secret.data = newEncryptedData;

    this.secrets.set(name, secret);
    await this.saveSecret(secret);
    
    logger.info(`Secret ${name} rotated to version ${secret.metadata.version}`);
  }

  async deleteSecret(name: string): Promise<void> {
    const secret = this.secrets.get(name);
    if (!secret) {
      throw new Error(`Secret ${name} not found`);
    }

    // Mark as inactive instead of deleting for audit trail
    secret.metadata.isActive = false;
    await this.saveSecret(secret);
    this.secrets.delete(name);
    
    logger.info(`Secret ${name} deleted`);
  }

  async listSecrets(tags?: string[]): Promise<SecretMetadata[]> {
    const secretsList: SecretMetadata[] = [];
    
    for (const secret of this.secrets.values()) {
      if (!secret.metadata.isActive) continue;
      
      if (tags && tags.length > 0) {
        const hasMatchingTag = tags.some(tag => secret.metadata.tags.includes(tag));
        if (!hasMatchingTag) continue;
      }
      
      secretsList.push(secret.metadata);
    }
    
    return secretsList;
  }

  async checkRotationNeeded(): Promise<string[]> {
    const needsRotation: string[] = [];
    const now = new Date();
    
    for (const secret of this.secrets.values()) {
      if (!secret.metadata.isActive || !secret.metadata.rotationInterval) {
        continue;
      }
      
      const lastRotated = secret.metadata.lastRotated || secret.metadata.createdAt;
      const nextRotation = new Date(
        lastRotated.getTime() + secret.metadata.rotationInterval * 24 * 60 * 60 * 1000
      );
      
      if (now >= nextRotation) {
        needsRotation.push(secret.metadata.name);
      }
    }
    
    return needsRotation;
  }

  async exportSecrets(password: string): Promise<string> {
    const exportData = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      secrets: Array.from(this.secrets.values())
    };
    
    const exportJson = JSON.stringify(exportData, null, 2);
    const encrypted = this.encrypt(exportJson, password);
    
    return JSON.stringify(encrypted);
  }

  async importSecrets(encryptedData: string, password: string): Promise<void> {
    try {
      const encryptedSecret: EncryptedSecret = JSON.parse(encryptedData);
      const decryptedData = this.decrypt(encryptedSecret, password);
      const importData = JSON.parse(decryptedData);
      
      for (const secret of importData.secrets) {
        // Convert date strings back to Date objects
        secret.metadata.createdAt = new Date(secret.metadata.createdAt);
        if (secret.metadata.expiresAt) {
          secret.metadata.expiresAt = new Date(secret.metadata.expiresAt);
        }
        if (secret.metadata.lastRotated) {
          secret.metadata.lastRotated = new Date(secret.metadata.lastRotated);
        }
        
        this.secrets.set(secret.metadata.name, secret);
        await this.saveSecret(secret);
      }
      
      logger.info(`Imported ${importData.secrets.length} secrets`);
    } catch (error) {
      logger.error('Failed to import secrets:', error);
      throw new Error('Failed to import secrets: Invalid format or password');
    }
  }
}

// Export singleton instance
export const secretsManager = new SecretsManager();

// Helper functions for common secrets
export const getSecret = (name: string) => secretsManager.getSecret(name);

export const setSecret = (name: string, value: string, options?: any) =>
  secretsManager.createSecret(name, value, options);
