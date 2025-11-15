import { NextRequest } from 'next/server';
import { logger } from '@/lib/logger';
import {
    NextApiResponse,
    createMethodHandler,
} from '@/lib/next-api-helpers';
import ticketService from '@/services/ticketService';

/**
 * POST /api/tickets/[id]/regenerate-qr
 * Regenerate QR code for a ticket
 */
async function handlePost(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const ticketId = params.id;
    
    if (!ticketId) {
      return NextApiResponse.badRequest('Ticket ID is required');
    }

    logger.info('Regenerating QR code for ticket', { ticketId });

    // Check if ticket exists and is not already scanned
    const existingTicket = await ticketService.getTicketById(ticketId);
    if (!existingTicket) {
      logger.warn('Ticket not found for QR regeneration', { ticketId });
      return NextApiResponse.notFound('Ticket not found');
    }

    if (existingTicket.isScanned) {
      logger.warn('Cannot regenerate QR code for already scanned ticket', { ticketId });
      return NextApiResponse.badRequest('Cannot regenerate QR code for already used ticket');
    }

    // Generate new QR code
    const qrResult = await ticketService.generateTicketQRCode(ticketId);
    
    logger.info('QR code regenerated successfully', { ticketId, eventId: existingTicket.eventId });

    return NextApiResponse.success({
      message: 'QR code regenerated successfully',
      qrCode: qrResult.qrCodeDataUrl,
      generatedAt: new Date().toISOString(),
      ticket: {
        id: ticketId,
        eventId: existingTicket.eventId
      }
    });

  } catch (error) {
    logger.error('QR regeneration error', { error, ticketId: params.id });
    return NextApiResponse.error('Failed to regenerate QR code', 500);
  }
}

export const POST = createMethodHandler({
  POST: handlePost,
});
