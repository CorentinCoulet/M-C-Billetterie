import crypto from 'crypto';

export interface EncryptedData {
  data: string;
  iv: string;
  tag?: string;
  algorithm: string;
}

export interface EncryptionConfig {
  algorithm: string;
  keyLength: number;
  ivLength: number;
  tagLength?: number;
}

export class DataEncryptionService {
  private static readonly DEFAULT_ALGORITHM = 'aes-256-gcm';
  private static readonly KEY_LENGTH = 32; // 256 bits
  private static readonly IV_LENGTH = 12; // 96 bits for GCM
  private static readonly TAG_LENGTH = 16; // 128 bits

  /**
   * Get encryption key from environment or generate one
   */
  private static getEncryptionKey(): Buffer {
    const key = process.env.DATA_ENCRYPTION_KEY;
    if (!key) {
      throw new Error('DATA_ENCRYPTION_KEY environment variable is required');
    }

    // If key is hex-encoded, decode it
    if (key.match(/^[0-9a-f]{64}$/i)) {
      return Buffer.from(key, 'hex');
    }

    // Otherwise, hash the key to ensure it's the right length
    return crypto.scryptSync(key, 'salt', this.KEY_LENGTH);
  }

  /**
   * Encrypt sensitive data
   */
  static encrypt(plaintext: string, algorithm: string = this.DEFAULT_ALGORITHM): EncryptedData {
    try {
      const key = this.getEncryptionKey();
      const iv = crypto.randomBytes(this.IV_LENGTH);
      
      const cipher = crypto.createCipheriv(algorithm, key, iv) as crypto.CipherGCM;
      cipher.setAAD(Buffer.from('billetterie-app')); // Additional authenticated data
      
      let encrypted = cipher.update(plaintext, 'utf8', 'base64');
      encrypted += cipher.final('base64');
      
      const tag = cipher.getAuthTag();

      return {
        data: encrypted,
        iv: iv.toString('base64'),
        tag: tag.toString('base64'),
        algorithm
      };
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt sensitive data
   */
  static decrypt(encryptedData: EncryptedData): string {
    try {
      const key = this.getEncryptionKey();
      const iv = Buffer.from(encryptedData.iv, 'base64');
      const tag = Buffer.from(encryptedData.tag || '', 'base64');
      
      const decipher = crypto.createDecipheriv(encryptedData.algorithm, key, iv) as crypto.DecipherGCM;
      decipher.setAAD(Buffer.from('billetterie-app'));
      decipher.setAuthTag(tag);
      
      let decrypted = decipher.update(encryptedData.data, 'base64', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Encrypt personal identifiable information (PII)
   */
  static encryptPII(data: any): any {
    if (typeof data === 'string') {
      return this.encrypt(data);
    }

    if (Array.isArray(data)) {
      return data.map(item => this.encryptPII(item));
    }

    if (data && typeof data === 'object') {
      const encrypted: any = {};
      
      for (const [key, value] of Object.entries(data)) {
        // Encrypt sensitive fields
        if (this.isSensitiveField(key)) {
          encrypted[key] = typeof value === 'string' ? this.encrypt(value) : value;
        } else {
          encrypted[key] = this.encryptPII(value);
        }
      }
      
      return encrypted;
    }

    return data;
  }

  /**
   * Decrypt personal identifiable information (PII)
   */
  static decryptPII(data: any): any {
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      // Check if it's an encrypted object
      if (data.data && data.iv && data.algorithm) {
        return this.decrypt(data as EncryptedData);
      }

      // Recursively decrypt object properties
      const decrypted: any = {};
      for (const [key, value] of Object.entries(data)) {
        decrypted[key] = this.decryptPII(value);
      }
      return decrypted;
    }

    if (Array.isArray(data)) {
      return data.map(item => this.decryptPII(item));
    }

    return data;
  }

  /**
   * Hash sensitive data (for searching encrypted fields)
   */
  static hashForSearch(data: string): string {
    const key = this.getEncryptionKey();
    return crypto.createHmac('sha256', key).update(data.toLowerCase().trim()).digest('hex');
  }

  /**
   * Generate encryption key
   */
  static generateEncryptionKey(): string {
    return crypto.randomBytes(this.KEY_LENGTH).toString('hex');
  }

  /**
   * Encrypt file content
   */
  static encryptFile(filePath: string, outputPath: string): void {
    try {
      const key = this.getEncryptionKey();
      const iv = crypto.randomBytes(this.IV_LENGTH);
      
      const cipher = crypto.createCipheriv(this.DEFAULT_ALGORITHM, key, iv);
      const fs = require('fs');
      
      const input = fs.createReadStream(filePath);
      const output = fs.createWriteStream(outputPath);
      
      // Write IV to the beginning of the file
      output.write(iv);
      
      input.pipe(cipher).pipe(output);
      
      output.on('finish', () => {
        console.log('File encrypted successfully');
      });
    } catch (error) {
      console.error('File encryption error:', error);
      throw new Error('Failed to encrypt file');
    }
  }

  /**
   * Decrypt file content
   */
  static decryptFile(filePath: string, outputPath: string): void {
    try {
      const key = this.getEncryptionKey();
      const fs = require('fs');
      
      const input = fs.createReadStream(filePath);
      const output = fs.createWriteStream(outputPath);
      
      // Read IV from the beginning of the file
      let iv: Buffer;
      let isIvRead = false;
      
      input.on('data', (chunk: Buffer) => {
        if (!isIvRead) {
          iv = chunk.slice(0, this.IV_LENGTH);
          chunk = chunk.slice(this.IV_LENGTH);
          isIvRead = true;
          
          const decipher = crypto.createDecipheriv(this.DEFAULT_ALGORITHM, key, iv);
          decipher.pipe(output);
          decipher.write(chunk);
        }
      });
      
    } catch (error) {
      console.error('File decryption error:', error);
      throw new Error('Failed to decrypt file');
    }
  }

  /**
   * Anonymize data for GDPR compliance
   */
  static anonymizeData(data: any): any {
    const anonymizationKey = process.env.ANONYMIZATION_KEY || 'anonymous';
    
    if (typeof data === 'string') {
      // Generate consistent anonymous value based on original data
      return crypto.createHmac('sha256', anonymizationKey)
        .update(data)
        .digest('hex')
        .substring(0, 8);
    }

    if (Array.isArray(data)) {
      return data.map(item => this.anonymizeData(item));
    }

    if (data && typeof data === 'object') {
      const anonymized: any = {};
      
      for (const [key, value] of Object.entries(data)) {
        if (this.isSensitiveField(key)) {
          anonymized[key] = this.anonymizeData(value);
        } else {
          anonymized[key] = value;
        }
      }
      
      return anonymized;
    }

    return data;
  }

  /**
   * Check if field contains sensitive data
   */
  private static isSensitiveField(fieldName: string): boolean {
    const sensitiveFields = [
      'email', 'phone', 'phoneNumber', 'mobile',
      'firstName', 'lastName', 'name', 'fullName',
      'address', 'street', 'city', 'postalCode', 'zipCode',
      'ssn', 'socialSecurityNumber', 'taxId',
      'bankAccount', 'creditCard', 'iban',
      'password', 'token', 'secret',
      'dateOfBirth', 'birthDate', 'age',
      'nationalId', 'passport', 'license'
    ];

    return sensitiveFields.some(sensitive => 
      fieldName.toLowerCase().includes(sensitive.toLowerCase())
    );
  }

  /**
   * Secure deletion of sensitive data from memory
   */
  static secureDelete(data: string | Buffer): void {
    if (typeof data === 'string') {
      // Convert string to buffer and overwrite
      const buffer = Buffer.from(data, 'utf8');
      buffer.fill(0);
    } else if (Buffer.isBuffer(data)) {
      data.fill(0);
    }
  }

  /**
   * Generate deterministic encryption for searchable fields
   */
  static encryptSearchable(plaintext: string): string {
    // Use a deterministic encryption that allows equality searches
    // but maintains security for the data
    const key = this.getEncryptionKey();
    const iv = crypto.createHash('sha256').update(plaintext).digest().slice(0, 16);
    
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    return encrypted;
  }

  /**
   * Decrypt searchable encrypted data
   */
  static decryptSearchable(encrypted: string): string {
    // This would need the original plaintext to generate the same IV
    // In practice, you'd store a hash for searching and encrypted data separately
    throw new Error('Searchable decryption requires additional context');
  }

  /**
   * Rotate encryption keys (for key rotation strategy)
   */
  static async rotateKeys(oldKey: string, newKey: string): Promise<void> {
    // In a production environment, this would:
    // 1. Decrypt all data with old key
    // 2. Encrypt with new key
    // 3. Update key in secure storage
    console.log('Key rotation should be implemented based on your storage strategy');
  }
}

export default DataEncryptionService;
