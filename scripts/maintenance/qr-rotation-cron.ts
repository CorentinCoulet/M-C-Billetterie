#!/usr/bin/env node

/**
 * Cron job pour la rotation automatique des QR codes
 * 
 * Ce script doit être exécuté périodiquement (ex: toutes les heures)
 * Usage: node scripts/qr-rotation-cron.js
 */

import qrRotationService from '../src/services/qrRotationService';

async function runQRRotationCron() {
  console.log(`🕐 [${new Date().toISOString()}] Starting QR rotation cron job...`);

  try {
    const result = await qrRotationService.runQRRotation();
    
    if (result.success) {
      console.log(`✅ QR rotation completed successfully:`);
      console.log(`   - Total checked: ${result.stats.total}`);
      console.log(`   - Regenerated: ${result.stats.regenerated}`);
      console.log(`   - Skipped: ${result.stats.skipped}`);
      console.log(`   - Errors: ${result.stats.errors}`);
    } else {
      console.error(`❌ QR rotation failed: ${result.error}`);
      process.exit(1);
    }

  } catch (error) {
    console.error(`❌ Cron job failed:`, error);
    process.exit(1);
  }

  console.log(`🏁 QR rotation cron job completed at ${new Date().toISOString()}`);
}

// Gestion des signaux pour arrêt propre
process.on('SIGTERM', () => {
  console.log('📴 Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('📴 Received SIGINT, shutting down gracefully');
  process.exit(0);
});

// Exécution du job
runQRRotationCron().catch(error => {
  console.error('💥 Unhandled error in cron job:', error);
  process.exit(1);
});
