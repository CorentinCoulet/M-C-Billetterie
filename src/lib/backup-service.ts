/**
 * Advanced Backup and Restore Service
 * Handles encrypted backups, integrity verification, and automated testing
 */

import { exec, spawn } from 'child_process';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { promisify } from 'util';
import { AuditService } from './audit-service';
import { safeLogger } from './logger';
import prisma from './prisma';
import { secretsManager } from './secrets-manager';

const execAsync = promisify(exec);

interface BackupConfig {
  type: 'full' | 'incremental' | 'differential';
  includeTables?: string[];
  excludeTables?: string[];
  compression: 'gzip' | 'lz4' | 'none';
  encryption: boolean;
  retention: {
    daily: number;
    weekly: number;
    monthly: number;
  };
}

interface BackupMetadata {
  id: string;
  type: string;
  timestamp: Date;
  size: number;
  checksum: string;
  encrypted: boolean;
  compressionType: string;
  tables: string[];
  filePath: string;
  encryptionKeyId?: string;
}

interface RestoreOptions {
  targetTimestamp?: Date;
  includeTables?: string[];
  excludeTables?: string[];
  dryRun: boolean;
  validateIntegrity: boolean;
}

class BackupService {
  private readonly backupDir: string;
  private readonly tempDir: string;

  constructor() {
    this.backupDir = path.join(process.cwd(), 'backups');
    this.tempDir = path.join(process.cwd(), 'temp');
    this.ensureDirectories();
  }

  private async ensureDirectories(): Promise<void> {
    await fs.mkdir(this.backupDir, { recursive: true });
    await fs.mkdir(this.tempDir, { recursive: true });
  }

  /**
   * Create a database backup
   */
  async createBackup(config: BackupConfig): Promise<string> {
    const backupId = crypto.randomUUID();
    const timestamp = new Date();
    const backupFileName = `backup_${timestamp.toISOString().replace(/[:.]/g, '-')}_${backupId}.sql`;
    const backupPath = path.join(this.backupDir, backupFileName);

    try {
      safeLogger.info(`Starting ${config.type} backup: ${backupId}`);

      // Get database connection details
      const dbUrl = process.env.DATABASE_URL;
      if (!dbUrl) {
        throw new Error('DATABASE_URL not configured');
      }

      const dbConfig = this.parseDatabaseUrl(dbUrl);
      
      // Create database dump
      const dumpPath = await this.createDatabaseDump(dbConfig, config, backupPath);
      
      // Get file stats
      const stats = await fs.stat(dumpPath);
      let finalPath = dumpPath;
      let compressionType = config.compression;

      // Apply compression
      if (config.compression !== 'none') {
        finalPath = await this.compressFile(dumpPath, config.compression);
        await fs.unlink(dumpPath); // Remove uncompressed file
      }

      // Apply encryption
      let encryptionKeyId: string | undefined;
      if (config.encryption) {
        const { encryptedPath, keyId } = await this.encryptFile(finalPath);
        await fs.unlink(finalPath); // Remove unencrypted file
        finalPath = encryptedPath;
        encryptionKeyId = keyId;
      }

      // Calculate checksum
      const checksum = await this.calculateChecksum(finalPath);

      // Get final file size
      const finalStats = await fs.stat(finalPath);

      // Store backup metadata in database
      const metadata: BackupMetadata = {
        id: backupId,
        type: config.type,
        timestamp,
        size: finalStats.size,
        checksum,
        encrypted: config.encryption,
        compressionType: config.compression,
        tables: await this.getTableList(),
        filePath: finalPath,
        encryptionKeyId
      };

      await this.storeBackupMetadata(metadata);

      // Log the backup creation
      await AuditService.logEvent({
        action: 'backup.created',
        resourceType: 'system',
        resourceId: backupId,
        ipAddress: 'system',
        details: {
          type: config.type,
          size: finalStats.size,
          compressed: config.compression !== 'none',
          encrypted: config.encryption,
          tables: metadata.tables.length
        },
        result: 'success',
        riskLevel: 'medium'
      });

      safeLogger.info(`Backup completed successfully: ${backupId}, Size: ${this.formatBytes(finalStats.size)}`);
      return backupId;

    } catch (error) {
      safeLogger.error(`Backup creation failed: ${error}`);
      
      await AuditService.logEvent({
        action: 'backup.failed',
        resourceType: 'system',
        resourceId: backupId,
        ipAddress: 'system',
        details: { error: String(error), type: config.type },
        result: 'error',
        riskLevel: 'high'
      });

      throw error;
    }
  }

  /**
   * Restore from backup
   */
  async restoreBackup(backupId: string, options: RestoreOptions = { dryRun: false, validateIntegrity: true }): Promise<void> {
    try {
      safeLogger.info(`Starting restore from backup: ${backupId}`);

      // Get backup metadata
      const metadata = await this.getBackupMetadata(backupId);
      if (!metadata) {
        throw new Error(`Backup ${backupId} not found`);
      }

      // Validate backup integrity
      if (options.validateIntegrity) {
        const isValid = await this.validateBackupIntegrity(metadata);
        if (!isValid) {
          throw new Error('Backup integrity validation failed');
        }
      }

      // Prepare restore file
      const restoreFilePath = await this.prepareRestoreFile(metadata);

      if (options.dryRun) {
        safeLogger.info('Dry run completed successfully - backup is valid and can be restored');
        await fs.unlink(restoreFilePath);
        return;
      }

      // Create pre-restore backup of current state
      safeLogger.info('Creating pre-restore backup...');
      const preRestoreBackupId = await this.createBackup({
        type: 'full',
        compression: 'gzip',
        encryption: true,
        retention: { daily: 1, weekly: 0, monthly: 0 }
      });

      try {
        // Perform restore
        await this.performDatabaseRestore(restoreFilePath, options);

        // Log successful restore
        await AuditService.logEvent({
          action: 'backup.restored',
          resourceType: 'system',
          resourceId: backupId,
          ipAddress: 'system',
          details: {
            originalTimestamp: metadata.timestamp,
            preRestoreBackup: preRestoreBackupId,
            dryRun: options.dryRun
          },
          result: 'success',
          riskLevel: 'critical'
        });

        safeLogger.info(`Database restore completed successfully from backup: ${backupId}`);

      } catch (restoreError) {
        safeLogger.error(`Restore failed, attempting to rollback: ${restoreError}`);
        
        // Attempt to restore from pre-restore backup
        try {
          const preRestoreMetadata = await this.getBackupMetadata(preRestoreBackupId);
          if (preRestoreMetadata) {
            const rollbackFilePath = await this.prepareRestoreFile(preRestoreMetadata);
            await this.performDatabaseRestore(rollbackFilePath, { dryRun: false, validateIntegrity: false });
            safeLogger.info('Successfully rolled back to pre-restore state');
          }
        } catch (rollbackError) {
          safeLogger.error(`Rollback failed: ${rollbackError}`);
        }

        throw restoreError;
      } finally {
        // Cleanup temporary files
        try {
          await fs.unlink(restoreFilePath);
        } catch (error) {
          // Ignore cleanup errors
        }
      }

    } catch (error) {
      safeLogger.error(`Restore failed: ${error}`);
      
      await AuditService.logEvent({
        action: 'backup.restore_failed',
        resourceType: 'system',
        resourceId: backupId,
        ipAddress: 'system',
        details: { error: String(error) },
        result: 'error',
        riskLevel: 'critical'
      });

      throw error;
    }
  }

  /**
   * Validate backup integrity
   */
  async validateBackupIntegrity(metadata: BackupMetadata): Promise<boolean> {
    try {
      // Check if file exists
      const exists = await fs.access(metadata.filePath).then(() => true).catch(() => false);
      if (!exists) {
        safeLogger.error(`Backup file not found: ${metadata.filePath}`);
        return false;
      }

      // Verify checksum
      const currentChecksum = await this.calculateChecksum(metadata.filePath);
      if (currentChecksum !== metadata.checksum) {
        safeLogger.error(`Backup checksum mismatch for ${metadata.id}`);
        return false;
      }

      // Additional validation for encrypted files
      if (metadata.encrypted && metadata.encryptionKeyId) {
        const canDecrypt = await this.testDecryption(metadata.filePath, metadata.encryptionKeyId);
        if (!canDecrypt) {
          safeLogger.error(`Cannot decrypt backup ${metadata.id}`);
          return false;
        }
      }

      safeLogger.info(`Backup integrity validation passed for ${metadata.id}`);
      return true;

    } catch (error) {
      safeLogger.error(`Integrity validation failed: ${error}`);
      return false;
    }
  }

  /**
   * List available backups
   */
  async listBackups(limit: number = 50): Promise<BackupMetadata[]> {
    try {
      const backups = await prisma.systemBackup.findMany({
        take: limit,
        orderBy: { startedAt: 'desc' },
        where: { status: 'completed' }
      });

      return backups.map(backup => ({
        id: backup.id,
        type: backup.type,
        timestamp: backup.startedAt,
        size: Number(backup.fileSize || 0),
        checksum: backup.checksumSha256 || '',
        encrypted: !!backup.encryptionKey,
        compressionType: 'gzip', // Default assumption
        tables: [], // Would need to be stored separately
        filePath: backup.filePath || '',
        encryptionKeyId: backup.encryptionKey || undefined
      }));

    } catch (error) {
      safeLogger.error(`Failed to list backups: ${error}`);
      return [];
    }
  }

  /**
   * Test backup and restore process
   */
  async testBackupRestore(): Promise<boolean> {
    safeLogger.info('Starting backup/restore test');

    try {
      // Create a test backup
      const backupId = await this.createBackup({
        type: 'full',
        compression: 'gzip',
        encryption: true,
        retention: { daily: 1, weekly: 0, monthly: 0 }
      });

      // Validate the backup
      const metadata = await this.getBackupMetadata(backupId);
      if (!metadata) {
        throw new Error('Test backup metadata not found');
      }

      const isValid = await this.validateBackupIntegrity(metadata);
      if (!isValid) {
        throw new Error('Test backup integrity validation failed');
      }

      // Test dry run restore
      await this.restoreBackup(backupId, { 
        dryRun: true, 
        validateIntegrity: true 
      });

      safeLogger.info('Backup/restore test completed successfully');
      return true;

    } catch (error) {
      safeLogger.error(`Backup/restore test failed: ${error}`);
      return false;
    }
  }

  /**
   * Cleanup old backups based on retention policy
   */
  async cleanupOldBackups(retentionPolicy: BackupConfig['retention']): Promise<number> {
    try {
      const now = new Date();
      let cleanedCount = 0;

      // Get all backups
      const backups = await this.listBackups(1000);

      for (const backup of backups) {
        const ageInDays = (now.getTime() - backup.timestamp.getTime()) / (1000 * 60 * 60 * 24);
        let shouldDelete = false;

        // Apply retention policy
        if (backup.type === 'full') {
          if (ageInDays > retentionPolicy.monthly * 30) {
            shouldDelete = true;
          }
        } else if (backup.type === 'incremental') {
          if (ageInDays > retentionPolicy.daily) {
            shouldDelete = true;
          }
        }

        if (shouldDelete) {
          await this.deleteBackup(backup.id);
          cleanedCount++;
        }
      }

      safeLogger.info(`Cleaned up ${cleanedCount} old backups`);
      return cleanedCount;

    } catch (error) {
      safeLogger.error(`Backup cleanup failed: ${error}`);
      return 0;
    }
  }

  // Private helper methods

  private parseDatabaseUrl(url: string): any {
    const parsed = new URL(url);
    return {
      host: parsed.hostname,
      port: parsed.port || 5432,
      database: parsed.pathname.slice(1),
      username: parsed.username,
      password: parsed.password
    };
  }

  private async createDatabaseDump(dbConfig: any, config: BackupConfig, outputPath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const args = [
        '-h', dbConfig.host,
        '-p', dbConfig.port.toString(),
        '-U', dbConfig.username,
        '-d', dbConfig.database,
        '-f', outputPath,
        '--verbose',
        '--no-password'
      ];

      // Add table-specific options
      if (config.includeTables) {
        config.includeTables.forEach(table => {
          args.push('-t', table);
        });
      }

      if (config.excludeTables) {
        config.excludeTables.forEach(table => {
          args.push('-T', table);
        });
      }

      const pgDump = spawn('pg_dump', args, {
        env: { ...process.env, PGPASSWORD: dbConfig.password }
      });

      pgDump.on('close', (code) => {
        if (code === 0) {
          resolve(outputPath);
        } else {
          reject(new Error(`pg_dump failed with code ${code}`));
        }
      });

      pgDump.on('error', reject);
    });
  }

  private async compressFile(filePath: string, compression: 'gzip' | 'lz4'): Promise<string> {
    const outputPath = `${filePath}.${compression === 'gzip' ? 'gz' : 'lz4'}`;
    
    if (compression === 'gzip') {
      await execAsync(`gzip -c "${filePath}" > "${outputPath}"`);
    } else {
      await execAsync(`lz4 -c "${filePath}" > "${outputPath}"`);
    }

    return outputPath;
  }

  private async encryptFile(filePath: string): Promise<{ encryptedPath: string; keyId: string }> {
    const keyId = crypto.randomUUID();
    const encryptionKey = crypto.randomBytes(32);
    
    // Store encryption key in secrets manager
    await secretsManager.createSecret(`backup_key_${keyId}`, encryptionKey.toString('hex'), {
      tags: ['backup', 'encryption'],
      rotationInterval: 90
    });

    const outputPath = `${filePath}.enc`;
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipheriv('aes-256-cbc', encryptionKey, iv);
    
    const input = await fs.readFile(filePath);
    const encrypted = Buffer.concat([cipher.update(input), cipher.final()]);
    
    await fs.writeFile(outputPath, Buffer.concat([iv, encrypted]));

    return { encryptedPath: outputPath, keyId };
  }

  private async calculateChecksum(filePath: string): Promise<string> {
    const hash = crypto.createHash('sha256');
    const data = await fs.readFile(filePath);
    hash.update(data);
    return hash.digest('hex');
  }

  private async getTableList(): Promise<string[]> {
    try {
      const result = await prisma.$queryRaw<Array<{ tablename: string }>>`
        SELECT tablename FROM pg_tables WHERE schemaname = 'public'
      `;
      return result.map(row => row.tablename);
    } catch (error) {
      safeLogger.error('Failed to get table list:', error);
      return [];
    }
  }

  private async storeBackupMetadata(metadata: BackupMetadata): Promise<void> {
    await prisma.systemBackup.create({
      data: {
        id: metadata.id,
        type: metadata.type,
        status: 'completed',
        filePath: metadata.filePath,
        encryptionKey: metadata.encryptionKeyId,
        fileSize: BigInt(metadata.size),
        checksumSha256: metadata.checksum,
        startedAt: metadata.timestamp,
        completedAt: new Date()
      }
    });
  }

  private async getBackupMetadata(backupId: string): Promise<BackupMetadata | null> {
    try {
      const backup = await prisma.systemBackup.findUnique({
        where: { id: backupId }
      });

      if (!backup || !backup.filePath) {
        return null;
      }

      return {
        id: backup.id,
        type: backup.type,
        timestamp: backup.startedAt,
        size: Number(backup.fileSize || 0),
        checksum: backup.checksumSha256 || '',
        encrypted: !!backup.encryptionKey,
        compressionType: 'gzip',
        tables: [],
        filePath: backup.filePath,
        encryptionKeyId: backup.encryptionKey || undefined
      };

    } catch (error) {
      safeLogger.error(`Failed to get backup metadata: ${error}`);
      return null;
    }
  }

  private async prepareRestoreFile(metadata: BackupMetadata): Promise<string> {
    let currentPath = metadata.filePath;
    
    // Decrypt if encrypted
    if (metadata.encrypted && metadata.encryptionKeyId) {
      currentPath = await this.decryptFile(currentPath, metadata.encryptionKeyId);
    }

    // Decompress if compressed
    if (metadata.compressionType !== 'none') {
      currentPath = await this.decompressFile(currentPath, metadata.compressionType);
    }

    return currentPath;
  }

  private async decryptFile(filePath: string, keyId: string): Promise<string> {
    const encryptionKeyHex = await secretsManager.getSecret(`backup_key_${keyId}`);
    if (!encryptionKeyHex) {
      throw new Error(`Encryption key not found: ${keyId}`);
    }

    const encryptionKey = Buffer.from(encryptionKeyHex, 'hex');
    const outputPath = path.join(this.tempDir, `decrypted_${Date.now()}.sql`);
    const encryptedData = await fs.readFile(filePath);
    
    const iv = encryptedData.slice(0, 16);
    const encrypted = encryptedData.slice(16);
    
    const decipher = crypto.createDecipheriv('aes-256-cbc', encryptionKey, iv);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    
    await fs.writeFile(outputPath, decrypted);
    return outputPath;
  }

  private async decompressFile(filePath: string, compression: string): Promise<string> {
    const outputPath = path.join(this.tempDir, `decompressed_${Date.now()}.sql`);
    
    if (compression === 'gzip') {
      await execAsync(`gunzip -c "${filePath}" > "${outputPath}"`);
    } else if (compression === 'lz4') {
      await execAsync(`lz4 -d -c "${filePath}" > "${outputPath}"`);
    }

    return outputPath;
  }

  private async performDatabaseRestore(filePath: string, options: RestoreOptions): Promise<void> {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      throw new Error('DATABASE_URL not configured');
    }

    const dbConfig = this.parseDatabaseUrl(dbUrl);

    return new Promise((resolve, reject) => {
      const args = [
        '-h', dbConfig.host,
        '-p', dbConfig.port.toString(),
        '-U', dbConfig.username,
        '-d', dbConfig.database,
        '-f', filePath,
        '--verbose',
        '--no-password'
      ];

      const psql = spawn('psql', args, {
        env: { ...process.env, PGPASSWORD: dbConfig.password }
      });

      psql.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Database restore failed with code ${code}`));
        }
      });

      psql.on('error', reject);
    });
  }

  private async testDecryption(filePath: string, keyId: string): Promise<boolean> {
    try {
      const tempPath = await this.decryptFile(filePath, keyId);
      await fs.unlink(tempPath);
      return true;
    } catch (error) {
      return false;
    }
  }

  private async deleteBackup(backupId: string): Promise<void> {
    try {
      const metadata = await this.getBackupMetadata(backupId);
      if (metadata) {
        // Delete physical file
        await fs.unlink(metadata.filePath).catch(() => {}); // Ignore if file doesn't exist
        
        // Delete encryption key
        if (metadata.encryptionKeyId) {
          await secretsManager.deleteSecret(`backup_key_${metadata.encryptionKeyId}`);
        }
      }

      // Delete database record
      await prisma.systemBackup.delete({
        where: { id: backupId }
      });

    } catch (error) {
      safeLogger.error(`Failed to delete backup ${backupId}: ${error}`);
      throw error;
    }
  }

  private formatBytes(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }
}

export const backupService = new BackupService();
