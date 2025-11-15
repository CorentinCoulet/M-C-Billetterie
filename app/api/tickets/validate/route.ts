import { NextRequest } from 'next/server';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import {
    createMethodHandler,
    NextApiResponse,
    validateBody,
} from '@/lib/next-api-helpers';
import ticketService from '@/services/ticketService';

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
    logger.info('Validating ticket QR code', { qrContent, markAsUsed });

    const validation = await ticketService.validateTicketQRCode(qrContent, markAsUsed);
    
    // Return appropriate status code based on validation result
    if (!validation.valid) {
      logger.warn('Ticket validation failed', { qrContent, error: validation.error });

      return NextApiResponse.badRequest(validation.error || 'Validation failed', {
        valid: false,
        canBeScanned: validation.canBeScanned || false,
      });
    }

    // Success response
    logger.info('Ticket validated successfully', {
      ticketId: validation.ticket?.id,
      isAlreadyScanned: validation.isAlreadyScanned,
      markAsUsed 
    });

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
    logger.error('QR validation error', { error, qrContent });

    return NextApiResponse.error('Internal validation error', 500);
  }
}

export const POST = createMethodHandler({
  POST: handlePost,
});
