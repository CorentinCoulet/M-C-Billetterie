import { NextRequest } from 'next/server';
import {
    createMethodHandler,
    NextApiResponse,
    withAuth
} from '../../../../../src/lib/next-api-helpers';

async function handleGetEventTickets(request: NextRequest, { params }: { params: { id: string } }) {
  return withAuth(request, async (req, user) => {
    try {
      const { id } = params;

      // Import ticket service
      const ticketServiceModule = await import('../../../../../src/modules/ticket/ticket.service');

      // Get tickets for event
      const tickets = await ticketServiceModule.getByEventId(id);

      return NextApiResponse.success(tickets, 'Tickets récupérés');
    } catch (error: any) {
      console.error('Get event tickets error:', error);
      return NextApiResponse.error('Erreur lors de la récupération des tickets', 500);
    }
  });
}

export default createMethodHandler({
  GET: handleGetEventTickets,
});
