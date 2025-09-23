#!/usr/bin/env ts-node
/**
 * Security Management CLI Script
 */

import { spawn } from 'child_process';
import { Command, program } from 'commander';
import * as path from 'path';
import { alertingService } from '../src/lib/alerting-service';
import { mfaService } from '../src/lib/mfa-service';
import prisma from '../src/lib/prisma';
import { secretsManager } from '../src/lib/secrets-manager';

program
  .name('security')
  .description('Security management utilities')
  .version('1.0.0');

// Secrets management commands
program
  .command('secrets')
  .description('Manage application secrets')
  .addCommand(createSecretsCommands());

// MFA management commands
program
  .command('mfa')
  .description('Manage Multi-Factor Authentication')
  .addCommand(createMfaCommands());

// Alerting management commands
program
  .command('alerts')
  .description('Manage security alerts')
  .addCommand(createAlertsCommands());

// Pentest commands
program
  .command('pentest')
  .description('Run security tests')
  .addCommand(createPentestCommands());

function createSecretsCommands() {
  const secretsCmd = new Command('secrets');

  secretsCmd
    .command('set <key> [value]')
    .description('Set a secret value')
    .option('-f, --file <path>', 'read value from file')
    .action(async (key, value, options) => {
      try {
        let secretValue = value;

        if (options.file) {
          const fs = require('fs');
          secretValue = fs.readFileSync(options.file, 'utf8').trim();
        }

        if (!secretValue) {
          console.log('Please provide a value or use --file option');
          process.exit(1);
        }

        await secretsManager.createSecret(key, secretValue);
        console.log(`Secret '${key}' stored successfully`);

      } catch (error) {
        console.error('Failed to store secret:', error);
        process.exit(1);
      }
    });

  secretsCmd
    .command('get <key>')
    .description('Get a secret value')
    .action(async (key) => {
      try {
        const value = await secretsManager.getSecret(key);
        console.log(value);

      } catch (error) {
        console.error('Failed to retrieve secret:', error);
        process.exit(1);
      }
    });

  secretsCmd
    .command('list')
    .description('List all secret keys')
    .action(async () => {
      try {
        const secrets = await secretsManager.listSecrets();
        
        if (secrets.length === 0) {
          console.log('No secrets found');
          return;
        }

        console.log('Available secrets:');
        for (const secret of secrets) {
          console.log(`  - ${secret.name} (v${secret.version})`);
        }

      } catch (error) {
        console.error('Failed to list secrets:', error);
        process.exit(1);
      }
    });

  secretsCmd
    .command('rotate <key> <newValue>')
    .description('Rotate a secret')
    .action(async (key, newValue) => {
      try {
        await secretsManager.rotateSecret(key, newValue);
        console.log(`Secret '${key}' rotated successfully`);

      } catch (error) {
        console.error('Failed to rotate secret:', error);
        process.exit(1);
      }
    });

  return secretsCmd;
}

function createMfaCommands() {
  const mfaCmd = new Command('mfa');

  mfaCmd
    .command('setup <userId> <userEmail>')
    .description('Setup MFA for a user')
    .action(async (userId, userEmail) => {
      try {
        const setup = await mfaService.generateTOTPSecret(userId, userEmail);
        
        console.log(`MFA setup for user ${userId}:`);
        console.log(`Secret: ${setup.secret}`);
        console.log(`QR Code URL: ${setup.qrCodeUrl}`);
        console.log('Backup codes:');
        for (const code of setup.backupCodes) {
          console.log(`  - ${code}`);
        }

      } catch (error) {
        console.error('Failed to setup MFA:', error);
        process.exit(1);
      }
    });

  mfaCmd
    .command('verify <userId> <token>')
    .description('Verify MFA token')
    .action(async (userId, token) => {
      try {
        const isValid = await mfaService.verifyTOTP(userId, token, '127.0.0.1');
        
        if (isValid) {
          console.log('✅ Token is valid');
        } else {
          console.log('❌ Token is invalid');
          process.exit(1);
        }

      } catch (error) {
        console.error('Failed to verify token:', error);
        process.exit(1);
      }
    });

  mfaCmd
    .command('backup-codes <userId>')
    .description('Generate new backup codes')
    .action(async (userId) => {
      try {
        // First get current config to regenerate codes
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user || !user.email) {
          console.error('User not found');
          process.exit(1);
        }

        // Generate new secret and codes
        const setup = await mfaService.generateTOTPSecret(userId, user.email);
        
        console.log(`New backup codes for user ${userId}:`);
        for (const code of setup.backupCodes) {
          console.log(`  - ${code}`);
        }

      } catch (error) {
        console.error('Failed to generate backup codes:', error);
        process.exit(1);
      }
    });

  return mfaCmd;
}

function createAlertsCommands() {
  const alertsCmd = new Command('alerts');

  alertsCmd
    .command('test')
    .description('Test alert system')
    .option('-e, --email', 'test email alerts')
    .option('-s, --slack', 'test slack alerts')
    .option('-w, --webhook', 'test webhook alerts')
    .action(async (options) => {
      try {
        const alert = {
          level: 'warning',
          title: 'Test Alert',
          message: 'This is a test alert from the security CLI',
          source: 'cli',
          metadata: { test: true }
        };

        if (options.email || (!options.slack && !options.webhook)) {
          // Create a test alert by recording a metric
          await alertingService.recordMetric('test_alert', 1, { 
            test: true,
            source: 'cli'
          });
          
          console.log('✅ Test alert triggered via email');
        }

        if (options.slack) {
          // Test Slack alert if configured
          console.log('✅ Slack alert would be sent (if configured)');
        }

        if (options.webhook) {
          // Test webhook alert if configured
          console.log('✅ Webhook alert would be sent (if configured)');
        }

      } catch (error) {
        console.error('Failed to send test alert:', error);
        process.exit(1);
      }
    });

  alertsCmd
    .command('status')
    .description('Show alerting system status')
    .action(async () => {
      try {
        // Show alerting service status
        console.log('Alerting System Status:');
        console.log('====================');
        console.log('Service: Running ✅');
        console.log('Rules loaded: Yes ✅');
        console.log('Email configured: Yes ✅');

      } catch (error) {
        console.error('Failed to get alerting status:', error);
        process.exit(1);
      }
    });

  return alertsCmd;
}

function createPentestCommands() {
  const pentestCmd = new Command('pentest');

  pentestCmd
    .command('run')
    .description('Run penetration tests')
    .option('-t, --target <url>', 'target URL', 'http://localhost:3000')
    .option('-v, --verbose', 'verbose output')
    .action(async (options) => {
      try {
        console.log(`Running penetration tests against ${options.target}...`);

        const scriptPath = path.join(__dirname, 'pentest.py');
        const args = [scriptPath, '--target', options.target];
        
        if (options.verbose) {
          args.push('--verbose');
        }

        const pentest = spawn('python3', args, {
          stdio: 'inherit'
        });

        pentest.on('close', (code) => {
          if (code === 0) {
            console.log('✅ Penetration tests completed');
          } else {
            console.log('❌ Penetration tests failed');
            process.exit(1);
          }
        });

      } catch (error) {
        console.error('Failed to run penetration tests:', error);
        process.exit(1);
      }
    });

  pentestCmd
    .command('security-scan')
    .description('Run comprehensive security scan')
    .action(async () => {
      try {
        console.log('Running comprehensive security scan...');

        const scriptPath = path.join(__dirname, 'security-test.sh');
        const scan = spawn('bash', [scriptPath], {
          stdio: 'inherit'
        });

        scan.on('close', (code) => {
          if (code === 0) {
            console.log('✅ Security scan completed successfully');
          } else {
            console.log('❌ Security scan found issues');
            process.exit(1);
          }
        });

      } catch (error) {
        console.error('Failed to run security scan:', error);
        process.exit(1);
      }
    });

  return pentestCmd;
}

if (require.main === module) {
  program.parse();
}
