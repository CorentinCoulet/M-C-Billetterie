import Stripe from 'stripe';

/**
 * Stripe payment configuration
 */

// Initialize Stripe with API key from environment variables
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || 'sk_test_your_test_key';
const stripePublicKey = process.env.STRIPE_PUBLIC_KEY || 'pk_test_your_test_key';

// Create Stripe instance
const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2023-10-16', // Use the latest API version or specify a fixed version
  appInfo: {
    name: 'M&C Society Ticketing',
    version: '1.0.0',
  },
});

// Stripe configuration
export const STRIPE_CONFIG = {
  // API keys
  SECRET_KEY: stripeSecretKey,
  PUBLIC_KEY: stripePublicKey,
  
  // Webhook secret for verifying webhook events
  WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || 'whsec_your_webhook_secret',
  
  // Currency (ISO currency code)
  CURRENCY: process.env.STRIPE_CURRENCY || 'eur',
  
  // Payment methods to accept
  PAYMENT_METHODS: ['card'],
  
  // Success and cancel URLs for checkout sessions
  SUCCESS_URL: process.env.STRIPE_SUCCESS_URL || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
  CANCEL_URL: process.env.STRIPE_CANCEL_URL || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/checkout/cancel?session_id={CHECKOUT_SESSION_ID}`,
  
  // Automatic tax calculation
  AUTO_TAX: false,
  
  // Expiration time for payment sessions (in seconds)
  PAYMENT_INTENT_EXPIRATION: 30 * 60, // 30 minutes
  
  // Metadata keys
  METADATA: {
    ORDER_ID: 'order_id',
    USER_ID: 'user_id',
    EVENT_ID: 'event_id',
  }
};

/**
 * Create a payment intent
 */
export async function createPaymentIntent(amount: number, currency: string = STRIPE_CONFIG.CURRENCY, metadata: Record<string, string> = {}) {
  return stripe.paymentIntents.create({
    amount: Math.round(amount * 100), // Convert to cents
    currency,
    metadata,
    automatic_payment_methods: {
      enabled: true,
    },
  });
}

/**
 * Create a checkout session
 */
export async function createCheckoutSession(params: {
  lineItems: Array<{
    price_data: {
      currency: string;
      product_data: {
        name: string;
        description?: string;
        images?: string[];
      };
      unit_amount: number;
    };
    quantity: number;
  }>;
  metadata?: Record<string, string>;
  successUrl?: string;
  cancelUrl?: string;
  customerEmail?: string;
  expiresAt?: number;
}) {
  const {
    lineItems,
    metadata = {},
    successUrl = STRIPE_CONFIG.SUCCESS_URL,
    cancelUrl = STRIPE_CONFIG.CANCEL_URL,
    customerEmail,
    expiresAt,
  } = params;

  return stripe.checkout.sessions.create({
    payment_method_types: STRIPE_CONFIG.PAYMENT_METHODS,
    line_items: lineItems,
    mode: 'payment',
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata,
    customer_email: customerEmail,
    expires_at: expiresAt,
  });
}

/**
 * Retrieve a payment intent
 */
export async function retrievePaymentIntent(paymentIntentId: string) {
  return stripe.paymentIntents.retrieve(paymentIntentId);
}

/**
 * Retrieve a checkout session
 */
export async function retrieveCheckoutSession(sessionId: string) {
  return stripe.checkout.sessions.retrieve(sessionId);
}

/**
 * Verify a webhook signature
 */
export function verifyWebhookSignature(payload: string | Buffer, signature: string) {
  try {
    return stripe.webhooks.constructEvent(
      payload,
      signature,
      STRIPE_CONFIG.WEBHOOK_SECRET
    );
  } catch (error) {
    throw error;
  }
}

/**
 * Format amount for display (convert from cents to currency)
 */
export function formatAmountForDisplay(amount: number, currency: string = STRIPE_CONFIG.CURRENCY): string {
  const formatter = new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
  });
  
  return formatter.format(amount / 100);
}

/**
 * Format amount for Stripe (convert from currency to cents)
 */
export function formatAmountForStripe(amount: number): number {
  return Math.round(amount * 100);
}

export default {
  stripe,
  STRIPE_CONFIG,
  createPaymentIntent,
  createCheckoutSession,
  retrievePaymentIntent,
  retrieveCheckoutSession,
  verifyWebhookSignature,
  formatAmountForDisplay,
  formatAmountForStripe,
};