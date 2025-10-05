import { NextRequest, NextResponse } from 'next/server';
import emailService from '../../../../../src/services/emailService';

/**
 * Test endpoint for sending ticket emails
 * Only available in development mode
 */
export async function POST(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Test endpoints not available in production' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { email = 'test@example.com', name = 'Test User' } = body;

    const testTickets = [
      {
        id: 'ticket-001',
        name: 'Billet Standard #001',
        eventName: 'Concert Jazz Festival 2024',
        eventDate: new Date('2024-07-15T20:00:00'),
        eventLocation: 'Salle Pleyel, Paris',
        qrCode: 'QR123456789ABC',
        instructions: 'Présentez ce QR code à l\'entrée principale'
      },
      {
        id: 'ticket-002',
        name: 'Billet Standard #002',
        eventName: 'Concert Jazz Festival 2024',
        eventDate: new Date('2024-07-15T20:00:00'),
        eventLocation: 'Salle Pleyel, Paris',
        qrCode: 'QR987654321DEF',
        instructions: 'Présentez ce QR code à l\'entrée principale'
      }
    ];

    await emailService.sendTicketEmail(
      email,
      name,
      'TEST-ORDER-' + Date.now(),
      testTickets
    );

    return NextResponse.json({
      success: true,
      message: 'Ticket email sent successfully',
      recipient: email,
      ticketsCount: testTickets.length,
    });

  } catch (error) {
    console.error('Error sending ticket email:', error);
    return NextResponse.json(
      { error: 'Failed to send ticket email', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: '/api/test/emails/tickets',
    description: 'Send test ticket email with QR codes',
    method: 'POST',
    body: {
      email: 'recipient@example.com',
      name: 'Recipient Name'
    },
    note: 'Only available in development mode'
  });
}
