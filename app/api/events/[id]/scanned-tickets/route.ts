import { NextRequest } from 'next/server';
import { logger } from '@/lib/logger';
import {
    NextApiResponse,
    createMethodHandler,
} from '@/lib/next-api-helpers';
import ticketService from '@/services/ticketService';

/**
 * GET /api/events/[id]/scanned-tickets
 * Get all scanned tickets for an event
 */
async function handleGet(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const eventId = params.id;
    
    if (!eventId) {
      return NextApiResponse.badRequest('Event ID is required');
    }

    logger.info('Fetching scanned tickets for event', { eventId });

    const scannedTickets = await ticketService.getScannedTicketsForEvent(eventId);
    
    // Format response to include essential info only
    const formattedTickets = scannedTickets.map(ticket => ({
      id: ticket.id,
      code: ticket.code,
      scannedAt: ticket.scannedAt,
      seatNumber: ticket.seatNumber,
      user: ticket.user ? {
        id: ticket.user.id,
        name: ticket.user.name,
        email: ticket.user.email
      } : null,
      order: ticket.order ? {
        id: ticket.order.id,
        totalPrice: ticket.order.totalPrice
      } : null
    }));
    
    logger.info('Scanned tickets retrieved successfully', { eventId, totalScanned: scannedTickets.length });

    return NextApiResponse.success({
      eventId,
      totalScanned: scannedTickets.length,
      tickets: formattedTickets
    });

  } catch (error) {
    logger.error('Error getting scanned tickets', { error, eventId: params.id });
    return NextApiResponse.error('Failed to get scanned tickets', 500);
  }
}

export const GET = createMethodHandler({
  GET: handleGet,
});
