import { NextRequest, NextResponse } from 'next/server';
import ticketService from '../../../../../src/services/ticketQRService';

/**
 * GET /api/events/[id]/scan-stats
 * Get scan statistics for an event
 */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const eventId = params.id;
    
    if (!eventId) {
      return NextResponse.json(
        { error: 'Event ID is required' },
        { status: 400 }
      );
    }

    const stats = await ticketService.getEventScanStats(eventId);
    
    return NextResponse.json({
      success: true,
      eventId,
      stats
    });

  } catch (error) {
    console.error('Error getting scan stats:', error);
    return NextResponse.json(
      { error: 'Failed to get scan statistics' },
      { status: 500 }
    );
  }
}
