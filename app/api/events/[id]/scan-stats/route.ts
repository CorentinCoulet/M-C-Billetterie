import { NextRequest } from 'next/server';
import { logger } from '../../../../../lib/logger';
import {
    NextApiResponse,
    createMethodHandler,
} from '../../../../../src/lib/next-api-helpers';
import ticketService from '../../../../../src/services/ticketQRService';

/**
 * GET /api/events/[id]/scan-stats
 * Get scan statistics for an event
 */
async function handleGet(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const eventId = params.id;
    
    if (!eventId) {
      return NextApiResponse.badRequest('Event ID is required');
    }

    logger.info({ eventId }, 'Fetching scan statistics for event');

    const stats = await ticketService.getEventScanStats(eventId);
    
    logger.info({ eventId, stats }, 'Scan statistics retrieved successfully');

    return NextApiResponse.success({
      eventId,
      stats
    });

  } catch (error) {
    logger.error({ error, eventId: params.id }, 'Error getting scan stats');
    return NextApiResponse.error('Failed to get scan statistics', 500);
  }
}

export const GET = createMethodHandler({
  GET: handleGet,
});
