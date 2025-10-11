#!/usr/bin/env node

/**
 * Cron job for automatic QR code rotation
 * 
 * This script should be executed periodically (e.g., every hour)
 * Usage: node scripts/qr-rotation-cron.js
 */

import { logger } from '../../lib/logger';
import qrRotationService from '../../src/services/qrRotationService';

async function runQRRotationCron() {
  logger.info('Starting QR rotation cron job');

  try {
    const result = await qrRotationService.runQRRotation();
    
    if (result.success) {
      logger.info({
        stats: result.stats,
        message: 'QR rotation completed successfully'
      });
    } else {
      logger.error({
        error: result.error,
        message: 'QR rotation failed'
      });
      process.exit(1);
    }

  } catch (error) {
    logger.error({
      error,
      message: 'Cron job failed with unexpected error'
    });
    process.exit(1);
  }

  logger.info('QR rotation cron job completed');
}

// Handle signals for graceful shutdown
process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down gracefully');
  process.exit(0);
});

// Execute the job
runQRRotationCron().catch(error => {
  logger.error({
    error,
    message: 'Unhandled error in cron job'
  });
  process.exit(1);
});
