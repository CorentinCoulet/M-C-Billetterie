import prisma from '@/lib/prisma';
import crypto from 'crypto';
import QRCode from 'qrcode';

// QR Code configuration
const QR_CODE_SIZE = parseInt(process.env.QR_CODE_SIZE || '200', 10);
const QR_CODE_MARGIN = parseInt(process.env.QR_CODE_MARGIN || '4', 10);

/**
 * Service for QR code generation and validation
 */
export class QRCodeService {
  /**
   * Generate a QR code for a ticket
   */
  async generateTicketQRCode(ticketId: string, orderId?: string, userId?: string): Promise<{
    qrCodeDataUrl: string;
    qrCodeToken: string;
  }> {
    // Create a unique token for this ticket
    const qrCodeToken = this.generateQRCodeToken(ticketId, orderId, userId);

    // Update the ticket with QR code information
    await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        currentQRCode: qrCodeToken,
        qrCodeGeneratedAt: new Date()
      }
    });

    // Generate QR code with the token
    const qrCodeData = {
      ticketId,
      orderId,
      token: qrCodeToken
    };

    const qrCodeDataUrl = await QRCode.toDataURL(JSON.stringify(qrCodeData), {
      errorCorrectionLevel: 'H',
      margin: QR_CODE_MARGIN,
      width: QR_CODE_SIZE,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });

    return {
      qrCodeDataUrl,
      qrCodeToken
    };
  }

  /**
   * Validate a QR code token
   */
  async validateQRCode(token: string): Promise<{
    valid: boolean;
    ticketId?: string;
    orderId?: string;
    userId?: string;
    alreadyScanned?: boolean;
    ticketDetails?: any;
  }> {
    // Find the ticket with this QR code token
    const ticket = await prisma.ticket.findFirst({
      where: { currentQRCode: token },
      include: {
        event: true,
        order: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!ticket) {
      return { valid: false };
    }

    // Check if the ticket has already been scanned
    if (ticket.isScanned) {
      return {
        valid: true,
        ticketId: ticket.id,
        orderId: ticket.orderId || undefined,
        userId: ticket.userId || undefined,
        alreadyScanned: true,
        ticketDetails: {
          ticket,
          order: ticket.order,
          scannedAt: ticket.scannedAt
        }
      };
    }

    return {
      valid: true,
      ticketId: ticket.id,
      orderId: ticket.orderId || undefined,
      userId: ticket.userId || undefined,
      alreadyScanned: false,
      ticketDetails: {
        ticket,
        order: ticket.order
      }
    };
  }

  /**
   * Mark a ticket as scanned
   */
  async markTicketAsScanned(token: string): Promise<boolean> {
    try {
      // First find the ticket with this QR code token
      const ticket = await prisma.ticket.findFirst({
        where: { currentQRCode: token }
      });

      if (!ticket) {
        return false;
      }

      // Update the ticket
      await prisma.ticket.update({
        where: { id: ticket.id },
        data: {
          isScanned: true,
          scannedAt: new Date()
        }
      });
      return true;
    } catch (error) {
      console.error('Error marking ticket as scanned:', error);
      return false;
    }
  }

  /**
   * Generate a QR code for any data
   */
  async generateQRCode(data: string | object): Promise<string> {
    const dataString = typeof data === 'string' ? data : JSON.stringify(data);

    return QRCode.toDataURL(dataString, {
      errorCorrectionLevel: 'M',
      margin: QR_CODE_MARGIN,
      width: QR_CODE_SIZE,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });
  }

  /**
   * Generate a QR code as a PNG buffer
   */
  async generateQRCodeBuffer(data: string | object): Promise<Buffer> {
    const dataString = typeof data === 'string' ? data : JSON.stringify(data);

    return QRCode.toBuffer(dataString, {
      errorCorrectionLevel: 'M',
      margin: QR_CODE_MARGIN,
      width: QR_CODE_SIZE,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });
  }

  /**
   * Get all scanned tickets for an event
   */
  async getScannedTicketsForEvent(eventId: string): Promise<any[]> {
    return prisma.ticket.findMany({
      where: {
        eventId,
        isScanned: true
      },
      include: {
        event: true,
        order: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        scannedAt: 'desc'
      }
    });
  }

  /**
   * Generate scan statistics for an event
   */
  async getEventScanStatistics(eventId: string): Promise<{
    totalTickets: number;
    scannedTickets: number;
    scanPercentage: number;
  }> {
    const [totalTicketsCount, scannedTicketsCount] = await Promise.all([
      prisma.ticket.count({
        where: { eventId }
      }),
      prisma.ticket.count({
        where: {
          eventId,
          isScanned: true
        }
      })
    ]);

    const scanPercentage = totalTicketsCount > 0
      ? (scannedTicketsCount / totalTicketsCount) * 100
      : 0;

    return {
      totalTickets: totalTicketsCount,
      scannedTickets: scannedTicketsCount,
      scanPercentage
    };
  }

  /**
   * Rotate QR code for a ticket if needed based on rotation interval
   */
  async rotateQRCodeIfNeeded(ticketId: string): Promise<{
    rotated: boolean;
    qrCodeDataUrl?: string;
    qrCodeToken?: string;
  }> {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        order: true,
        user: true
      }
    });

    if (!ticket) {
      throw new Error('Ticket not found');
    }

    // Check if rotation is needed
    const now = new Date();
    const rotationIntervalMs = ticket.qrRotationInterval * 60 * 60 * 1000; // Convert hours to milliseconds
    const lastGenerated = ticket.qrCodeGeneratedAt;

    if (!lastGenerated || (now.getTime() - lastGenerated.getTime()) >= rotationIntervalMs) {
      // Generate new QR code
      const result = await this.generateTicketQRCode(
        ticketId,
        ticket.orderId || undefined,
        ticket.userId || undefined
      );
      
      return {
        rotated: true,
        qrCodeDataUrl: result.qrCodeDataUrl,
        qrCodeToken: result.qrCodeToken
      };
    }

    return { rotated: false };
  }

  /**
   * Get current QR code for a ticket (with automatic rotation if needed)
   */
  async getCurrentQRCode(ticketId: string): Promise<{
    qrCodeDataUrl: string;
    qrCodeToken: string;
    isNew: boolean;
  }> {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        order: true,
        user: true
      }
    });

    if (!ticket) {
      throw new Error('Ticket not found');
    }

    // Check if we need to rotate or if there's no current QR code
    const rotationResult = await this.rotateQRCodeIfNeeded(ticketId);
    
    if (rotationResult.rotated) {
      return {
        qrCodeDataUrl: rotationResult.qrCodeDataUrl!,
        qrCodeToken: rotationResult.qrCodeToken!,
        isNew: true
      };
    }

    // Use existing QR code
    if (ticket.currentQRCode) {
      const qrCodeData = {
        ticketId,
        orderId: ticket.orderId,
        token: ticket.currentQRCode
      };

      const qrCodeDataUrl = await QRCode.toDataURL(JSON.stringify(qrCodeData), {
        errorCorrectionLevel: 'H',
        margin: QR_CODE_MARGIN,
        width: QR_CODE_SIZE,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });

      return {
        qrCodeDataUrl,
        qrCodeToken: ticket.currentQRCode,
        isNew: false
      };
    }

    // Generate new QR code if none exists
    const result = await this.generateTicketQRCode(
      ticketId,
      ticket.orderId || undefined,
      ticket.userId || undefined
    );

    return {
      qrCodeDataUrl: result.qrCodeDataUrl,
      qrCodeToken: result.qrCodeToken,
      isNew: true
    };
  }

  /**
   * Set QR code rotation interval for a ticket
   */
  async setQRCodeRotationInterval(ticketId: string, intervalHours: number): Promise<boolean> {
    try {
      await prisma.ticket.update({
        where: { id: ticketId },
        data: {
          qrRotationInterval: intervalHours
        }
      });
      return true;
    } catch (error) {
      console.error('Error setting QR code rotation interval:', error);
      return false;
    }
  }

  /**
   * Generate a secure token for QR code
   */
  private generateQRCodeToken(ticketId: string, orderId?: string, userId?: string): string {
    const data = `${ticketId}-${orderId || ''}-${userId || ''}-${Date.now()}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }
}

const qrCodeService = new QRCodeService();
export default qrCodeService;
