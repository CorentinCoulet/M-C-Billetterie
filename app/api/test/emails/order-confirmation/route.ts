import { NextRequest, NextResponse } from 'next/server';
import emailService from '../../../../../src/services/emailService';

/**
 * Test endpoint for sending order confirmation emails
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

    const testOrderDetails = {
      totalAmount: 95.50,
      orderDate: new Date(),
      tickets: [
        {
          name: 'Billet Standard',
          quantity: 2,
          price: 35.00,
          eventName: 'Concert Jazz Festival 2024',
          eventDate: new Date('2024-07-15T20:00:00'),
          eventLocation: 'Salle Pleyel, Paris'
        },
        {
          name: 'Billet VIP',
          quantity: 1,
          price: 25.50,
          eventName: 'Théâtre des Champs-Élysées',
          eventDate: new Date('2024-08-20T19:30:00'),
          eventLocation: 'Théâtre des Champs-Élysées, Paris'
        }
      ]
    };

    await emailService.sendOrderConfirmationEmail(
      email,
      name,
      'TEST-ORDER-' + Date.now(),
      testOrderDetails
    );

    return NextResponse.json({
      success: true,
      message: 'Order confirmation email sent successfully',
      recipient: email,
      orderDetails: testOrderDetails,
    });

  } catch (error) {
    console.error('Error sending order confirmation email:', error);
    return NextResponse.json(
      { error: 'Failed to send order confirmation email', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: '/api/test/emails/order-confirmation',
    description: 'Send test order confirmation email',
    method: 'POST',
    body: {
      email: 'recipient@example.com',
      name: 'Recipient Name'
    },
    note: 'Only available in development mode'
  });
}
