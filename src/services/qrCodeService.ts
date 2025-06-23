import QRCode from 'qrcode';
import crypto from 'crypto';
import prisma from '@/lib/prisma';

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
  async generateTicketQRCode(ticketId: string, orderId: string, userId: string): Promise<{
    qrCodeDataUrl: string;
    qrCodeToken: string;
  }> {
    // Create a unique token for this ticket
    const qrCodeToken = this.generateQRCodeToken(ticketId, orderId, userId);

    // Store the token in the database
    await prisma.ticketQRCode.upsert({
      where: { ticketId_orderId: { ticketId, orderId } },
      update: { token: qrCodeToken, scanned: false },
      create: {
        ticketId,
        orderId,
        userId,
        token: qrCodeToken,
        scanned: false
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
    // Find the QR code in the database
    const qrCode = await prisma.ticketQRCode.findFirst({
      where: { token },
      include: {
        ticket: {
          include: {
            event: true
          }
        },
        order: true
      }
    });

    if (!qrCode) {
      return { valid: false };
    }

    // Check if the ticket has already been scanned
    if (qrCode.scanned) {
      return {
        valid: true,
        ticketId: qrCode.ticketId,
        orderId: qrCode.orderId,
        userId: qrCode.userId,
        alreadyScanned: true,
        ticketDetails: {
          ticket: qrCode.ticket,
          order: qrCode.order,
          scannedAt: qrCode.scannedAt
        }
      };
    }

    return {
      valid: true,
      ticketId: qrCode.ticketId,
      orderId: qrCode.orderId,
      userId: qrCode.userId,
      alreadyScanned: false,
      ticketDetails: {
        ticket: qrCode.ticket,
        order: qrCode.order
      }
    };
  }

  /**
   * Mark a ticket as scanned
   */
  async markTicketAsScanned(token: string): Promise<boolean> {
    try {
      await prisma.ticketQRCode.update({
        where: { token },
        data: {
          scanned: true,
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
    return prisma.ticketQRCode.findMany({
      where: {
        scanned: true,
        ticket: {
          eventId
        }
      },
      include: {
        ticket: true,
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
        }
      },
      orderBy: {
        scannedAt: 'desc'
      }
    });
  }

  /**
   * Get scan statistics for an event
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
      prisma.ticketQRCode.count({
        where: {
          scanned: true,
          ticket: {
            eventId
          }
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
   * Generate a secure token for QR code
   */
  private generateQRCodeToken(ticketId: string, orderId: string, userId: string): string {
    const data = `${ticketId}-${orderId}-${userId}-${Date.now()}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }
}

const qrCodeService = new QRCodeService();
export default qrCodeService;
