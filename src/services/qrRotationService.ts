import { logger } from '@/lib/logger';
import prisma from '../lib/prisma';
import { TicketService } from './ticketService';

/**
 * QR Code Rotation Service
 * Handles automatic QR code rotation for security
 */
export class QRRotationService {
  private ticketService: TicketService;

  constructor() {
    this.ticketService = new TicketService();
  }

  /**
   * Check if a ticket needs QR code regeneration
   */
  shouldRegenerateQRCode(ticket: {
    qrCodeGeneratedAt: Date | null;
    qrRotationInterval: number;
    isScanned: boolean;
  }): boolean {
    // Don't regenerate for already scanned tickets
    if (ticket.isScanned) {
      return false;
    }

    // Regenerate if no QR code exists
    if (!ticket.qrCodeGeneratedAt) {
      return true;
    }

    // Check if rotation interval has passed
    const now = new Date();
    const diffHours = (now.getTime() - ticket.qrCodeGeneratedAt.getTime()) / (1000 * 60 * 60);
    
    return diffHours >= ticket.qrRotationInterval;
  }

  /**
   * Run QR code rotation for all eligible tickets
   */
  async runQRRotation(): Promise<{
    success: boolean;
    stats: {
      total: number;
      regenerated: number;
      skipped: number;
      errors: number;
    };
    error?: string;
  }> {
    const stats = {
      total: 0,
      regenerated: 0,
      skipped: 0,
      errors: 0
    };

    try {
      logger.info('Starting QR code rotation');

      // Get all tickets that might need rotation
      const tickets = await prisma.ticket.findMany({
        where: {
          isScanned: false, // Only non-scanned tickets
          event: {
            date: {
              gt: new Date() // Only future events
            }
          }
        },
        include: {
          event: true
        }
      });

      stats.total = tickets.length;
      logger.info({ count: tickets.length }, 'Found tickets to check for rotation');

      for (const ticket of tickets) {
        try {
          if (this.shouldRegenerateQRCode(ticket)) {
            // Regenerate QR code
            await this.ticketService.generateTicketQRCode(ticket.id);
            stats.regenerated++;
            logger.info({ ticketId: ticket.id }, 'Regenerated QR code for ticket');
          } else {
            stats.skipped++;
            logger.debug({ ticketId: ticket.id }, 'Skipping ticket - rotation not needed');
          }
        } catch (error) {
          stats.errors++;
          logger.error({ error, ticketId: ticket.id }, 'Error processing ticket');
        }
      }

      logger.info({ stats }, 'QR rotation completed');
      
      return {
        success: true,
        stats
      };

    } catch (error) {
      logger.error({ error }, 'QR rotation process failed');
      
      return {
        success: false,
        stats,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get rotation statistics
   */
  async getRotationStats(): Promise<{
    totalTickets: number;
    activeTickets: number;
    expiredQRCodes: number;
    lastRotationRun?: Date;
  }> {
    const now = new Date();
    const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000);

    const [totalTickets, activeTickets, expiredQRCodes] = await Promise.all([
      // Total tickets
      prisma.ticket.count(),
      
      // Active (non-scanned) tickets for future events
      prisma.ticket.count({
        where: {
          isScanned: false,
          event: {
            date: {
              gt: now
            }
          }
        }
      }),
      
      // Tickets with expired QR codes (older than 12 hours)
      prisma.ticket.count({
        where: {
          isScanned: false,
          qrCodeGeneratedAt: {
            lt: twelveHoursAgo
          },
          event: {
            date: {
              gt: now
            }
          }
        }
      })
    ]);

    return {
      totalTickets,
      activeTickets,
      expiredQRCodes
    };
  }

  /**
   * Force regenerate QR code for a specific ticket
   */
  async forceRegenerateTicketQR(ticketId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        include: { event: true }
      });

      if (!ticket) {
        return {
          success: false,
          error: 'Ticket not found'
        };
      }

      if (ticket.isScanned) {
        return {
          success: false,
          error: 'Cannot regenerate QR code for scanned ticket'
        };
      }

      if (ticket.event && ticket.event.date < new Date()) {
        return {
          success: false,
          error: 'Cannot regenerate QR code for past event'
        };
      }

      await this.ticketService.generateTicketQRCode(ticketId);
      
      return { success: true };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

const qrRotationService = new QRRotationService();
export default qrRotationService;
