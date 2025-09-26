#!/usr/bin/env ts-node
/**
 * Backup Management CLI Script
 */

import { program } from 'commander';
import { backupService } from '../src/lib/backup-service';

program
  .name('backup')
  .description('Backup management utilities')
  .version('1.0.0');

program
  .command('create')
  .description('Create a new backup')
  .option('-t, --type <type>', 'backup type (full|incremental)', 'full')
  .option('-c, --compression <type>', 'compression type (gzip|lz4|none)', 'gzip')
  .option('-e, --encrypt', 'encrypt the backup', false)
  .option('--include-tables <tables>', 'comma-separated list of tables to include')
  .option('--exclude-tables <tables>', 'comma-separated list of tables to exclude')
  .action(async (options) => {
    try {
      console.log('Creating backup...');
      
      const config = {
        type: options.type as 'full' | 'incremental',
        compression: options.compression as 'gzip' | 'lz4' | 'none',
        encryption: options.encrypt,
        retention: { daily: 7, weekly: 4, monthly: 12 },
        includeTables: options.includeTables ? options.includeTables.split(',') : undefined,
        excludeTables: options.excludeTables ? options.excludeTables.split(',') : undefined
      };

      const backupId = await backupService.createBackup(config);
      console.log(`Backup created successfully: ${backupId}`);

    } catch (error) {
      console.error('Backup creation failed:', error);
      process.exit(1);
    }
  });

program
  .command('restore <backupId>')
  .description('Restore from a backup')
  .option('--dry-run', 'perform a dry run without actually restoring', false)
  .option('--skip-validation', 'skip integrity validation', false)
  .option('--include-tables <tables>', 'comma-separated list of tables to include')
  .option('--exclude-tables <tables>', 'comma-separated list of tables to exclude')
  .action(async (backupId, options) => {
    try {
      console.log(`Restoring from backup: ${backupId}`);

      const restoreOptions = {
        dryRun: options.dryRun,
        validateIntegrity: !options.skipValidation,
        includeTables: options.includeTables ? options.includeTables.split(',') : undefined,
        excludeTables: options.excludeTables ? options.excludeTables.split(',') : undefined
      };

      await backupService.restoreBackup(backupId, restoreOptions);
      
      if (options.dryRun) {
        console.log('Dry run completed successfully');
      } else {
        console.log('Restore completed successfully');
      }

    } catch (error) {
      console.error('Restore failed:', error);
      process.exit(1);
    }
  });

program
  .command('list')
  .description('List available backups')
  .option('-l, --limit <number>', 'maximum number of backups to show', '20')
  .action(async (options) => {
    try {
      const backups = await backupService.listBackups(parseInt(options.limit));
      
      if (backups.length === 0) {
        console.log('No backups found');
        return;
      }

      console.log('\nAvailable Backups:');
      console.log('==================');
      
      for (const backup of backups) {
        const size = formatBytes(backup.size);
        const encrypted = backup.encrypted ? '🔒' : '🔓';
        const compressed = backup.compressionType !== 'none' ? '📦' : '📄';
        
        console.log(`ID: ${backup.id}`);
        console.log(`  Type: ${backup.type}`);
        console.log(`  Date: ${backup.timestamp.toISOString()}`);
        console.log(`  Size: ${size} ${encrypted} ${compressed}`);
        console.log(`  Tables: ${backup.tables.length}`);
        console.log('');
      }

    } catch (error) {
      console.error('Failed to list backups:', error);
      process.exit(1);
    }
  });

program
  .command('test')
  .description('Test backup and restore functionality')
  .action(async () => {
    try {
      console.log('Testing backup and restore functionality...');
      
      const success = await backupService.testBackupRestore();
      
      if (success) {
        console.log('✅ Backup/restore test passed');
      } else {
        console.log('❌ Backup/restore test failed');
        process.exit(1);
      }

    } catch (error) {
      console.error('Test failed:', error);
      process.exit(1);
    }
  });

program
  .command('cleanup')
  .description('Clean up old backups according to retention policy')
  .option('--daily <days>', 'daily backup retention in days', '7')
  .option('--weekly <weeks>', 'weekly backup retention in weeks', '4')
  .option('--monthly <months>', 'monthly backup retention in months', '12')
  .action(async (options) => {
    try {
      console.log('Cleaning up old backups...');
      
      const retentionPolicy = {
        daily: parseInt(options.daily),
        weekly: parseInt(options.weekly),
        monthly: parseInt(options.monthly)
      };

      const cleanedCount = await backupService.cleanupOldBackups(retentionPolicy);
      console.log(`Cleaned up ${cleanedCount} old backups`);

    } catch (error) {
      console.error('Cleanup failed:', error);
      process.exit(1);
    }
  });

program
  .command('validate <backupId>')
  .description('Validate backup integrity')
  .action(async (backupId) => {
    try {
      console.log(`Validating backup: ${backupId}`);
      
      const backups = await backupService.listBackups(1000);
      const backup = backups.find(b => b.id === backupId);
      
      if (!backup) {
        console.error('Backup not found');
        process.exit(1);
      }

      const isValid = await backupService.validateBackupIntegrity(backup);
      
      if (isValid) {
        console.log('✅ Backup integrity validation passed');
      } else {
        console.log('❌ Backup integrity validation failed');
        process.exit(1);
      }

    } catch (error) {
      console.error('Validation failed:', error);
      process.exit(1);
    }
  });

function formatBytes(bytes: number): string {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

if (require.main === module) {
  program.parse();
}
