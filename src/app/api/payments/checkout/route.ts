import { STRIPE_CONFIG } from '@/config/stripe';
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(STRIPE_CONFIG.SECRET_KEY, {
  apiVersion: '2023-10-16',
});

export async function POST(request: NextRequest) {
  try {
    const { eventId, quantity, userId } = await request.json();

    // Validate input
    if (!eventId || !quantity || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // For now, we'll use mock data since we can't access the database
    const mockEvent = {
      id: eventId,
      title: 'Concert de Jazz',
      price: 2500, // 25.00 EUR in cents
      currency: 'eur',
    };



    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: mockEvent.currency,
            product_data: {
              name: mockEvent.title,
              description: `Billet pour ${mockEvent.title}`,
            },
            unit_amount: mockEvent.price,
          },
          quantity: quantity,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001'}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001'}/events/${eventId}`,        metadata: {
          eventId: eventId,
          userId: userId,
          quantity: quantity.toString(),
          totalAmount: (mockEvent.price * quantity).toString(),
        },
    });

    return NextResponse.json({ 
      sessionId: session.id,
      url: session.url 
    });

  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
