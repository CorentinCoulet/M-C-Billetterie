import * as cron from 'node-cron';
import {
    convertToTicketData,
    getTicketsForRotation,
    updateTicketQRCode
} from './database-service';
import { generateOrUpdateQRCode, shouldRegenerateQRCode, TicketData } from './qrcode';

let qrRotationJobRunning = false;
let lastJobRun: Date | null = null;
let rotationStats = {
  totalProcessed: 0,
  regenerated: 0,
  skipped: 0,
  errors: 0,
  lastRun: null as Date | null,
};

class QRRotationService {
  private static instance: QRRotationService;
  private job: cron.ScheduledTask | null = null;
  private isRunning = false;

  private constructor() {
    // No longer need Prisma client - using database service
  }

  public static getInstance(): QRRotationService {
    if (!QRRotationService.instance) {
      QRRotationService.instance = new QRRotationService();
    }
    return QRRotationService.instance;
  }

  public startRotationJob(): void {
    if (this.job) {
      console.log('⏰ QR rotation job is already running');
      return;
    }

    this.job = cron.schedule('0 0,12 * * *', async () => {
      await this.runQRRotation();
    }, {
      timezone: 'Europe/Paris',
    });

    console.log('🚀 QR rotation job started - runs every 12 hours at 00:00 and 12:00');
  }

  public stopRotationJob(): void {
    if (this.job) {
      this.job.stop();
      this.job = null;
      console.log('⏹️ QR rotation job stopped');
    }
  }

  public async runQRRotation(): Promise<{
    success: boolean;
    stats: typeof rotationStats;
    error?: string;
  }> {
    if (this.isRunning) {
      console.log('⚠️ QR rotation already in progress, skipping...');
      return {
        success: false,
        stats: rotationStats,
        error: 'QR rotation already in progress',
      };
    }

    this.isRunning = true;
    qrRotationJobRunning = true;
    lastJobRun = new Date();
    rotationStats.lastRun = lastJobRun;
    
    console.log('🔄 Starting QR codes rotation process...');

    try {
      // Reset stats for this run
      const currentStats = {
        totalProcessed: 0,
        regenerated: 0,
        skipped: 0,
        errors: 0,
        lastRun: lastJobRun,
      };

      const batchSize = 100;
      let offset = 0;
      let hasMoreTickets = true;

      while (hasMoreTickets) {
        const tickets = await getTicketsForRotation(offset, batchSize);
        
        if (tickets.length === 0) {
          hasMoreTickets = false;
          break;
        }

        console.log(`📋 Processing batch of ${tickets.length} tickets (offset: ${offset})`);

        for (const ticket of tickets) {
          currentStats.totalProcessed++;
          
          try {
            const ticketData: TicketData = convertToTicketData(ticket);

            if (shouldRegenerateQRCode(ticketData)) {
              console.log(`🔄 Regenerating QR code for ticket ${ticket.id}`);
              
              const result = await generateOrUpdateQRCode(ticketData);
              
              await updateTicketQRCode(ticket.id, {
                currentQRCode: result.qrCodeDataURL,
                qrCodeGeneratedAt: result.ticketData.qrCodeGeneratedAt!,
              });

              currentStats.regenerated++;
              console.log(`✅ QR code regenerated for ticket ${ticket.id}`);
            } else {
              currentStats.skipped++;
              console.log(`⏭️ Skipping ticket ${ticket.id} (not eligible for regeneration)`);
            }
          } catch (error) {
            currentStats.errors++;
            console.error(`❌ Error processing ticket ${ticket.id}:`, error);
          }
        }

        offset += batchSize;
      }

      rotationStats = { ...currentStats };
      
      console.log('✅ QR codes rotation completed:', currentStats);
      
      return {
        success: true,
        stats: currentStats,
      };

    } catch (error) {
      console.error('❌ QR rotation process failed:', error);
      rotationStats.errors++;
      
      return {
        success: false,
        stats: rotationStats,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    } finally {
      this.isRunning = false;
      qrRotationJobRunning = false;
    }
  }

  public getStats() {
    return {
      ...rotationStats,
      isJobRunning: this.isRunning,
      jobScheduled: !!this.job,
      lastJobRun,
    };
  }

  public async cleanup(): Promise<void> {
    this.stopRotationJob();
    // No longer need to disconnect Prisma - using database service
  }
}

// Export singleton instance
export const qrRotationService = QRRotationService.getInstance();

// Utility functions
export function getQRRotationStats() {
  return qrRotationService.getStats();
}

export function isQRRotationRunning(): boolean {
  return qrRotationJobRunning;
}

export async function triggerManualQRRotation() {
  return await qrRotationService.runQRRotation();
}

// Auto-start job (production mode only)
if (process.env.NODE_ENV === 'production' || process.env.ENABLE_QR_ROTATION === 'true') {
  qrRotationService.startRotationJob();
  console.log('🚀 QR rotation service auto-started');
}

// Cleanup on app shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Shutting down QR rotation service...');
  await qrRotationService.cleanup();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🛑 Shutting down QR rotation service...');
  await qrRotationService.cleanup();
  process.exit(0);
});
