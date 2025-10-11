import { logger } from '@/lib/logger';
import { createMethodHandler, NextApiResponse } from '@/src/lib/next-api-helpers';
import { NextRequest } from 'next/server';
import emailService from '../../../../../src/services/emailService';

/**
 * Test endpoint for sending order confirmation emails
 * Only available in development mode
 */
async function handlePost(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    logger.warn({ 
      pathname: '/api/test/emails/order-confirmation' 
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
      pathname: '/api/test/emails/order-confirmation' 
    }, 'Sending test order confirmation email');

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

    logger.info({ 
      email,
      totalAmount: testOrderDetails.totalAmount,
      pathname: '/api/test/emails/order-confirmation' 
    }, 'Test order confirmation email sent successfully');

    return NextApiResponse.success({
      message: 'Order confirmation email sent successfully',
      recipient: email,
      orderDetails: testOrderDetails,
    });

  } catch (error) {
    logger.error({ 
      error,
      email,
      pathname: '/api/test/emails/order-confirmation' 
    }, 'Error sending order confirmation email');
    return NextApiResponse.error('Failed to send order confirmation email', 500);
  }
}

async function handleGet(request: NextRequest) {
  logger.info({ 
    pathname: '/api/test/emails/order-confirmation' 
  }, 'Order confirmation email test info accessed');
  
  return NextApiResponse.success({
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

export default createMethodHandler({
  GET: handleGet,
  POST: handlePost,
});
