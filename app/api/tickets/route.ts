import { NextRequest } from 'next/server';
import { z } from 'zod';
import {
  getQueryParam,
  NextApiResponse,
  validateBody,
  withAuth
} from '../../../src/lib/next-api-helpers';

const createTicketSchema = z.object({
  eventId: z.string().min(1, 'ID de l\'événement requis'),
  seatNumber: z.string().optional(),
});

async function handleGetTickets(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    try {
      // Import ticket service
      const ticketServiceModule = await import('../../../src/modules/ticket/ticket.service');
      
      // Extract query parameters
      const eventId = getQueryParam(req, 'eventId');
      const status = getQueryParam(req, 'status');
      
      // Get user's tickets
      const tickets = await ticketServiceModule.getUserTickets(user.id);

      return NextApiResponse.success(tickets, 'Billets récupérés');
    } catch (error: any) {
      return NextApiResponse.error('Erreur lors de la récupération des billets', 500);
    }
  });
}

async function handleCreateTicket(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    const { data, error } = await validateBody(req, createTicketSchema);
    if (error) return error;

    try {
      // Import ticket service
      const ticketServiceModule = await import('../../../src/modules/ticket/ticket.service');
      
      // Create ticket with user ID
      const ticketData = {
        ...data,
        userId: user.id,
      };

      const ticket = await ticketServiceModule.createTicket(ticketData);

      return NextApiResponse.success(ticket, 'Billet créé avec succès', 201);
    } catch (error: any) {
      return NextApiResponse.error(
        error.message || 'Erreur lors de la création du billet',
        500
      );
    }
  });
}

export async function GET(request: NextRequest) {
  return handleGetTickets(request);
}

export async function POST(request: NextRequest) {
  return handleCreateTicket(request);
}
