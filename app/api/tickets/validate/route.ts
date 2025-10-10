import { NextRequest } from 'next/server';
import { z } from 'zod';
import { logger } from '../../../../lib/logger';
import {
  createMethodHandler,
  NextApiResponse,
  validateBody,
} from '../../../../src/lib/next-api-helpers';
import ticketService from '../../../../src/services/ticketQRService';

const validateQRSchema = z.object({
  qrContent: z.string().min(1, 'QR content is required'),
  markAsUsed: z.boolean().default(false),
});

/**
 * POST /api/tickets/validate
 * Validate a QR code and optionally mark ticket as used
 */
async function handlePost(request: NextRequest) {
  const { data, error } = await validateBody(request, validateQRSchema);
  if (error) return error;

  const { qrContent, markAsUsed } = data;

  try {
    logger.info({ qrContent, markAsUsed }, 'Validating ticket QR code');

    const validation = await ticketService.validateTicketQRCode(qrContent, markAsUsed);
    
    // Return appropriate status code based on validation result
    if (!validation.valid) {
      logger.warn({ qrContent, error: validation.error }, 'Ticket validation failed');
      
      return NextApiResponse.badRequest(validation.error || 'Validation failed', {
        valid: false,
        canBeScanned: validation.canBeScanned || false,
      });
    }

    // Success response
    logger.info({ 
      ticketId: validation.ticket?.id, 
      isAlreadyScanned: validation.isAlreadyScanned,
      markAsUsed 
    }, 'Ticket validated successfully');

    return NextApiResponse.success({
      valid: true,
      ticket: {
        id: validation.ticket?.id,
        eventId: validation.ticket?.eventId,
        eventTitle: validation.ticket?.event?.title,
        eventDate: validation.ticket?.event?.date,
        isScanned: validation.ticket?.isScanned,
        scannedAt: validation.ticket?.scannedAt,
        userEmail: validation.ticket?.user?.email,
      },
      isAlreadyScanned: validation.isAlreadyScanned,
      canBeScanned: validation.canBeScanned,
      message: validation.isAlreadyScanned 
        ? 'Ticket was already scanned' 
        : markAsUsed 
          ? 'Ticket validated and marked as used'
          : 'Ticket is valid'
    });

  } catch (error) {
    logger.error({ error, qrContent }, 'QR validation error');
    
    return NextApiResponse.error('Internal validation error', 500);
  }
}

export const POST = createMethodHandler({
  POST: handlePost,
});
