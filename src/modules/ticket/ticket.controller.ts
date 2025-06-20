import type { AuthenticatedRequest } from '@/middlewares/auth';
import type { CreateTicketDto } from '@/types/dto/ticket/create-ticket.dto';
import type { NextApiResponse } from 'next';
import { z } from 'zod';
import * as ticketService from './ticket.service';

const createTicketSchema = z.object({
  eventId: z.string().min(1),
  price: z.number().positive(),
});

export async function list(req: AuthenticatedRequest, res: NextApiResponse) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    const tickets = await ticketService.list(req.user.id, req.user.role);
    res.status(200).json(tickets);
  } catch {
    res.status(500).json({ message: 'Error fetching tickets.' });
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
  } catch {
    res.status(400).json({ message: 'Error creating ticket.' });
  }
}