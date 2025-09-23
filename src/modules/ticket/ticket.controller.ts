// Ticket controller - wrapper for the ticket QR service
import ticketService from '../../services/ticketQRService';

// Controller types
export interface TicketRequest {
  eventId?: string;
  userId?: string;
  status?: string;
}

export interface CreateTicketRequest {
  name: string;
  description?: string;
  price: number;
  quantity: number;
  eventId: string;
  userId?: string;
  seatNumber?: string;
}

/**
 * Get tickets for a user
 */
export const getUserTickets = async (params: { userId: string }) => {
  return await ticketService.getUserTickets(params.userId);
};

/**
 * Create a new ticket
 */
export const createTicket = async (data: CreateTicketRequest) => {
  const { userId, seatNumber, ...ticketData } = data;
  return await ticketService.createTicket(ticketData);
};

/**
 * Get ticket by ID
 */
export const getById = async (id: string) => {
  return await ticketService.getTicketById(id);
};

/**
 * Generate QR code for a ticket
 */
export const generateQRCode = async (req: any, res: any) => {
  try {
    const ticketId = req.query.id;
    if (!ticketId) {
      return res.status(400).json({ error: 'Ticket ID is required' });
    }

    const ticket = await ticketService.getTicketById(ticketId);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // Generate QR code
    const qrResult = await ticketService.generateTicketQRCode(ticketId);
    
    return res.json({
      success: true,
      qrCode: qrResult.qrCodeDataUrl,
      ticket: {
        id: ticket.id,
        code: ticket.code,
        eventId: ticket.eventId,
        status: ticket.status
      }
    });
  } catch (error) {
    console.error('Error generating QR code:', error);
    return res.status(500).json({ error: 'Failed to generate QR code' });
  }
};

/**
 * Validate/Verify a ticket QR code
 */
export const validateQRCode = async (req: any, res: any) => {
  try {
    const { qrContent, markAsUsed = false } = req.body;
    
    if (!qrContent) {
      return res.status(400).json({ error: 'QR content is required' });
    }

    const validation = await ticketService.validateTicketQRCode(qrContent, markAsUsed);
    
    return res.json(validation);
  } catch (error) {
    console.error('Error validating QR code:', error);
    return res.status(500).json({ error: 'Failed to validate QR code' });
  }
};

export default {
  getUserTickets,
  createTicket,
  getById,
  generateQRCode,
  validateQRCode,
  // Missing methods added
  list: async (filters?: any) => {
    return await ticketService.listTickets(filters);
  },
  create: async (data: any) => {
    return await ticketService.createTicket(data);
  },
  reserve: async (ticketId: string, userId: string) => {
    return await ticketService.reserveTicket(ticketId, userId);
  },
  validate: async (ticketId: string) => {
    return await ticketService.validateTicket(ticketId);
  },
  cancel: async (ticketId: string) => {
    return await ticketService.cancelTicket(ticketId);
  },
  download: async (req: any, res: any) => {
    try {
      const ticketId = req.params.id;
      const ticket = await ticketService.getTicketById(ticketId);
      if (!ticket) {
        return res.status(404).json({ error: 'Ticket not found' });
      }
      
      // PDF or other download format generation
      const ticketFile = await ticketService.generateTicketFile(ticketId);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=ticket-${ticket.code}.pdf`);
      
      return res.send(ticketFile);
    } catch (error) {
      console.error('Error downloading ticket:', error);
      return res.status(500).json({ error: 'Failed to download ticket' });
    }
  }
};
