import { PrismaClient } from '@prisma/client';
import * as cron from 'node-cron';
import { generateOrUpdateQRCode, shouldRegenerateQRCode, TicketData } from './qrcode';

interface DBTicketData {
  id: string;
  orderId: string;
  eventId: string;
  userId: string;
  eventTitle?: string;
  eventDate?: string;
  venue?: string;
  seatInfo?: string;
  issuedAt: string;
  validUntil: string;
  currentQRCode?: string | null;
  qrCodeGeneratedAt?: string | null;
  isScanned?: boolean;
  scannedAt?: string | null;
  qrRotationInterval?: number;
}

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
  private prisma: PrismaClient;
  private job: cron.ScheduledTask | null = null;
  private isRunning = false;

  private constructor() {
    this.prisma = new PrismaClient();
  }

  public static getInstance(): QRRotationService {
    if (!QRRotationService.instance) {
      QRRotationService.instance = new QRRotationService();
    }
    return QRRotationService.instance;
  }

  /**
   * Start QR code rotation job every 12 hours
   */
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

  /**
   * Stop the rotation job
   */
  public stopRotationJob(): void {
    if (this.job) {
      this.job.stop();
      this.job = null;
      console.log('⏹️ QR rotation job stopped');
    }
  }

  /**
   * Execute QR code rotation manually
   */
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
        const tickets = await this.getTicketsForRotation(offset, batchSize);
        
        if (tickets.length === 0) {
          hasMoreTickets = false;
          break;
        }

        console.log(`📋 Processing batch of ${tickets.length} tickets (offset: ${offset})`);

        for (const ticket of tickets) {
          currentStats.totalProcessed++;
          
          try {
            const ticketData: TicketData = {
              id: ticket.id,
              orderId: ticket.orderId,
              eventId: ticket.eventId,
              userId: ticket.userId,
              eventTitle: ticket.eventTitle || 'Unknown Event',
              eventDate: ticket.eventDate || new Date().toISOString(),
              venue: ticket.venue || 'Unknown Venue',
              seatInfo: ticket.seatInfo,
              issuedAt: ticket.issuedAt,
              validUntil: ticket.validUntil,
              currentQRCode: ticket.currentQRCode || undefined,
              qrCodeGeneratedAt: ticket.qrCodeGeneratedAt || undefined,
              isScanned: ticket.isScanned || false,
              scannedAt: ticket.scannedAt || undefined,
              qrRotationInterval: ticket.qrRotationInterval || 12,
            };

            if (shouldRegenerateQRCode(ticketData)) {
              console.log(`🔄 Regenerating QR code for ticket ${ticket.id}`);
              
              const result = await generateOrUpdateQRCode(ticketData);
              
              await this.updateTicketQRCode(ticket.id, {
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

  /**
   * Get tickets eligible for rotation (mock implementation)
   */
  private async getTicketsForRotation(offset: number, limit: number): Promise<DBTicketData[]> {
    // TODO: Replace with real Prisma query when DB is connected
    if (offset >= 5) return []; // Simulate 5 total tickets
    
    const mockTickets: DBTicketData[] = [
      {
        id: 'ticket-1',
        orderId: 'order-1',
        eventId: 'event-1',
        userId: 'user-1',
        eventTitle: 'Concert Test',
        eventDate: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
        venue: 'Venue Test',
        seatInfo: 'A1',
        issuedAt: new Date().toISOString(),
        validUntil: new Date(Date.now() + 86400000).toISOString(),
        currentQRCode: null,
        qrCodeGeneratedAt: new Date(Date.now() - 13 * 60 * 60 * 1000).toISOString(), // 13h ago
        isScanned: false,
        scannedAt: null,
        qrRotationInterval: 12,
      },
      {
        id: 'ticket-2',
        orderId: 'order-1',
        eventId: 'event-1',
        userId: 'user-1',
        eventTitle: 'Concert Test',
        eventDate: new Date(Date.now() + 86400000).toISOString(),
        venue: 'Venue Test',
        seatInfo: 'A2',
        issuedAt: new Date().toISOString(),
        validUntil: new Date(Date.now() + 86400000).toISOString(),
        currentQRCode: null,
        qrCodeGeneratedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6h ago
        isScanned: false,
        scannedAt: null,
        qrRotationInterval: 12,
      },
    ];

    return mockTickets.slice(offset, offset + limit);
  }

  /**
   * Update ticket QR code in database (mock implementation)
   */
  private async updateTicketQRCode(
    ticketId: string,
    updateData: {
      currentQRCode: string;
      qrCodeGeneratedAt: string;
    }
  ): Promise<void> {
    // TODO: Replace with real Prisma update
    console.log(`📝 Mock: Updated ticket ${ticketId} with new QR code`);
    console.log(`📝 QR code length: ${updateData.currentQRCode.length} chars`);
  }

  /**
   * Get service statistics
   */
  public getStats() {
    return {
      ...rotationStats,
      isJobRunning: this.isRunning,
      jobScheduled: !!this.job,
      lastJobRun,
    };
  }

  /**
   * Clean up resources
   */
  public async cleanup(): Promise<void> {
    this.stopRotationJob();
    await this.prisma.$disconnect();
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
