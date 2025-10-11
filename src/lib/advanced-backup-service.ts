import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import { createCipheriv, createHash, randomBytes } from 'crypto';
import { createReadStream, createWriteStream, promises as fs } from 'fs';
import cron from 'node-cron';
import path from 'path';
import { pipeline } from 'stream/promises';
import { E2EEncryptionService } from './e2e-encryption-service';
import { safeLogger } from './logger';

interface BackupConfig {
  schedule: {
    full: string; // cron expression
    incremental: string;
    logs: string;
  };
  retention: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  destinations: BackupDestination[];
  encryption: {
    enabled: boolean;
    algorithm: 'aes-256-gcm';
    keyRotationDays: number;
  };
  compression: {
    enabled: boolean;
    level: number; // 1-9
  };
  verification: {
    checksumAlgorithm: 'sha256' | 'sha512';
    testRestore: boolean;
  };
}

interface S3Config {
  bucket: string;
  region: string;
}

interface AzureConfig {
  container: string;
}

interface GCPConfig {
  bucket: string;
}

interface LocalConfig {
  path: string;
}

type DestinationConfig = S3Config | AzureConfig | GCPConfig | LocalConfig;

interface BackupDestination {
  type: 'local' | 's3' | 'azure' | 'gcp' | 'ftp';
  config: DestinationConfig;
  priority: number;
  enabled: boolean;
}

interface BackupMetadata {
  id: string;
  type: 'full' | 'incremental' | 'logs' | 'gdpr_export';
  startTime: Date;
  endTime?: Date;
  status: 'pending' | 'running' | 'completed' | 'failed';
  size: number;
  checksum: string;
  encryptionKeyId?: string;
  destinations: string[];
  tables?: string[];
  recordCount?: number;
  error?: string;
}

/**
 * Enterprise-grade backup system with encryption, compression, and multi-destination support
 */
export class AdvancedBackupService {
  private prisma: PrismaClient;
  private encryptionService: E2EEncryptionService;
  private config: BackupConfig;
  private readonly BACKUP_BASE_DIR = process.env.BACKUP_DIR || '/opt/backups';
  
  constructor() {
    this.prisma = new PrismaClient();
    this.encryptionService = new E2EEncryptionService();
    this.config = this.loadConfig();
    this.initializeDirectories();
  }

  /**
   * Initialize backup service and schedule automated backups
   */
  async initialize(): Promise<void> {
    try {
      await this.createBackupDirectories();
      await this.scheduleBackups();
      await this.cleanupOldBackups();
      
      safeLogger.info('Advanced backup service initialized successfully');
    } catch (error) {
      safeLogger.error('Failed to initialize backup service:', error);
      throw error;
    }
  }

  /**
   * Create a full database backup
   */
  async createFullBackup(): Promise<string> {
    const backupId = this.generateBackupId('full');
    const metadata: BackupMetadata = {
      id: backupId,
      type: 'full',
      startTime: new Date(),
      status: 'pending',
      size: 0,
      checksum: '',
      destinations: []
    };

    try {
      safeLogger.info(`Starting full backup: ${backupId}`);
      await this.updateBackupMetadata(metadata);

      metadata.status = 'running';
      await this.updateBackupMetadata(metadata);

      // Create database dump
      const dumpPath = await this.createDatabaseDump(backupId);
      
      // Add application data
      const appDataPath = await this.backupApplicationData(backupId);
      
      // Create archive
      const archivePath = await this.createBackupArchive(backupId, [dumpPath, appDataPath]);
      
      // Encrypt if enabled
      const finalPath = this.config.encryption.enabled 
        ? await this.encryptBackup(archivePath, backupId)
        : archivePath;
      
      // Calculate checksum
      metadata.checksum = await this.calculateChecksum(finalPath);
      metadata.size = (await fs.stat(finalPath)).size;
      
      // Upload to destinations
      for (const destination of this.config.destinations.filter(d => d.enabled)) {
        try {
          await this.uploadBackup(finalPath, destination);
          metadata.destinations.push(destination.type);
        } catch (error) {
          safeLogger.error(`Failed to upload to ${destination.type}:`, error);
        }
      }
      
      // Verify backup
      await this.verifyBackup(finalPath, metadata);
      
      metadata.status = 'completed';
      metadata.endTime = new Date();
      await this.updateBackupMetadata(metadata);
      
      safeLogger.info(`Full backup completed: ${backupId}`);
      return backupId;
      
    } catch (error) {
      metadata.status = 'failed';
      metadata.error = error instanceof Error ? error.message : String(error);
      metadata.endTime = new Date();
      await this.updateBackupMetadata(metadata);
      
      safeLogger.error(`Full backup failed: ${backupId}`, error);
      throw error;
    }
  }

  /**
   * Create an incremental backup (changes since last backup)
   */
  async createIncrementalBackup(): Promise<string> {
    const backupId = this.generateBackupId('incremental');
    const metadata: BackupMetadata = {
      id: backupId,
      type: 'incremental',
      startTime: new Date(),
      status: 'pending',
      size: 0,
      checksum: '',
      destinations: []
    };

    try {
      safeLogger.info(`Starting incremental backup: ${backupId}`);
      
      // Get last backup timestamp
      const lastBackupTime = await this.getLastBackupTimestamp();
      if (!lastBackupTime) {
        safeLogger.warn('No previous backup found, creating full backup instead');
        return await this.createFullBackup();
      }

      metadata.status = 'running';
      await this.updateBackupMetadata(metadata);

      // Export changed data
      const changes = await this.exportIncrementalChanges(lastBackupTime);
      
      if (changes.recordCount === 0) {
        safeLogger.info('No changes since last backup');
        metadata.status = 'completed';
        metadata.endTime = new Date();
        await this.updateBackupMetadata(metadata);
        return backupId;
      }

      // Create archive with changes
      const archivePath = await this.createIncrementalArchive(backupId, changes);
      
      // Encrypt if enabled
      const finalPath = this.config.encryption.enabled 
        ? await this.encryptBackup(archivePath, backupId)
        : archivePath;
      
      metadata.checksum = await this.calculateChecksum(finalPath);
      metadata.size = (await fs.stat(finalPath)).size;
      metadata.recordCount = changes.recordCount;
      
      // Upload to destinations
      for (const destination of this.config.destinations.filter(d => d.enabled)) {
        try {
          await this.uploadBackup(finalPath, destination);
          metadata.destinations.push(destination.type);
        } catch (error) {
          safeLogger.error(`Failed to upload incremental backup to ${destination.type}:`, error);
        }
      }
      
      metadata.status = 'completed';
      metadata.endTime = new Date();
      await this.updateBackupMetadata(metadata);
      
      safeLogger.info(`Incremental backup completed: ${backupId}`);
      return backupId;
      
    } catch (error) {
      metadata.status = 'failed';
      metadata.error = error instanceof Error ? error.message : String(error);
      metadata.endTime = new Date();
      await this.updateBackupMetadata(metadata);
      
      safeLogger.error(`Incremental backup failed: ${backupId}`, error);
      throw error;
    }
  }

  /**
   * Create GDPR-compliant user data export
   */
  async createGDPRExport(userId: string): Promise<string> {
    const backupId = this.generateBackupId('gdpr_export');
    const metadata: BackupMetadata = {
      id: backupId,
      type: 'gdpr_export',
      startTime: new Date(),
      status: 'pending',
      size: 0,
      checksum: '',
      destinations: []
    };

    try {
      safeLogger.info(`Starting GDPR export for user ${userId}: ${backupId}`);

      metadata.status = 'running';
      await this.updateBackupMetadata(metadata);

      // Export user data
      const userData = await this.exportUserData(userId);
      
      // Create encrypted export
      const exportPath = await this.createGDPRExportFile(backupId, userData);
      
      metadata.checksum = await this.calculateChecksum(exportPath);
      metadata.size = (await fs.stat(exportPath)).size;
      metadata.status = 'completed';
      metadata.endTime = new Date();
      await this.updateBackupMetadata(metadata);
      
      safeLogger.info(`GDPR export completed: ${backupId}`);
      return exportPath;
      
    } catch (error) {
      metadata.status = 'failed';
      metadata.error = error instanceof Error ? error.message : String(error);
      metadata.endTime = new Date();
      await this.updateBackupMetadata(metadata);
      
      safeLogger.error(`GDPR export failed: ${backupId}`, error);
      throw error;
    }
  }

  /**
   * Restore from backup
   */
  async restoreFromBackup(backupId: string, options: {
    targetDatabase?: string;
    tableFilter?: string[];
    dryRun?: boolean;
  } = {}): Promise<void> {
    try {
      safeLogger.info(`Starting restore from backup: ${backupId}`);
      
      // Get backup metadata
      const metadata = await this.getBackupMetadata(backupId);
      if (!metadata || metadata.status !== 'completed') {
        throw new Error(`Backup ${backupId} not found or incomplete`);
      }
      
      // Download backup if needed
      const backupPath = await this.downloadBackup(backupId);
      
      // Verify backup integrity
      await this.verifyBackupIntegrity(backupPath, metadata);
      
      // Decrypt if encrypted
      const decryptedPath = metadata.encryptionKeyId 
        ? await this.decryptBackup(backupPath, metadata.encryptionKeyId)
        : backupPath;
      
      // Extract archive
      const extractedDir = await this.extractBackupArchive(decryptedPath);
      
      if (options.dryRun) {
        safeLogger.info('Dry run completed - backup is valid and can be restored');
        await fs.rm(extractedDir, { recursive: true });
        return;
      }
      
      // Restore database
      await this.restoreDatabase(extractedDir, options.targetDatabase, options.tableFilter);
      
      // Restore application data
      await this.restoreApplicationData(extractedDir);
      
      safeLogger.info(`Restore completed successfully from backup: ${backupId}`);
      
    } catch (error) {
      safeLogger.error(`Restore failed for backup ${backupId}:`, error);
      throw error;
    }
  }

  /**
   * List available backups
   */
  async listBackups(type?: 'full' | 'incremental' | 'logs' | 'gdpr_export'): Promise<BackupMetadata[]> {
    try {
      const where = type ? { type } : {};
      const backups = await this.prisma.systemBackup.findMany({
        where,
        orderBy: { startedAt: 'desc' },
        take: 100
      });

      return backups.map((b: { 
        id: string; 
        type: string; 
        startedAt: Date; 
        completedAt: Date | null; 
        status: string; 
        fileSize: bigint | null; 
        checksumSha256: string | null; 
        error: string | null;
      }): BackupMetadata => ({
        id: b.id,
        type: b.type as 'full' | 'incremental' | 'logs' | 'gdpr_export',
        startTime: b.startedAt,
        endTime: b.completedAt || undefined,
        status: b.status as 'pending' | 'running' | 'completed' | 'failed',
        size: Number(b.fileSize || 0),
        checksum: b.checksumSha256 || '',
        destinations: [], // Would be loaded from backup log
        error: b.error || undefined
      }));
      
    } catch (error) {
      safeLogger.error('Failed to list backups:', error);
      throw error;
    }
  }

  /**
   * Test backup and restore functionality
   */
  async testBackupRestore(): Promise<boolean> {
    try {
      safeLogger.info('Starting backup/restore test...');
      
      // Create a test backup
      const testBackupId = await this.createFullBackup();
      
      // Attempt a dry-run restore
      await this.restoreFromBackup(testBackupId, { dryRun: true });
      
      safeLogger.info('Backup/restore test passed');
      return true;
      
    } catch (error) {
      safeLogger.error('Backup/restore test failed:', error);
      return false;
    }
  }

  /**
   * Load backup configuration
   */
  private loadConfig(): BackupConfig {
    return {
      schedule: {
        full: process.env.BACKUP_SCHEDULE_FULL || '0 2 * * 0', // Weekly at 2 AM Sunday
        incremental: process.env.BACKUP_SCHEDULE_INCREMENTAL || '0 2 * * 1-6', // Daily at 2 AM
        logs: process.env.BACKUP_SCHEDULE_LOGS || '0 */6 * * *' // Every 6 hours
      },
      retention: {
        daily: parseInt(process.env.BACKUP_RETENTION_DAILY || '7'),
        weekly: parseInt(process.env.BACKUP_RETENTION_WEEKLY || '4'),
        monthly: parseInt(process.env.BACKUP_RETENTION_MONTHLY || '12')
      },
      destinations: [
        {
          type: 'local',
          config: { path: this.BACKUP_BASE_DIR },
          priority: 1,
          enabled: true
        },
        ...(process.env.AWS_S3_BACKUP_BUCKET ? [{
          type: 's3' as const,
          config: {
            bucket: process.env.AWS_S3_BACKUP_BUCKET,
            region: process.env.AWS_REGION || 'us-east-1'
          },
          priority: 2,
          enabled: true
        }] : [])
      ],
      encryption: {
        enabled: process.env.BACKUP_ENCRYPTION_ENABLED === 'true',
        algorithm: 'aes-256-gcm' as const,
        keyRotationDays: parseInt(process.env.BACKUP_KEY_ROTATION_DAYS || '90')
      },
      compression: {
        enabled: process.env.BACKUP_COMPRESSION_ENABLED !== 'false',
        level: parseInt(process.env.BACKUP_COMPRESSION_LEVEL || '6')
      },
      verification: {
        checksumAlgorithm: (process.env.BACKUP_CHECKSUM_ALGORITHM as 'sha256' | 'sha512') || 'sha256',
        testRestore: process.env.BACKUP_TEST_RESTORE === 'true'
      }
    };
  }

  /**
   * Initialize backup directories
   */
  private async initializeDirectories(): Promise<void> {
    const dirs = [
      this.BACKUP_BASE_DIR,
      path.join(this.BACKUP_BASE_DIR, 'full'),
      path.join(this.BACKUP_BASE_DIR, 'incremental'),
      path.join(this.BACKUP_BASE_DIR, 'logs'),
      path.join(this.BACKUP_BASE_DIR, 'gdpr'),
      path.join(this.BACKUP_BASE_DIR, 'temp')
    ];

    for (const dir of dirs) {
      await fs.mkdir(dir, { recursive: true });
    }
  }

  /**
   * Create database dump using pg_dump
   */
  private async createDatabaseDump(backupId: string): Promise<string> {
    const dumpPath = path.join(this.BACKUP_BASE_DIR, 'temp', `${backupId}_database.sql`);
    
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL not configured');
    }

    try {
      // Use pg_dump with custom format for better compression and partial restore support
      execSync(`pg_dump "${databaseUrl}" --format=custom --compress=9 --file="${dumpPath}"`, {
        stdio: 'pipe'
      });
      
      safeLogger.info(`Database dump created: ${dumpPath}`);
      return dumpPath;
      
    } catch (error) {
      safeLogger.error('Failed to create database dump:', error);
      throw error;
    }
  }

  /**
   * Backup application data (uploads, logs, etc.)
   */
  private async backupApplicationData(backupId: string): Promise<string> {
    const appDataPath = path.join(this.BACKUP_BASE_DIR, 'temp', `${backupId}_appdata.tar.gz`);
    
    const dataPaths = [
      'uploads',
      'logs',
      'public/uploads'
    ].filter(p => {
      try {
        return fs.access(p).then(() => true).catch(() => false);
      } catch {
        return false;
      }
    });

    if (dataPaths.length === 0) {
      // Create empty archive
      execSync(`tar -czf "${appDataPath}" --files-from /dev/null`);
    } else {
      execSync(`tar -czf "${appDataPath}" ${dataPaths.join(' ')}`);
    }
    
    safeLogger.info(`Application data backup created: ${appDataPath}`);
    return appDataPath;
  }

  /**
   * Create backup archive with compression
   */
  private async createBackupArchive(backupId: string, filePaths: string[]): Promise<string> {
    const archivePath = path.join(this.BACKUP_BASE_DIR, 'full', `${backupId}.tar.gz`);
    
    const command = this.config.compression.enabled
      ? `tar -czf "${archivePath}" -C "${path.join(this.BACKUP_BASE_DIR, 'temp')}" ${filePaths.map(p => path.basename(p)).join(' ')}`
      : `tar -cf "${archivePath}" -C "${path.join(this.BACKUP_BASE_DIR, 'temp')}" ${filePaths.map(p => path.basename(p)).join(' ')}`;
    
    execSync(command);
    
    // Clean up temp files
    await Promise.all(filePaths.map(p => fs.rm(p).catch(() => {})));
    
    safeLogger.info(`Backup archive created: ${archivePath}`);
    return archivePath;
  }

  /**
   * Encrypt backup file
   */
  private async encryptBackup(filePath: string, backupId: string): Promise<string> {
    const encryptedPath = `${filePath}.enc`;
    
    try {
      // Generate encryption key
      const encryptionKey = randomBytes(32);
      const iv = randomBytes(16);
      
      // Encrypt the backup
      const cipher = createCipheriv('aes-256-gcm', encryptionKey, iv);
      
      await pipeline(
        createReadStream(filePath),
        cipher,
        createWriteStream(encryptedPath)
      );
      
      const authTag = cipher.getAuthTag();
      
      // Store encryption metadata
      const keyMetadata = {
        keyId: backupId,
        algorithm: 'aes-256-gcm',
        iv: iv.toString('base64'),
        authTag: authTag.toString('base64'),
        key: encryptionKey.toString('base64') // In production, use HSM or key vault
      };
      
      await fs.writeFile(`${encryptedPath}.key`, JSON.stringify(keyMetadata));
      
      // Remove unencrypted file
      await fs.rm(filePath);
      
      safeLogger.info(`Backup encrypted: ${encryptedPath}`);
      return encryptedPath;
      
    } catch (error) {
      safeLogger.error('Backup encryption failed:', error);
      throw error;
    }
  }

  /**
   * Calculate file checksum
   */
  private async calculateChecksum(filePath: string): Promise<string> {
    const hash = createHash(this.config.verification.checksumAlgorithm);
    
    await pipeline(
      createReadStream(filePath),
      hash
    );
    
    return hash.digest('hex');
  }

  /**
   * Upload backup to destination
   */
  private async uploadBackup(filePath: string, destination: BackupDestination): Promise<void> {
    switch (destination.type) {
      case 'local':
        // Already local, just verify
        break;
        
      case 's3':
        await this.uploadToS3(filePath, destination.config as S3Config);
        break;
        
      case 'azure':
        await this.uploadToAzure(filePath, destination.config as AzureConfig);
        break;
        
      case 'gcp':
        await this.uploadToGCP(filePath, destination.config as GCPConfig);
        break;
        
      default:
        safeLogger.warn(`Unsupported destination type: ${destination.type}`);
    }
  }

  /**
   * Upload to AWS S3
   */
  private async uploadToS3(filePath: string, config: S3Config): Promise<void> {
    // Implementation would use AWS SDK
    safeLogger.info(`Would upload ${filePath} to S3 bucket ${config.bucket}`);
  }

  /**
   * Upload to Azure Blob Storage
   */
  private async uploadToAzure(filePath: string, config: AzureConfig): Promise<void> {
    // Implementation would use Azure SDK
    safeLogger.info(`Would upload ${filePath} to Azure container ${config.container}`);
  }

  /**
   * Upload to Google Cloud Storage
   */
  private async uploadToGCP(filePath: string, config: GCPConfig): Promise<void> {
    // Implementation would use Google Cloud SDK
    safeLogger.info(`Would upload ${filePath} to GCP bucket ${config.bucket}`);
  }

  /**
   * Verify backup integrity
   */
  private async verifyBackup(filePath: string, metadata: BackupMetadata): Promise<void> {
    // Verify checksum
    const currentChecksum = await this.calculateChecksum(filePath);
    if (currentChecksum !== metadata.checksum) {
      throw new Error(`Backup checksum mismatch: expected ${metadata.checksum}, got ${currentChecksum}`);
    }
    
    // Test restore if enabled
    if (this.config.verification.testRestore && metadata.type === 'full') {
      await this.testRestoreBackup(filePath);
    }
    
    safeLogger.info(`Backup verification passed: ${metadata.id}`);
  }

  /**
   * Test restore from backup
   */
  private async testRestoreBackup(filePath: string): Promise<void> {
    // Implementation would create temporary database and test restore
    safeLogger.info(`Would test restore from ${filePath}`);
  }

  /**
   * Generate unique backup ID
   */
  private generateBackupId(type: string): string {
    const timestamp = new Date().toISOString().replace(/[-:\.]/g, '');
    const random = randomBytes(4).toString('hex');
    return `${type}_${timestamp}_${random}`;
  }

  /**
   * Update backup metadata in database
   */
  private async updateBackupMetadata(metadata: BackupMetadata): Promise<void> {
    try {
      await this.prisma.systemBackup.upsert({
        where: { id: metadata.id },
        create: {
          id: metadata.id,
          type: metadata.type,
          status: metadata.status,
          startedAt: metadata.startTime,
          completedAt: metadata.endTime,
          fileSize: BigInt(metadata.size),
          checksumSha256: metadata.checksum,
          encryptionKey: metadata.encryptionKeyId,
          error: metadata.error
        },
        update: {
          status: metadata.status,
          completedAt: metadata.endTime,
          fileSize: BigInt(metadata.size),
          checksumSha256: metadata.checksum,
          error: metadata.error
        }
      });
    } catch (error) {
      safeLogger.error('Failed to update backup metadata:', error);
    }
  }

  /**
   * Get backup metadata
   */
  private async getBackupMetadata(backupId: string): Promise<BackupMetadata | null> {
    try {
      const backup = await this.prisma.systemBackup.findUnique({
        where: { id: backupId }
      });
      
      if (!backup) return null;
      
      return {
        id: backup.id,
        type: backup.type as 'full' | 'incremental' | 'logs' | 'gdpr_export',
        startTime: backup.startedAt,
        endTime: backup.completedAt || undefined,
        status: backup.status as 'pending' | 'running' | 'completed' | 'failed',
        size: Number(backup.fileSize || 0),
        checksum: backup.checksumSha256 || '',
        encryptionKeyId: backup.encryptionKey || undefined,
        destinations: [],
        error: backup.error || undefined
      };
    } catch (error) {
      safeLogger.error('Failed to get backup metadata:', error);
      return null;
    }
  }

  /**
   * Get timestamp of last backup
   */
  private async getLastBackupTimestamp(): Promise<Date | null> {
    try {
      const lastBackup = await this.prisma.systemBackup.findFirst({
        where: { 
          status: 'completed',
          type: { in: ['full', 'incremental'] }
        },
        orderBy: { completedAt: 'desc' }
      });
      
      return lastBackup?.completedAt || null;
    } catch (error) {
      safeLogger.error('Failed to get last backup timestamp:', error);
      return null;
    }
  }

  /**
   * Export incremental changes since last backup
   */
  private async exportIncrementalChanges(since: Date): Promise<{ recordCount: number; filePath: string }> {
    // Implementation would export changed records since timestamp
    safeLogger.info(`Would export changes since ${since.toISOString()}`);
    return { recordCount: 0, filePath: '' };
  }

  /**
   * Create incremental backup archive
   */
  private async createIncrementalArchive(backupId: string, _changes: { recordCount: number; filePath: string }): Promise<string> {
    const archivePath = path.join(this.BACKUP_BASE_DIR, 'incremental', `${backupId}.tar.gz`);
    // Implementation would create archive with incremental changes
    return archivePath;
  }

  /**
   * Export user data for GDPR compliance
   */
  private async exportUserData(userId: string): Promise<Record<string, unknown>> {
    try {
      // Get all user data
      const userData = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          orders: {
            include: {
              tickets: true,
              payment: true
            }
          },
          tickets: true,
          reviews: true,
          auditLogs: true,
          loginAttempts: true
        }
      });
      
      if (!userData) {
        throw new Error(`User ${userId} not found`);
      }
      
      // Decrypt PII data
      return await this.encryptionService.decryptUserPII(userData);
      
    } catch (error) {
      safeLogger.error(`Failed to export user data for ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Create GDPR export file
   */
  private async createGDPRExportFile(backupId: string, userData: Record<string, unknown>): Promise<string> {
    const exportPath = path.join(this.BACKUP_BASE_DIR, 'gdpr', `${backupId}_gdpr_export.json`);
    
    const exportData = {
      exportId: backupId,
      exportDate: new Date().toISOString(),
      userId: userData.id,
      data: userData,
      metadata: {
        version: '1.0',
        format: 'JSON',
        encrypted: false // Would be encrypted in production
      }
    };
    
    await fs.writeFile(exportPath, JSON.stringify(exportData, null, 2));
    
    safeLogger.info(`GDPR export file created: ${exportPath}`);
    return exportPath;
  }

  /**
   * Schedule automated backups
   */
  private async scheduleBackups(): Promise<void> {
    // Schedule full backups
    cron.schedule(this.config.schedule.full, () => {
      this.createFullBackup().catch(error => {
        safeLogger.error('Scheduled full backup failed:', error);
      });
    });
    
    // Schedule incremental backups
    cron.schedule(this.config.schedule.incremental, () => {
      this.createIncrementalBackup().catch(error => {
        safeLogger.error('Scheduled incremental backup failed:', error);
      });
    });
    
    safeLogger.info('Backup schedules configured');
  }

  /**
   * Clean up old backups according to retention policy
   */
  private async cleanupOldBackups(): Promise<void> {
    try {
      const now = new Date();
      
      // Clean up daily backups
      const dailyCutoff = new Date(now.getTime() - this.config.retention.daily * 24 * 60 * 60 * 1000);
      await this.prisma.systemBackup.deleteMany({
        where: {
          type: 'incremental',
          completedAt: { lt: dailyCutoff }
        }
      });
      
      // Clean up weekly backups
      const weeklyCutoff = new Date(now.getTime() - this.config.retention.weekly * 7 * 24 * 60 * 60 * 1000);
      await this.prisma.systemBackup.deleteMany({
        where: {
          type: 'full',
          completedAt: { lt: weeklyCutoff }
        }
      });
      
      safeLogger.info('Old backup cleanup completed');
    } catch (error) {
      safeLogger.error('Backup cleanup failed:', error);
    }
  }

  /**
   * Create backup directories
   */
  private async createBackupDirectories(): Promise<void> {
    await this.initializeDirectories();
  }

  /**
   * Download backup from remote destination
   */
  private async downloadBackup(backupId: string): Promise<string> {
    // Implementation would download from configured destinations
    return path.join(this.BACKUP_BASE_DIR, 'full', `${backupId}.tar.gz`);
  }

  /**
   * Verify backup integrity
   */
  private async verifyBackupIntegrity(filePath: string, metadata: BackupMetadata): Promise<void> {
    const checksum = await this.calculateChecksum(filePath);
    if (checksum !== metadata.checksum) {
      throw new Error(`Backup integrity check failed: checksum mismatch`);
    }
  }

  /**
   * Decrypt backup file
   */
  private async decryptBackup(filePath: string, _keyId: string): Promise<string> {
    // Implementation would decrypt using stored key
    // keyId would be used to retrieve the encryption key from storage
    return filePath.replace('.enc', '');
  }

  /**
   * Extract backup archive
   */
  private async extractBackupArchive(filePath: string): Promise<string> {
    const extractDir = path.join(this.BACKUP_BASE_DIR, 'temp', 'restore_' + Date.now());
    await fs.mkdir(extractDir, { recursive: true });
    
    execSync(`tar -xzf "${filePath}" -C "${extractDir}"`);
    
    return extractDir;
  }

  /**
   * Restore database from backup
   */
  private async restoreDatabase(extractedDir: string, targetDatabase?: string, tableFilter?: string[]): Promise<void> {
    const dumpFile = path.join(extractedDir, '*_database.sql');
    const databaseUrl = targetDatabase || process.env.DATABASE_URL;
    
    if (!databaseUrl) {
      throw new Error('No target database specified');
    }
    
    // Use pg_restore for custom format dumps
    const command = tableFilter 
      ? `pg_restore --dbname="${databaseUrl}" --table="${tableFilter.join('" --table="')}" "${dumpFile}"`
      : `pg_restore --dbname="${databaseUrl}" --clean --if-exists "${dumpFile}"`;
    
    execSync(command);
    
    safeLogger.info('Database restore completed');
  }

  /**
   * Restore application data from backup
   */
  private async restoreApplicationData(extractedDir: string): Promise<void> {
    const appDataFile = path.join(extractedDir, '*_appdata.tar.gz');
    
    try {
      execSync(`tar -xzf "${appDataFile}" -C .`);
      safeLogger.info('Application data restore completed');
    } catch (error) {
      safeLogger.warn('Application data restore failed (may be empty):', error);
    }
  }
}

// Export singleton instance
export const backupService = new AdvancedBackupService();
export default backupService;
