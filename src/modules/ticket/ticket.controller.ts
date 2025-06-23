import type { AuthenticatedRequest } from '@/middlewares/auth';
import type { CreateTicketDto } from '@/types/dto/ticket/create-ticket.dto';
import type { NextApiResponse } from 'next';
import { z } from 'zod';
import * as ticketService from './ticket.service';

const createTicketSchema = z.object({
  eventId: z.string().min(1),
  price: z.number().positive(),
});

const reserveTicketSchema = z.object({
  eventId: z.number().positive(),
  quantity: z.number().positive().default(1),
});

export async function list(req: AuthenticatedRequest, res: NextApiResponse) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    const tickets = await ticketService.list(req.user.id, req.user.role);
    res.status(200).json(tickets);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error fetching tickets.';
    res.status(500).json({ message });
  }
}

export async function create(req: AuthenticatedRequest, res: NextApiResponse) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    const parseResult = createTicketSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ message: 'Invalid input', errors: parseResult.error.flatten() });
    }
    const dto: CreateTicketDto = { ...parseResult.data, userId: req.user.id };
    const ticket = await ticketService.create(dto);
    res.status(201).json(ticket);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error creating ticket.';
    res.status(400).json({ message });
  }
}

export async function getById(req: AuthenticatedRequest, res: NextApiResponse) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const ticketId = parseInt(req.query.id as string, 10);
    if (isNaN(ticketId)) {
      return res.status(400).json({ message: 'Invalid ticket ID' });
    }

    const ticket = await ticketService.getById(ticketId);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    // Only the ticket owner, event organizer, or admin can view the ticket
    if (req.user.id !== ticket.userId && 
        req.user.id !== ticket.event.organizerId && 
        req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    res.status(200).json(ticket);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error fetching ticket.';
    res.status(500).json({ message });
  }
}

export async function reserve(req: AuthenticatedRequest, res: NextApiResponse) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const parseResult = reserveTicketSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ message: 'Invalid input', errors: parseResult.error.flatten() });
    }

    const { eventId, quantity } = parseResult.data;

    const tickets = await ticketService.reserve(req.user.id, eventId, quantity);
    res.status(201).json(tickets);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error reserving tickets.';
    res.status(400).json({ message });
  }
}

export async function validate(req: AuthenticatedRequest, res: NextApiResponse) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const { ticketId } = req.body;
    if (!ticketId) {
      return res.status(400).json({ message: 'Ticket ID is required' });
    }

    const ticket = await ticketService.getById(parseInt(ticketId, 10));
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    // Only the event organizer or admin can validate tickets
    if (req.user.id !== ticket.event.organizerId && req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const validatedTicket = await ticketService.validate(parseInt(ticketId, 10));
    res.status(200).json(validatedTicket);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error validating ticket.';
    res.status(400).json({ message });
  }
}

export async function cancel(req: AuthenticatedRequest, res: NextApiResponse) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const { ticketId } = req.body;
    if (!ticketId) {
      return res.status(400).json({ message: 'Ticket ID is required' });
    }

    const ticket = await ticketService.getById(parseInt(ticketId, 10));
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    // Only the ticket owner, event organizer, or admin can cancel the ticket
    if (req.user.id !== ticket.userId && 
        req.user.id !== ticket.event.organizerId && 
        req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const cancelledTicket = await ticketService.cancel(parseInt(ticketId, 10));
    res.status(200).json(cancelledTicket);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error cancelling ticket.';
    res.status(400).json({ message });
  }
}

export async function download(req: AuthenticatedRequest, res: NextApiResponse) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const ticketId = parseInt(req.query.id as string, 10);
    if (isNaN(ticketId)) {
      return res.status(400).json({ message: 'Invalid ticket ID' });
    }

    const ticket = await ticketService.getById(ticketId);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    // Only the ticket owner can download the ticket
    if (req.user.id !== ticket.userId) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const pdfBuffer = await ticketService.generateTicketPdf(ticketId);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="ticket-${ticketId}.pdf"`);
    res.status(200).send(pdfBuffer);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error downloading ticket.';
    res.status(500).json({ message });
  }
}

export async function generateQRCode(req: AuthenticatedRequest, res: NextApiResponse) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const ticketId = parseInt(req.query.id as string, 10);
    if (isNaN(ticketId)) {
      return res.status(400).json({ message: 'Invalid ticket ID' });
    }

    const ticket = await ticketService.getById(ticketId);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    // Only the ticket owner can generate the QR code
    if (req.user.id !== ticket.userId) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const qrCodeImage = await ticketService.generateQRCodeForTicket(ticketId);

    res.setHeader('Content-Type', 'image/png');
    res.status(200).send(qrCodeImage);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error generating QR code.';
    res.status(500).json({ message });
  }
}
