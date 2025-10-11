import { logger } from '@/lib/logger';
import { createMethodHandler, NextApiResponse } from '@/src/lib/next-api-helpers';
import { NextRequest } from 'next/server';
import emailService from '../../../../../src/services/emailService';

/**
 * Test endpoint for sending ticket emails
 * Only available in development mode
 */
async function handlePost(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    logger.warn({ 
      pathname: '/api/test/emails/tickets' 
    }, 'Attempt to access test endpoint in production');
    return NextApiResponse.error('Test endpoints not available in production', 403);
  }

  let email = 'test@example.com';
  
  try {
    const body = await request.json();
    const bodyData = body as { email?: string; name?: string };
    email = bodyData.email || 'test@example.com';
    const name = bodyData.name || 'Test User';

    logger.info({ 
      email,
      name,
      pathname: '/api/test/emails/tickets' 
    }, 'Sending test ticket email');

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

    logger.info({ 
      email,
      ticketsCount: testTickets.length,
      pathname: '/api/test/emails/tickets' 
    }, 'Test ticket email sent successfully');

    return NextApiResponse.success({
      message: 'Ticket email sent successfully',
      recipient: email,
      ticketsCount: testTickets.length,
    });

  } catch (error) {
    logger.error({ 
      error,
      email,
      pathname: '/api/test/emails/tickets' 
    }, 'Error sending ticket email');
    return NextApiResponse.error('Failed to send ticket email', 500);
  }
}

async function handleGet(request: NextRequest) {
  logger.info({ 
    pathname: '/api/test/emails/tickets' 
  }, 'Ticket email test info accessed');
  
  return NextApiResponse.success({
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

export default createMethodHandler({
  GET: handleGet,
  POST: handlePost,
});
