import Stripe from 'stripe';

// Initialize Stripe with API key from environment variables
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  console.warn('STRIPE_SECRET_KEY is not defined in environment variables. Stripe functionality will not work correctly.');
}

/**
 * Stripe client instance
 */
export const stripe = new Stripe(stripeSecretKey || 'dummy_key_for_development', {
  apiVersion: '2025-06-30.basil', // Use the latest API version
  appInfo: {
    name: process.env.APP_NAME || 'Billetterie',
    version: '1.0.0',
  },
  typescript: true,
});

/**
 * Format amount for Stripe (convert to cents)
 */
export function formatAmountForStripe(amount: number, currency: string = 'eur'): number {
  const currencies = {
    eur: 100,
    usd: 100,
    gbp: 100,
    jpy: 1,
  };
  
  const multiplier = currencies[currency.toLowerCase() as keyof typeof currencies] || 100;
  return Math.round(amount * multiplier);
}

/**
 * Format amount from Stripe (convert from cents to decimal)
 */
export function formatAmountFromStripe(amount: number, currency: string = 'eur'): number {
  const currencies = {
    eur: 100,
    usd: 100,
    gbp: 100,
    jpy: 1,
  };
  
  const divider = currencies[currency.toLowerCase() as keyof typeof currencies] || 100;
  return amount / divider;
}

/**
 * Create a payment intent
 */
export async function createPaymentIntent(
  amount: number,
  currency: string = 'eur',
  metadata: Record<string, string> = {},
  receiptEmail?: string
): Promise<Stripe.PaymentIntent> {
  return stripe.paymentIntents.create({
    amount: formatAmountForStripe(amount, currency),
    currency: currency.toLowerCase(),
    metadata,
    receipt_email: receiptEmail,
    payment_method_types: ['card'],
  });
}

/**
 * Retrieve a payment intent
 */
export async function retrievePaymentIntent(id: string): Promise<Stripe.PaymentIntent> {
  return stripe.paymentIntents.retrieve(id);
}

/**
 * Create a refund
 */
export async function createRefund(
  paymentIntentId: string,
  amount?: number,
  reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer',
  metadata?: Record<string, string>
): Promise<Stripe.Refund> {
  const refundParams: Stripe.RefundCreateParams = {
    payment_intent: paymentIntentId,
    metadata,
  };

  if (amount) {
    refundParams.amount = formatAmountForStripe(amount);
  }

  if (reason) {
    refundParams.reason = reason;
  }

  return stripe.refunds.create(refundParams);
}

/**
 * Create a Stripe Checkout session
 */
export async function createCheckoutSession(
  lineItems: Array<{
    price_data?: {
      currency: string;
      product_data: {
        name: string;
        description?: string;
        images?: string[];
      };
      unit_amount: number;
    };
    price?: string;
    quantity: number;
  }>,
  successUrl: string,
  cancelUrl: string,
  metadata: Record<string, string> = {},
  customerEmail?: string
): Promise<Stripe.Checkout.Session> {
  return stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: lineItems,
    mode: 'payment',
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata,
    customer_email: customerEmail,
  });
}

/**
 * Create a Stripe webhook event
 */
export function constructEventFromPayload(
  payload: string | Buffer,
  signature: string,
  webhookSecret: string
): Stripe.Event {
  return stripe.webhooks.constructEvent(
    payload,
    signature,
    webhookSecret
  );
}

export default stripe;