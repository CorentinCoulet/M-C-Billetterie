import crypto from 'crypto';
import { logger } from './logger';

/**
 * Advanced Encryption Service
 * Provides multiple layers of encryption for sensitive data
 */
export class EncryptionService {
  private static instance: EncryptionService;
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyDerivationIterations = 100000;
  private readonly saltLength = 32;
  private readonly ivLength = 16;
  private readonly tagLength = 16;
  
  private constructor() {
    this.validateEncryptionKeys();
  }

  static getInstance(): EncryptionService {
    if (!EncryptionService.instance) {
      EncryptionService.instance = new EncryptionService();
    }
    return EncryptionService.instance;
  }

  /**
   * Validate that encryption keys are properly set
   */
  private validateEncryptionKeys(): void {
    const requiredKeys = [
      'ENCRYPTION_KEY',
      'AES_SECRET',
      'DATA_ENCRYPTION_KEY'
    ];

    for (const key of requiredKeys) {
      if (!process.env[key]) {
        throw new Error(`Missing required encryption key: ${key}`);
      }

      if (process.env[key]!.length < 32) {
        throw new Error(`Encryption key ${key} is too short (minimum 32 characters)`);
      }
    }
  }

  /**
   * Derive encryption key from master key and salt
   */
  private deriveKey(masterKey: string, salt: Buffer): Buffer {
    return crypto.pbkdf2Sync(
      masterKey,
      salt,
      this.keyDerivationIterations,
      32,
      'sha256'
    );
  }

  /**
   * Encrypt sensitive data (PII, passwords, etc.)
   */
  encryptSensitiveData(plaintext: string, keyType: 'personal' | 'financial' | 'system' = 'personal'): string {
    try {
      const masterKey = this.getMasterKey(keyType);
      const salt = crypto.randomBytes(this.saltLength);
      const iv = crypto.randomBytes(this.ivLength);
      const key = this.deriveKey(masterKey, salt);

      const cipher = crypto.createCipheriv(this.algorithm, key, iv);
      
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const tag = cipher.getAuthTag();

      // Combine salt + iv + tag + encrypted data
      const combined = Buffer.concat([
        salt,
        iv,
        tag,
        Buffer.from(encrypted, 'hex')
      ]);

      return combined.toString('base64');
    } catch (error) {
      logger.error('Encryption failed:', error);
      throw new Error('Data encryption failed');
    }
  }

  /**
   * Decrypt sensitive data
   */
  decryptSensitiveData(encryptedData: string, keyType: 'personal' | 'financial' | 'system' = 'personal'): string {
    try {
      const masterKey = this.getMasterKey(keyType);
      const combined = Buffer.from(encryptedData, 'base64');

      // Extract components
      const salt = combined.subarray(0, this.saltLength);
      const iv = combined.subarray(this.saltLength, this.saltLength + this.ivLength);
      const tag = combined.subarray(
        this.saltLength + this.ivLength,
        this.saltLength + this.ivLength + this.tagLength
      );
      const encrypted = combined.subarray(this.saltLength + this.ivLength + this.tagLength);

      const key = this.deriveKey(masterKey, salt);
      const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
      decipher.setAuthTag(tag);

      let decrypted = decipher.update(encrypted, undefined, 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      logger.error('Decryption failed:', error);
      throw new Error('Data decryption failed');
    }
  }

  /**
   * Hash passwords with salt and pepper
   */
  async hashPassword(password: string, userId?: string): Promise<string> {
    try {
      const salt = crypto.randomBytes(32);
      const pepper = this.getPepper();
      
      // Add user-specific salt if available
      const userSalt = userId ? crypto.createHash('sha256').update(userId).digest() : Buffer.alloc(0);
      
      const combinedInput = Buffer.concat([
        Buffer.from(password, 'utf8'),
        salt,
        Buffer.from(pepper, 'utf8'),
        userSalt
      ]);

      // Use Argon2 equivalent with PBKDF2
      const hash = crypto.pbkdf2Sync(
        combinedInput,
        salt,
        this.keyDerivationIterations * 2, // Double iterations for passwords
        64,
        'sha256'
      );

      // Combine salt + hash
      const combined = Buffer.concat([salt, hash]);
      return combined.toString('base64');
    } catch (error) {
      logger.error('Password hashing failed:', error);
      throw new Error('Password hashing failed');
    }
  }

  /**
   * Verify password hash
   */
  async verifyPassword(password: string, hashedPassword: string, userId?: string): Promise<boolean> {
    try {
      const combined = Buffer.from(hashedPassword, 'base64');
      const salt = combined.subarray(0, 32);
      const storedHash = combined.subarray(32);

      const pepper = this.getPepper();
      const userSalt = userId ? crypto.createHash('sha256').update(userId).digest() : Buffer.alloc(0);
      
      const combinedInput = Buffer.concat([
        Buffer.from(password, 'utf8'),
        salt,
        Buffer.from(pepper, 'utf8'),
        userSalt
      ]);

      const hash = crypto.pbkdf2Sync(
        combinedInput,
        salt,
        this.keyDerivationIterations * 2,
        64,
        'sha256'
      );

      return crypto.timingSafeEqual(hash, storedHash);
    } catch (error) {
      logger.error('Password verification failed:', error);
      return false;
    }
  }

  /**
   * Generate secure token
   */
  generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('base64url');
  }

  /**
   * Generate cryptographically secure random number
   */
  generateSecureRandom(min: number, max: number): number {
    const range = max - min + 1;
    const maxValid = Math.floor(0xFFFFFFFF / range) * range - 1;
    
    let randomValue;
    do {
      randomValue = crypto.randomBytes(4).readUInt32BE(0);
    } while (randomValue > maxValid);
    
    return min + (randomValue % range);
  }

  /**
   * Create HMAC signature
   */
  createHMAC(data: string, secret?: string): string {
    const hmacSecret = secret || process.env.HMAC_SECRET || process.env.JWT_SECRET!;
    return crypto.createHmac('sha256', hmacSecret).update(data).digest('hex');
  }

  /**
   * Verify HMAC signature
   */
  verifyHMAC(data: string, signature: string, secret?: string): boolean {
    const expectedSignature = this.createHMAC(data, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  }

  /**
   * Encrypt file contents
   */
  encryptFile(fileBuffer: Buffer, keyType: 'system' | 'backup' = 'system'): Buffer {
    const masterKey = this.getMasterKey(keyType);
    const salt = crypto.randomBytes(this.saltLength);
    const iv = crypto.randomBytes(this.ivLength);
    const key = this.deriveKey(masterKey, salt);

    const cipher = crypto.createCipheriv(this.algorithm, key, iv);
    
    const encrypted = Buffer.concat([
      cipher.update(fileBuffer),
      cipher.final()
    ]);
    
    const tag = cipher.getAuthTag();

    // Combine metadata + encrypted data
    return Buffer.concat([
      salt,
      iv,
      tag,
      encrypted
    ]);
  }

  /**
   * Decrypt file contents
   */
  decryptFile(encryptedBuffer: Buffer, keyType: 'system' | 'backup' = 'system'): Buffer {
    const masterKey = this.getMasterKey(keyType);
    
    const salt = encryptedBuffer.subarray(0, this.saltLength);
    const iv = encryptedBuffer.subarray(this.saltLength, this.saltLength + this.ivLength);
    const tag = encryptedBuffer.subarray(
      this.saltLength + this.ivLength,
      this.saltLength + this.ivLength + this.tagLength
    );
    const encrypted = encryptedBuffer.subarray(this.saltLength + this.ivLength + this.tagLength);

    const key = this.deriveKey(masterKey, salt);
    const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
    decipher.setAuthTag(tag);

    return Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ]);
  }

  /**
   * Generate encryption key for new data
   */
  generateDataKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Encrypt data with field-level encryption
   */
  encryptField(value: string, fieldName: string, recordId: string): string {
    const fieldKey = this.deriveFieldKey(fieldName, recordId);
    const iv = crypto.randomBytes(this.ivLength);
    
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(fieldKey, 'hex').subarray(0, 32), iv);
    let encrypted = cipher.update(value, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return iv.toString('hex') + ':' + encrypted;
  }

  /**
   * Decrypt field-level encrypted data
   */
  decryptField(encryptedValue: string, fieldName: string, recordId: string): string {
    const [ivHex, encrypted] = encryptedValue.split(':');
    const fieldKey = this.deriveFieldKey(fieldName, recordId);
    const iv = Buffer.from(ivHex, 'hex');
    
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(fieldKey, 'hex').subarray(0, 32), iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Get master key based on type
   */
  private getMasterKey(keyType: 'personal' | 'financial' | 'system' | 'backup'): string {
    switch (keyType) {
      case 'personal':
        return process.env.DATA_ENCRYPTION_KEY!;
      case 'financial':
        return process.env.FINANCIAL_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY!;
      case 'system':
        return process.env.AES_SECRET!;
      case 'backup':
        return process.env.BACKUP_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY!;
      default:
        return process.env.ENCRYPTION_KEY!;
    }
  }

  /**
   * Get pepper for password hashing
   */
  private getPepper(): string {
    return process.env.PASSWORD_PEPPER || process.env.JWT_SECRET!;
  }

  /**
   * Derive field-specific encryption key
   */
  private deriveFieldKey(fieldName: string, recordId: string): string {
    const baseKey = process.env.FIELD_ENCRYPTION_KEY || process.env.DATA_ENCRYPTION_KEY!;
    const fieldData = `${fieldName}:${recordId}`;
    
    return crypto.createHmac('sha256', baseKey).update(fieldData).digest('hex');
  }

  /**
   * Securely wipe sensitive data from memory
   */
  secureWipe(buffer: Buffer): void {
    if (buffer && buffer.length > 0) {
      crypto.randomFillSync(buffer);
      buffer.fill(0);
    }
  }

  /**
   * Generate cryptographic hash of data
   */
  hashData(data: string | Buffer, algorithm: 'sha256' | 'sha512' = 'sha256'): string {
    return crypto.createHash(algorithm).update(data).digest('hex');
  }

  /**
   * Generate secure session ID
   */
  generateSessionId(): string {
    const timestamp = Date.now().toString();
    const randomBytes = crypto.randomBytes(32).toString('hex');
    const combined = `${timestamp}:${randomBytes}`;
    
    return crypto.createHash('sha256').update(combined).digest('hex');
  }
}

export const encryptionService = EncryptionService.getInstance();
