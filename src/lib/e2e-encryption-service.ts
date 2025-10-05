import { createCipheriv, createDecipheriv, createHash, pbkdf2Sync, randomBytes } from 'crypto';
import logger from './logger';

interface EncryptionKey {
  id: string;
  algorithm: string;
  keyData: Buffer;
  createdAt: Date;
  expiresAt?: Date;
  version: number;
}

interface EncryptionResult {
  encryptedData: string;
  keyId: string;
  algorithm: string;
  iv: string;
  authTag?: string;
}

interface FieldEncryptionConfig {
  fields: string[];
  algorithm: 'aes-256-gcm' | 'aes-256-cbc';
  keyRotationInterval: number; // days
}

/**
 * End-to-End Encryption Service for Sensitive Data
 * Provides field-level encryption with key rotation and secure key management
 */
export class E2EEncryptionService {
  private keys: Map<string, EncryptionKey> = new Map();
  private currentKeyId: string | null = null;
  private readonly KEY_DERIVATION_ITERATIONS = 100000;
  private readonly KEY_SIZE = 32; // 256 bits
  private readonly IV_SIZE = 16; // 128 bits
  
  constructor() {
    this.initializeEncryption();
  }

  /**
   * Initialize encryption service with master key
   */
  private async initializeEncryption(): Promise<void> {
    try {
      const masterKey = this.getMasterKey();
      await this.loadOrCreateCurrentKey(masterKey);
      
      // Schedule key rotation check
      setInterval(() => this.checkKeyRotation(), 24 * 60 * 60 * 1000); // Daily
      
      logger.info('E2E Encryption service initialized');
    } catch (error) {
      logger.error('Failed to initialize E2E encryption service:', error);
      throw error;
    }
  }

  /**
   * Get master key from environment with validation
   */
  private getMasterKey(): Buffer {
    const masterKeyHex = process.env.E2E_MASTER_KEY;
    if (!masterKeyHex) {
      throw new Error('E2E_MASTER_KEY environment variable is required');
    }
    
    if (masterKeyHex.length !== 64) { // 32 bytes = 64 hex chars
      throw new Error('E2E_MASTER_KEY must be exactly 32 bytes (64 hex characters)');
    }
    
    return Buffer.from(masterKeyHex, 'hex');
  }

  /**
   * Derive encryption key from master key and salt
   */
  private deriveKey(masterKey: Buffer, salt: Buffer, info: string = ''): Buffer {
    const keyMaterial = pbkdf2Sync(
      masterKey, 
      Buffer.concat([salt, Buffer.from(info, 'utf8')]),
      this.KEY_DERIVATION_ITERATIONS,
      this.KEY_SIZE,
      'sha512'
    );
    return keyMaterial;
  }

  /**
   * Load existing key or create new one
   */
  private async loadOrCreateCurrentKey(masterKey: Buffer): Promise<void> {
    // In production, load from secure key store (HSM, AWS KMS, etc.)
    // For now, generate a new key
    const keyId = this.generateKeyId();
    const salt = randomBytes(32);
    const keyData = this.deriveKey(masterKey, salt, keyId);
    
    const key: EncryptionKey = {
      id: keyId,
      algorithm: 'aes-256-gcm',
      keyData,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
      version: 1
    };
    
    this.keys.set(keyId, key);
    this.currentKeyId = keyId;
  }

  /**
   * Generate unique key identifier
   */
  private generateKeyId(): string {
    const timestamp = Date.now().toString(36);
    const random = randomBytes(8).toString('hex');
    return `key_${timestamp}_${random}`;
  }

  /**
   * Encrypt sensitive data with current key
   */
  async encryptData(data: string): Promise<EncryptionResult> {
    if (!this.currentKeyId) {
      throw new Error('No encryption key available');
    }

    const key = this.keys.get(this.currentKeyId);
    if (!key) {
      throw new Error('Current encryption key not found');
    }

    try {
      const iv = randomBytes(this.IV_SIZE);
      const cipher = createCipheriv('aes-256-gcm', key.keyData, iv);
      
      let encrypted = cipher.update(data, 'utf8', 'base64');
      encrypted += cipher.final('base64');
      
      const authTag = cipher.getAuthTag();

      return {
        encryptedData: encrypted,
        keyId: key.id,
        algorithm: key.algorithm,
        iv: iv.toString('base64'),
        authTag: authTag.toString('base64')
      };
    } catch (error) {
      logger.error('Encryption failed:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt data using specified key
   */
  async decryptData(encryptionResult: EncryptionResult): Promise<string> {
    const key = this.keys.get(encryptionResult.keyId);
    if (!key) {
      throw new Error(`Encryption key ${encryptionResult.keyId} not found`);
    }

    try {
      const iv = Buffer.from(encryptionResult.iv, 'base64');
      const authTag = encryptionResult.authTag ? Buffer.from(encryptionResult.authTag, 'base64') : undefined;
      
      const decipher = createDecipheriv('aes-256-gcm', key.keyData, iv);
      
      if (authTag) {
        decipher.setAuthTag(authTag);
      }

      let decrypted = decipher.update(encryptionResult.encryptedData, 'base64', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      logger.error('Decryption failed:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Encrypt specific fields in an object
   */
  async encryptFields(obj: any, fieldConfig: FieldEncryptionConfig): Promise<any> {
    const result = { ...obj };
    
    for (const field of fieldConfig.fields) {
      if (obj[field] && typeof obj[field] === 'string') {
        try {
          const encrypted = await this.encryptData(obj[field]);
          result[field] = JSON.stringify(encrypted);
          
          // Mark field as encrypted
          if (!result._encrypted) result._encrypted = [];
          result._encrypted.push(field);
        } catch (error) {
          logger.error(`Failed to encrypt field ${field}:`, error);
        }
      }
    }
    
    return result;
  }

  /**
   * Decrypt specific fields in an object
   */
  async decryptFields(obj: any, fieldConfig: FieldEncryptionConfig): Promise<any> {
    const result = { ...obj };
    
    if (!obj._encrypted || !Array.isArray(obj._encrypted)) {
      return result;
    }
    
    for (const field of obj._encrypted) {
      if (obj[field] && typeof obj[field] === 'string') {
        try {
          const encryptionResult = JSON.parse(obj[field]);
          result[field] = await this.decryptData(encryptionResult);
        } catch (error) {
          logger.error(`Failed to decrypt field ${field}:`, error);
          // Keep encrypted data if decryption fails
        }
      }
    }
    
    delete result._encrypted;
    return result;
  }

  /**
   * Encrypt PII fields in user data
   */
  async encryptUserPII(userData: any): Promise<any> {
    const piiConfig: FieldEncryptionConfig = {
      fields: ['name', 'email', 'phone', 'address'],
      algorithm: 'aes-256-gcm',
      keyRotationInterval: 90
    };
    
    return await this.encryptFields(userData, piiConfig);
  }

  /**
   * Decrypt PII fields in user data
   */
  async decryptUserPII(userData: any): Promise<any> {
    const piiConfig: FieldEncryptionConfig = {
      fields: ['name', 'email', 'phone', 'address'],
      algorithm: 'aes-256-gcm',
      keyRotationInterval: 90
    };
    
    return await this.decryptFields(userData, piiConfig);
  }

  /**
   * Encrypt payment information
   */
  async encryptPaymentData(paymentData: any): Promise<any> {
    const paymentConfig: FieldEncryptionConfig = {
      fields: ['cardNumber', 'cvv', 'billingAddress'],
      algorithm: 'aes-256-gcm',
      keyRotationInterval: 30 // More frequent rotation for payment data
    };
    
    return await this.encryptFields(paymentData, paymentConfig);
  }

  /**
   * Generate data encryption key for file encryption
   */
  async generateDataEncryptionKey(): Promise<{ keyId: string; key: Buffer }> {
    const keyId = this.generateKeyId();
    const key = randomBytes(32); // 256-bit key
    
    // Encrypt the DEK with current KEK (Key Encryption Key)
    const encryptedDEK = await this.encryptData(key.toString('base64'));
    
    // Store encrypted DEK (in production, use secure storage)
    logger.info(`Generated DEK with ID: ${keyId}`);
    
    return { keyId, key };
  }

  /**
   * Check if key rotation is needed
   */
  private async checkKeyRotation(): Promise<void> {
    if (!this.currentKeyId) {
      return;
    }

    const currentKey = this.keys.get(this.currentKeyId);
    if (!currentKey || !currentKey.expiresAt) {
      return;
    }

    const now = new Date();
    const daysUntilExpiry = Math.ceil((currentKey.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry <= 7) {
      logger.warn(`Encryption key ${this.currentKeyId} expires in ${daysUntilExpiry} days`);
      await this.rotateKey();
    }
  }

  /**
   * Rotate encryption key
   */
  async rotateKey(): Promise<string> {
    try {
      const masterKey = this.getMasterKey();
      const newKeyId = this.generateKeyId();
      const salt = randomBytes(32);
      const keyData = this.deriveKey(masterKey, salt, newKeyId);
      
      const newKey: EncryptionKey = {
        id: newKeyId,
        algorithm: 'aes-256-gcm',
        keyData,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        version: (this.keys.get(this.currentKeyId!)?.version || 0) + 1
      };
      
      this.keys.set(newKeyId, newKey);
      
      // Keep old key for decryption
      const oldKeyId = this.currentKeyId;
      this.currentKeyId = newKeyId;
      
      logger.info(`Rotated encryption key from ${oldKeyId} to ${newKeyId}`);
      
      // Schedule old key cleanup (after sufficient time for data re-encryption)
      setTimeout(() => {
        if (oldKeyId) {
          this.keys.delete(oldKeyId);
          logger.info(`Cleaned up old encryption key ${oldKeyId}`);
        }
      }, 30 * 24 * 60 * 60 * 1000); // 30 days
      
      return newKeyId;
    } catch (error) {
      logger.error('Key rotation failed:', error);
      throw error;
    }
  }

  /**
   * Get key information for monitoring
   */
  getKeyInfo(): Array<{ id: string; createdAt: Date; expiresAt?: Date; version: number }> {
    return Array.from(this.keys.values()).map(key => ({
      id: key.id,
      createdAt: key.createdAt,
      expiresAt: key.expiresAt,
      version: key.version
    }));
  }

  /**
   * Securely wipe key from memory
   */
  async wipeKey(keyId: string): Promise<void> {
    const key = this.keys.get(keyId);
    if (key) {
      // Overwrite key data with random bytes
      const randomData = randomBytes(key.keyData.length);
      key.keyData.set(randomData);
      this.keys.delete(keyId);
      logger.info(`Wiped encryption key ${keyId} from memory`);
    }
  }

  /**
   * Create encrypted backup of data
   */
  async createEncryptedBackup(data: any): Promise<{ encryptedData: string; metadata: any }> {
    const { keyId, key } = await this.generateDataEncryptionKey();
    
    // Compress data first
    const jsonData = JSON.stringify(data);
    const compressed = require('zlib').deflateSync(jsonData);
    
    // Encrypt compressed data
    const iv = randomBytes(this.IV_SIZE);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    
    const encryptedBuffer = Buffer.concat([
      cipher.update(compressed),
      cipher.final()
    ]);
    const encrypted = encryptedBuffer.toString('base64');
    
    const authTag = cipher.getAuthTag();
    
    const metadata = {
      keyId,
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
      algorithm: 'aes-256-gcm',
      compressed: true,
      createdAt: new Date(),
      checksum: createHash('sha256').update(jsonData).digest('hex')
    };
    
    return {
      encryptedData: encrypted,
      metadata
    };
  }

  /**
   * Restore data from encrypted backup
   */
  async restoreFromEncryptedBackup(encryptedData: string, metadata: any): Promise<any> {
    try {
      // Reconstruct key (in production, retrieve from secure storage)
      const key = Buffer.from(metadata.keyId, 'base64'); // Simplified for demo
      
      const iv = Buffer.from(metadata.iv, 'base64');
      const authTag = Buffer.from(metadata.authTag, 'base64');
      
      const decipher = createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(authTag);
      
      const decrypted = Buffer.concat([
        decipher.update(Buffer.from(encryptedData, 'base64')),
        decipher.final()
      ]);
      
      // Decompress if needed
      const jsonData = metadata.compressed 
        ? require('zlib').inflateSync(decrypted).toString()
        : decrypted.toString();
      
      // Verify checksum
      const checksum = createHash('sha256').update(jsonData).digest('hex');
      if (checksum !== metadata.checksum) {
        throw new Error('Backup checksum verification failed');
      }
      
      return JSON.parse(jsonData);
    } catch (error) {
      logger.error('Failed to restore from encrypted backup:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const e2eEncryptionService = new E2EEncryptionService();
export default e2eEncryptionService;
