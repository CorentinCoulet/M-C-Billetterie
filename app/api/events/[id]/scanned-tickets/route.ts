import { NextRequest, NextResponse } from 'next/server';
import ticketService from '../../../../../src/services/ticketQRService';

/**
 * GET /api/events/[id]/scanned-tickets
 * Get all scanned tickets for an event
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
    
    return NextResponse.json({
      success: true,
      eventId,
      totalScanned: scannedTickets.length,
      tickets: formattedTickets
    });

  } catch (error) {
    console.error('Error getting scanned tickets:', error);
    return NextResponse.json(
      { error: 'Failed to get scanned tickets' },
      { status: 500 }
    );
  }
}
