import { STRIPE_CONFIG } from '@/config/stripe';
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(STRIPE_CONFIG.SECRET_KEY, {
  apiVersion: '2023-10-16',
});

const endpointSecret = STRIPE_CONFIG.WEBHOOK_SECRET;

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature') as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    );
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object as Stripe.Checkout.Session;
      await handleSuccessfulPayment(session);
      break;

    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      console.log('PaymentIntent succeeded:', paymentIntent.id);
      break;

    case 'payment_intent.payment_failed':
      const failedPayment = event.data.object as Stripe.PaymentIntent;
      console.log('PaymentIntent failed:', failedPayment.id);
      break;

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}

async function handleSuccessfulPayment(session: Stripe.Checkout.Session) {
  console.log('Payment successful for session:', session.id);
  
  const { eventId, userId, quantity, totalAmount } = session.metadata || {};
  
  if (!eventId || !userId || !quantity) {
    console.error('Missing metadata in session:', session.id);
    return;
  }

  try {
    // Here we would normally:
    // 1. Update the order status in database
    // 2. Generate tickets with QR codes
    // 3. Send confirmation email
    
    console.log('Processing successful payment:', {
      sessionId: session.id,
      eventId,
      userId,
      quantity,
      totalAmount,
      customerEmail: session.customer_details?.email,
    });

    // For now, we'll just log the successful payment
    // When database is ready, we'll implement the full workflow
    
  } catch (error) {
    console.error('Error processing successful payment:', error);
  }
}
