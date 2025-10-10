import { logger } from '@/lib/logger';
import crypto from 'crypto';
import QRCode from 'qrcode';
import { Prisma } from '../generated/prisma';
import prisma from '../lib/prisma';

// Use Prisma generated types for tickets
type TicketWithRelations = Prisma.TicketGetPayload<{
  include: {
    event: true;
    user: true;
    order: true;
  }
}>;

/**
 * Enhanced Ticket Service with QR Code functionality
 * Focused on individual tickets with QR code generation and validation
 */
export class TicketService {
  /**
   * Get ticket by ID with all relations
   */
  async getTicketById(id: string): Promise<TicketWithRelations | null> {
    return prisma.ticket.findUnique({
      where: { id },
      include: {
        event: true,
        user: true,
        order: true
      }
    });
  }

  /**
   * Get all tickets for a user
   */
  async getUserTickets(userId: string): Promise<TicketWithRelations[]> {
    return prisma.ticket.findMany({
      where: { userId },
      include: {
        event: true,
        user: true,
        order: true
      },
      orderBy: {
        purchasedAt: 'desc'
      }
    });
  }

  /**
   * Create a new ticket
   */
  async createTicket(data: {
    eventId: string;
    userId?: string;
    orderId?: string;
    seatNumber?: string;
    status?: string;
  }): Promise<TicketWithRelations> {
    // Generate unique ticket code
    const ticketCode = this.generateTicketCode();
    
    return prisma.ticket.create({
      data: {
        code: ticketCode,
        status: (data.status as any) || 'paid',
        eventId: data.eventId,
        userId: data.userId,
        orderId: data.orderId,
        seatNumber: data.seatNumber,
        purchasedAt: new Date(),
        isScanned: false
      },
      include: {
        event: true,
        user: true,
        order: true
      }
    });
  }

  /**
   * Generate QR code for a ticket
   */
  async generateTicketQRCode(ticketId: string): Promise<{
    qrCodeDataUrl: string;
    qrCodeToken: string;
  }> {
    // Get ticket with event details
    const ticket = await this.getTicketById(ticketId);
    if (!ticket) {
      throw new Error('Ticket not found');
    }

    // Create a unique token for this ticket
    const qrCodeToken = this.generateQRCodeToken(ticketId, ticket.orderId || '', ticket.userId || '');

    // Prepare QR code data
    const qrCodeData = {
      ticketId: ticket.id,
      eventId: ticket.eventId,
      userId: ticket.userId,
      orderId: ticket.orderId,
      eventTitle: ticket.event?.title || 'Event',
      eventDate: ticket.event?.date?.toISOString() || '',
      issuedAt: new Date().toISOString(),
      token: qrCodeToken,
      checksum: this.generateChecksum(ticket.id, ticket.eventId, ticket.userId || ''),
      ticketCode: ticket.code
    };

    // Generate QR code
    const qrCodeDataUrl = await QRCode.toDataURL(JSON.stringify(qrCodeData), {
      errorCorrectionLevel: 'H',
      margin: 4,
      width: 200,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });

    // Update ticket with QR code info
    await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        currentQRCode: qrCodeDataUrl,
        qrCodeGeneratedAt: new Date()
      }
    });

    return {
      qrCodeDataUrl,
      qrCodeToken
    };
  }

  /**
   * Validate a ticket QR code
   */
  async validateTicketQRCode(qrContent: string, markAsUsed: boolean = false): Promise<{
    valid: boolean;
    ticket?: TicketWithRelations;
    error?: string;
    isAlreadyScanned?: boolean;
    canBeScanned?: boolean;
  }> {
    try {
      const qrData = JSON.parse(qrContent);
      
      // Validate QR code structure
      if (!qrData.ticketId || !qrData.eventId || !qrData.token) {
        return { 
          valid: false, 
          error: 'Invalid QR code format' 
        };
      }

      // Get ticket from database
      const ticket = await this.getTicketById(qrData.ticketId);
      if (!ticket) {
        return { 
          valid: false, 
          error: 'Ticket not found' 
        };
      }

      // Check if ticket matches QR data
      if (ticket.eventId !== qrData.eventId) {
        return { 
          valid: false, 
          error: 'Ticket does not match event' 
        };
      }

      // Verify checksum
      const expectedChecksum = this.generateChecksum(ticket.id, ticket.eventId, ticket.userId || '');
      if (qrData.checksum !== expectedChecksum) {
        return { 
          valid: false, 
          error: 'Invalid ticket signature' 
        };
      }

      // Check if already scanned
      if (ticket.isScanned) {
        return {
          valid: true,
          ticket,
          isAlreadyScanned: true,
          canBeScanned: false,
          error: 'Ticket already used'
        };
      }

      // Check if event date has passed (if needed)
      if (ticket.event && ticket.event.date < new Date()) {
        // Still valid but event has passed - up to business logic
        logger.warn({ eventId: ticket.event.id, eventTitle: ticket.event.title }, 'Validating ticket for past event');
      }

      // Mark as used if requested
      if (markAsUsed && !ticket.isScanned) {
        const updatedTicket = await prisma.ticket.update({
          where: { id: ticket.id },
          data: {
            isScanned: true,
            scannedAt: new Date(),
            usedAt: new Date()
          },
          include: {
            event: true,
            user: true,
            order: true
          }
        });
        
        return {
          valid: true,
          ticket: updatedTicket,
          isAlreadyScanned: false,
          canBeScanned: true
        };
      }

      return {
        valid: true,
        ticket,
        isAlreadyScanned: false,
        canBeScanned: true
      };

    } catch (error) {
      logger.error({ error }, 'Error validating QR code');
      return { 
        valid: false, 
        error: 'Failed to parse QR code' 
      };
    }
  }

  /**
   * Get scan statistics for an event
   */
  async getEventScanStats(eventId: string): Promise<{
    totalTickets: number;
    scannedTickets: number;
    scanPercentage: number;
  }> {
    const [totalTickets, scannedTickets] = await Promise.all([
      prisma.ticket.count({ where: { eventId } }),
      prisma.ticket.count({ where: { eventId, isScanned: true } })
    ]);

    const scanPercentage = totalTickets > 0 ? (scannedTickets / totalTickets) * 100 : 0;

    return {
      totalTickets,
      scannedTickets,
      scanPercentage: Math.round(scanPercentage * 100) / 100
    };
  }

  /**
   * Get scanned tickets for an event
   */
  async getScannedTicketsForEvent(eventId: string): Promise<TicketWithRelations[]> {
    return prisma.ticket.findMany({
      where: {
        eventId,
        isScanned: true
      },
      include: {
        event: true,
        user: true,
        order: true
      },
      orderBy: {
        scannedAt: 'desc'
      }
    });
  }

  /**
   * Generate a unique ticket code
   */
  private generateTicketCode(): string {
    const prefix = 'TK';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}${timestamp}${random}`;
  }

  /**
   * List tickets with filters
   */
  async listTickets(filters?: any): Promise<TicketWithRelations[]> {
    return prisma.ticket.findMany({
      where: filters,
      include: {
        event: true,
        user: true,
        order: true
      },
      orderBy: {
        purchasedAt: 'desc'
      }
    });
  }

  /**
   * Reserve a ticket for a user
   */
  async reserveTicket(ticketId: string, userId: string): Promise<TicketWithRelations> {
    return prisma.ticket.update({
      where: { id: ticketId },
      data: {
        userId: userId,
        status: 'pending'
      },
      include: {
        event: true,
        user: true,
        order: true
      }
    });
  }

  /**
   * Validate a ticket (mark as used)
   */
  async validateTicket(ticketId: string): Promise<TicketWithRelations> {
    return prisma.ticket.update({
      where: { id: ticketId },
      data: {
        isScanned: true,
        scannedAt: new Date(),
        usedAt: new Date(),
        status: 'used'
      },
      include: {
        event: true,
        user: true,
        order: true
      }
    });
  }

  /**
   * Cancel a ticket
   */
  async cancelTicket(ticketId: string): Promise<TicketWithRelations> {
    return prisma.ticket.update({
      where: { id: ticketId },
      data: {
        status: 'cancelled'
      },
      include: {
        event: true,
        user: true,
        order: true
      }
    });
  }

  /**
   * Generate ticket file (PDF or other format)
   */
  async generateTicketFile(ticketId: string): Promise<Buffer> {
    const ticket = await this.getTicketById(ticketId);
    if (!ticket) {
      throw new Error('Ticket not found');
    }

    // Placeholder pour génération de PDF
    // Vous pouvez utiliser une bibliothèque comme jsPDF ou pdfkit
    const ticketContent = JSON.stringify({
      ticketId: ticket.id,
      code: ticket.code,
      event: ticket.event?.title,
      date: ticket.event?.date,
      user: ticket.user?.name || ticket.user?.email
    }, null, 2);

    return Buffer.from(ticketContent, 'utf8');
  }

  /**
   * Generate a secure token for QR code
   */
  private generateQRCodeToken(ticketId: string, orderId: string, userId: string): string {
    const data = `${ticketId}-${orderId}-${userId}-${Date.now()}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Generate checksum for ticket validation
   */
  private generateChecksum(ticketId: string, eventId: string, userId: string): string {
    const data = `${ticketId}-${eventId}-${userId}`;
    return crypto.createHash('md5').update(data).digest('hex');
  }
}

const ticketService = new TicketService();
export default ticketService;
