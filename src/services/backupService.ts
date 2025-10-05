import prisma from '@/lib/prisma';
import { exec } from 'child_process';
import fs from 'fs/promises';
import cron from 'node-cron';
import path from 'path';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Backup and Disaster Recovery Service
 */
export class BackupService {
  private backupDir = process.env.BACKUP_DIR || './backups';
  private maxBackups = parseInt(process.env.MAX_BACKUPS || '30');

  constructor() {
    this.initializeBackupDirectory();
    this.scheduleBackups();
  }

  /**
   * Initialize backup directory
   */
  private async initializeBackupDirectory() {
    try {
      await fs.mkdir(this.backupDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create backup directory:', error);
    }
  }

  /**
   * Schedule automated backups
   */
  private scheduleBackups() {
    // Daily full backup at 2 AM
    cron.schedule('0 2 * * *', () => {
      this.performFullBackup();
    });

    // Hourly incremental backup during business hours
    cron.schedule('0 9-17 * * *', () => {
      this.performIncrementalBackup();
    });

    // Weekly cleanup of old backups
    cron.schedule('0 3 * * 0', () => {
      this.cleanupOldBackups();
    });
  }

  /**
   * Perform full database backup
   */
  async performFullBackup(): Promise<void> {
    const backupId = await this.createBackupRecord('full');
    
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `full-backup-${timestamp}.sql`;
      const filepath = path.join(this.backupDir, filename);
      
      const dbUrl = process.env.DATABASE_URL;
      if (!dbUrl) throw new Error('DATABASE_URL not configured');
      
      // Extract connection details from DATABASE_URL
      const url = new URL(dbUrl);
      const command = `pg_dump -h ${url.hostname} -p ${url.port} -U ${url.username} -d ${url.pathname.slice(1)} -f ${filepath}`;
      
      await execAsync(command, {
        env: { ...process.env, PGPASSWORD: url.password }
      });
      
      const stats = await fs.stat(filepath);
      
      await this.updateBackupRecord(backupId, {
        status: 'completed',
        filePath: filepath,
        fileSize: BigInt(stats.size),
      });
      
      console.log(`Full backup completed: ${filename}`);
      
    } catch (error) {
      await this.updateBackupRecord(backupId, {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      
      console.error('Full backup failed:', error);
    }
  }

  /**
   * Perform incremental backup (transactions since last backup)
   */
  async performIncrementalBackup(): Promise<void> {
    const backupId = await this.createBackupRecord('incremental');
    
    try {
      const lastBackup = await prisma.systemBackup.findFirst({
        where: {
          type: { in: ['full', 'incremental'] },
          status: 'completed'
        },
        orderBy: { completedAt: 'desc' }
      });
      
      const since = lastBackup?.completedAt || new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      // Export recent transaction logs
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `incremental-backup-${timestamp}.json`;
      const filepath = path.join(this.backupDir, filename);
      
      // Get recent audit logs
      const auditLogs = await prisma.auditLog.findMany({
        where: {
          timestamp: { gte: since }
        },
        orderBy: { timestamp: 'desc' }
      });
      
      await fs.writeFile(filepath, JSON.stringify({
        type: 'incremental',
        since: since.toISOString(),
        timestamp: new Date().toISOString(),
        data: auditLogs
      }, null, 2));
      
      const stats = await fs.stat(filepath);
      
      await this.updateBackupRecord(backupId, {
        status: 'completed',
        filePath: filepath,
        fileSize: BigInt(stats.size),
      });
      
      console.log(`Incremental backup completed: ${filename}`);
      
    } catch (error) {
      await this.updateBackupRecord(backupId, {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      
      console.error('Incremental backup failed:', error);
    }
  }

  /**
   * Backup application logs
   */
  async backupLogs(): Promise<void> {
    const backupId = await this.createBackupRecord('logs');
    
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `logs-backup-${timestamp}.json`;
      const filepath = path.join(this.backupDir, filename);
      
      // Get security and audit logs
      const [securityLogs, auditLogs] = await Promise.all([
        prisma.securityLog.findMany({
          where: {
            timestamp: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
          }
        }),
        prisma.auditLog.findMany({
          where: {
            timestamp: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
          }
        })
      ]);
      
      await fs.writeFile(filepath, JSON.stringify({
        type: 'logs',
        timestamp: new Date().toISOString(),
        securityLogs,
        auditLogs
      }, null, 2));
      
      const stats = await fs.stat(filepath);
      
      await this.updateBackupRecord(backupId, {
        status: 'completed',
        filePath: filepath,
        fileSize: BigInt(stats.size),
      });
      
    } catch (error) {
      await this.updateBackupRecord(backupId, {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Restore from backup
   */
  async restoreFromBackup(backupId: string): Promise<void> {
    const backup = await prisma.systemBackup.findUnique({
      where: { id: backupId }
    });
    
    if (!backup || !backup.filePath) {
      throw new Error('Backup not found');
    }
    
    if (backup.type === 'full') {
      await this.restoreFullBackup(backup.filePath);
    } else if (backup.type === 'incremental') {
      await this.restoreIncrementalBackup(backup.filePath);
    }
  }

  /**
   * Clean up old backups
   */
  async cleanupOldBackups(): Promise<void> {
    try {
      const oldBackups = await prisma.systemBackup.findMany({
        where: {
          startedAt: {
            lt: new Date(Date.now() - this.maxBackups * 24 * 60 * 60 * 1000)
          }
        }
      });
      
      for (const backup of oldBackups) {
        if (backup.filePath) {
          try {
            await fs.unlink(backup.filePath);
          } catch (error) {
            console.warn(`Failed to delete backup file: ${backup.filePath}`, error);
          }
        }
        
        await prisma.systemBackup.delete({
          where: { id: backup.id }
        });
      }
      
      console.log(`Cleaned up ${oldBackups.length} old backups`);
      
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  }

  /**
   * Get backup status and statistics
   */
  async getBackupStatus() {
    const [recentBackups, totalSize] = await Promise.all([
      prisma.systemBackup.findMany({
        orderBy: { startedAt: 'desc' },
        take: 10
      }),
      prisma.systemBackup.aggregate({
        _sum: { fileSize: true },
        where: { status: 'completed' }
      })
    ]);
    
    return {
      recentBackups,
      totalSize: totalSize._sum.fileSize || 0,
      backupDirectory: this.backupDir,
      maxRetention: this.maxBackups
    };
  }

  // Helper methods
  private async createBackupRecord(type: string): Promise<string> {
    const backup = await prisma.systemBackup.create({
      data: {
        type,
        status: 'running',
        startedAt: new Date(),
      }
    });
    
    return backup.id;
  }

  private async updateBackupRecord(id: string, data: {
    status: string;
    filePath?: string;
    fileSize?: bigint;
    error?: string;
  }) {
    await prisma.systemBackup.update({
      where: { id },
      data: {
        ...data,
        completedAt: new Date(),
      }
    });
  }

  private async restoreFullBackup(filepath: string): Promise<void> {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) throw new Error('DATABASE_URL not configured');
    
    const url = new URL(dbUrl);
    const command = `psql -h ${url.hostname} -p ${url.port} -U ${url.username} -d ${url.pathname.slice(1)} -f ${filepath}`;
    
    await execAsync(command, {
      env: { ...process.env, PGPASSWORD: url.password }
    });
  }

  private async restoreIncrementalBackup(filepath: string): Promise<void> {
    const data = JSON.parse(await fs.readFile(filepath, 'utf-8'));
    // Implement incremental restore logic based on audit logs
    console.log('Incremental restore not yet implemented', data);
  }
}

export default new BackupService();
