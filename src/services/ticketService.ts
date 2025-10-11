import { logger } from '@/lib/logger';
import prisma from '@/lib/prisma';
import crypto from 'crypto';
import QRCode from 'qrcode';
import { Prisma, TicketStatus } from '../generated/prisma';
import { BaseService } from './baseService';

// Use Prisma generated types
type TicketWithRelations = Prisma.TicketGetPayload<{
  include: {
    event: true;
    user: true;
    order: true;
  }
}>;

// Input types for operations (based on actual Prisma Ticket model)
type TicketCreateInput = {
  eventId: string;
  userId?: string;
  orderId?: string;
  code: string;
  status?: TicketStatus;
  seatNumber?: string;
  currentQRCode?: string;
  qrCodeGeneratedAt?: Date;
  qrRotationInterval?: number;
  metadata?: any;
}

type TicketUpdateInput = {
  status?: TicketStatus;
  seatNumber?: string;
  currentQRCode?: string;
  qrCodeGeneratedAt?: Date;
  qrRotationInterval?: number;
  isScanned?: boolean;
  scannedAt?: Date;
  usedAt?: Date;
  metadata?: any;
}

type TicketWhereInput = {
  id?: string;
  code?: string;
  eventId?: string;
  userId?: string;
  status?: TicketStatus;
  AND?: TicketWhereInput[];
  OR?: TicketWhereInput[];
}

type TicketOrderByInput = {
  id?: 'asc' | 'desc';
  code?: 'asc' | 'desc';
  status?: 'asc' | 'desc';
  purchasedAt?: 'asc' | 'desc';
  createdAt?: 'asc' | 'desc';
  updatedAt?: 'asc' | 'desc';
}

type UserTicket = {
  ticket: TicketWithRelations;
  orderId: string;
  purchaseDate: Date;
}

// Standard relations to include in ticket queries
const ticketIncludes = {
  event: true,
  user: true,
  order: true
};

/**
 * Unified Ticket Service with QR Code functionality
 * Combines ticket management, QR code generation/validation, and scan statistics
 */
export class TicketService extends BaseService<TicketWithRelations> {
  constructor() {
    super(prisma.ticket, ticketIncludes);
  }

  // ===== BASIC TICKET OPERATIONS =====

  /**
   * Get a ticket by ID
   */
  async getTicketById(id: string): Promise<TicketWithRelations | null> {
    return this.getById(id);
  }

  /**
   * Get all tickets for an event
   */
  async getTicketsByEvent(eventId: string): Promise<TicketWithRelations[]> {
    return this.getAll({
      where: { eventId }
    });
  }

  /**
   * Get all tickets with pagination and filtering
   */
  async getTickets(params: {
    skip?: number;
    take?: number;
    where?: TicketWhereInput;
    orderBy?: TicketOrderByInput;
  }): Promise<TicketWithRelations[]> {
    return this.getAll(params);
  }

  /**
   * List tickets with filters
   */
  async listTickets(filters?: any): Promise<TicketWithRelations[]> {
    return prisma.ticket.findMany({
      where: filters,
      include: ticketIncludes,
      orderBy: {
        purchasedAt: 'desc'
      }
    });
  }

  /**
   * Create a new ticket
   */
  async createTicket(data: TicketCreateInput): Promise<TicketWithRelations> {
    // Generate unique ticket code if not provided
    const ticketCode = data.code || this.generateTicketCode();
    
    return this.create({
      ...data,
      code: ticketCode,
      purchasedAt: new Date(),
      isScanned: false,
      event: {
        connect: { id: data.eventId }
      }
    });
  }

  /**
   * Create multiple tickets for an event
   */
  async createTicketsForEvent(eventId: string, tickets: Array<{
    code: string;
    seatNumber?: string;
    userId?: string;
  }>): Promise<TicketWithRelations[]> {
    const createdTickets: TicketWithRelations[] = [];

    for (const ticket of tickets) {
      const createdTicket = await this.create({
        ...ticket,
        eventId,
        event: {
          connect: { id: eventId }
        }
      });
      createdTickets.push(createdTicket);
    }

    return createdTickets;
  }

  /**
   * Update a ticket
   */
  async updateTicket(id: string, data: TicketUpdateInput): Promise<TicketWithRelations> {
    return this.update(id, data);
  }

  /**
   * Delete a ticket
   */
  async deleteTicket(id: string): Promise<TicketWithRelations> {
    return this.delete(id);
  }

  /**
   * Get tickets purchased by a user
   */
  async getUserTickets(userId: string): Promise<UserTicket[]> {
    const tickets = await prisma.ticket.findMany({
      where: {
        userId,
        status: 'paid'
      },
      include: ticketIncludes
    });

    const userTickets: UserTicket[] = tickets.map(ticket => ({
      ticket: ticket as TicketWithRelations,
      orderId: ticket.orderId || '',
      purchaseDate: ticket.purchasedAt
    }));

    return userTickets;
  }

  // ===== TICKET RESERVATION & STATUS =====

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
      include: ticketIncludes
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
      include: ticketIncludes
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
      include: ticketIncludes
    });
  }

  // ===== QR CODE GENERATION & VALIDATION =====

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
      ticketCode: ticket.code,
      eventTitle: ticket.event?.title || 'Event',
      eventDate: ticket.event?.date?.toISOString() || '',
      issuedAt: new Date().toISOString(),
      token: qrCodeToken,
      checksum: this.generateChecksum(ticket.id, ticket.eventId, ticket.userId || '')
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

    // Store/update QR code in database
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
          include: ticketIncludes
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

  // ===== SCAN STATISTICS =====

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
      include: ticketIncludes,
      orderBy: {
        scannedAt: 'desc'
      }
    });
  }

  // ===== FILE GENERATION =====

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

  // ===== PRIVATE HELPER METHODS =====

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
