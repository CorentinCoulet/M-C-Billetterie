import { generateOrderTickets } from '@/lib/qrcode';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { orderId, eventId, userId, quantity } = await request.json();

    // Validate input
    if (!orderId || !eventId || !userId || !quantity) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Mock event data (replace with database query when ready)
    const mockEventData = {
      eventTitle: 'Concert de Jazz',
      eventDate: '2025-02-15T20:00:00Z',
      venue: 'Salle Pleyel, Paris',
    };

    // Generate tickets with QR codes
    const tickets = await generateOrderTickets({
      orderId,
      eventId,
      userId,
      eventTitle: mockEventData.eventTitle,
      eventDate: mockEventData.eventDate,
      venue: mockEventData.venue,
      quantity: parseInt(quantity),
      validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // Valid for 1 year
    });

    return NextResponse.json({
      success: true,
      tickets: tickets.map(ticket => ({
        ticketId: ticket.ticketId,
        qrCode: ticket.qrCodeDataURL,
        data: ticket.ticketData,
      })),
    });

  } catch (error) {
    console.error('Error generating tickets:', error);
    return NextResponse.json(
      { error: 'Failed to generate tickets' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get('orderId');

  if (!orderId) {
    return NextResponse.json(
      { error: 'Order ID is required' },
      { status: 400 }
    );
  }

  try {
    // Here we would normally fetch tickets from database
    // For now, return mock data
    return NextResponse.json({
      message: 'Tickets retrieval not implemented yet - database needed',
      orderId,
    });

  } catch (error) {
    console.error('Error fetching tickets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tickets' },
      { status: 500 }
    );
  }
}
