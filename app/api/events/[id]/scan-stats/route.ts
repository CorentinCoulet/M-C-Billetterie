import { NextRequest } from 'next/server';
import { logger } from '@/lib/logger';
import {
    NextApiResponse,
    createMethodHandler,
} from '@/lib/next-api-helpers';
import ticketService from '@/services/ticketService';

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

    logger.info('Fetching scan statistics for event', { eventId });

    const stats = await ticketService.getEventScanStats(eventId);
    
    logger.info('Scan statistics retrieved successfully', { eventId, stats });

    return NextApiResponse.success({
      eventId,
      stats
    });

  } catch (error) {
    logger.error('Error getting scan stats', { error, eventId: params.id });
    return NextApiResponse.error('Failed to get scan statistics', 500);
  }
}

export const GET = createMethodHandler({
  GET: handleGet,
});
