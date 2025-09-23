import Stripe from 'stripe';
import { CONFIG } from '../core/config';

/**
 * Unified Stripe Service using centralized configuration
 */

let stripe: Stripe | null = null;

// Initialize Stripe only if payment feature is enabled and keys are available
if (CONFIG.FEATURES.PAYMENTS && CONFIG.STRIPE.SECRET_KEY !== 'sk_test_your_test_key') {
  stripe = new Stripe(CONFIG.STRIPE.SECRET_KEY, {
    apiVersion: '2025-08-27.basil',
    appInfo: {
      name: 'Billetterie',
      version: '1.0.0',
    },
  });
}

export interface PaymentIntentParams {
  amount: number;
  currency?: string;
  metadata?: Record<string, string>;
  automaticPaymentMethods?: boolean;
}

export interface CheckoutSessionParams {
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
}

class StripeService {
  /**
   * Check if Stripe is available
   */
  isAvailable(): boolean {
    return stripe !== null && CONFIG.FEATURES.PAYMENTS;
  }

  /**
   * Create a payment intent
   */
  async createPaymentIntent(params: PaymentIntentParams): Promise<Stripe.PaymentIntent> {
    if (!this.isAvailable()) {
      throw new Error('Stripe service is not available');
    }

    const {
      amount,
      currency = CONFIG.STRIPE.CURRENCY,
      metadata = {},
      automaticPaymentMethods = true
    } = params;

    return stripe!.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency,
      metadata,
      automatic_payment_methods: {
        enabled: automaticPaymentMethods,
      },
    });
  }

  /**
   * Create a checkout session
   */
  async createCheckoutSession(params: CheckoutSessionParams): Promise<Stripe.Checkout.Session> {
    if (!this.isAvailable()) {
      throw new Error('Stripe service is not available');
    }

    const {
      lineItems,
      metadata = {},
      successUrl = CONFIG.STRIPE.SUCCESS_URL,
      cancelUrl = CONFIG.STRIPE.CANCEL_URL,
      customerEmail,
      expiresAt,
    } = params;

    return stripe!.checkout.sessions.create({
      payment_method_types: ['card'],
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
  async retrievePaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    if (!this.isAvailable()) {
      throw new Error('Stripe service is not available');
    }

    return stripe!.paymentIntents.retrieve(paymentIntentId);
  }

  /**
   * Retrieve a checkout session
   */
  async retrieveCheckoutSession(sessionId: string): Promise<Stripe.Checkout.Session> {
    if (!this.isAvailable()) {
      throw new Error('Stripe service is not available');
    }

    return stripe!.checkout.sessions.retrieve(sessionId);
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string | Buffer, signature: string): Stripe.Event {
    if (!this.isAvailable()) {
      throw new Error('Stripe service is not available');
    }

    if (CONFIG.STRIPE.WEBHOOK_SECRET === 'whsec_your_webhook_secret') {
      throw new Error('Webhook secret not configured');
    }

    try {
      return stripe!.webhooks.constructEvent(
        payload,
        signature,
        CONFIG.STRIPE.WEBHOOK_SECRET
      );
    } catch (error) {
      console.error('Webhook signature verification failed:', error);
      throw error;
    }
  }

  /**
   * Format amount for display (convert from cents to currency)
   */
  formatAmountForDisplay(amount: number, currency: string = CONFIG.STRIPE.CURRENCY): string {
    const formatter = new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency,
    });

    return formatter.format(amount / 100);
  }

  /**
   * Format amount for Stripe (convert from currency to cents)
   */
  formatAmountForStripe(amount: number): number {
    return Math.round(amount * 100);
  }

  /**
   * Create a refund
   */
  async createRefund(paymentIntentId: string, amount?: number): Promise<Stripe.Refund> {
    if (!this.isAvailable()) {
      throw new Error('Stripe service is not available');
    }

    const refundData: Stripe.RefundCreateParams = {
      payment_intent: paymentIntentId,
    };

    if (amount) {
      refundData.amount = Math.round(amount * 100);
    }

    return stripe!.refunds.create(refundData);
  }

  /**
   * List payment methods for a customer
   */
  async listPaymentMethods(customerId: string): Promise<Stripe.ApiList<Stripe.PaymentMethod>> {
    if (!this.isAvailable()) {
      throw new Error('Stripe service is not available');
    }

    return stripe!.paymentMethods.list({
      customer: customerId,
      type: 'card',
    });
  }

  /**
   * Create a customer
   */
  async createCustomer(params: {
    email: string;
    name?: string;
    metadata?: Record<string, string>;
  }): Promise<Stripe.Customer> {
    if (!this.isAvailable()) {
      throw new Error('Stripe service is not available');
    }

    return stripe!.customers.create(params);
  }

  /**
   * Get Stripe instance (for advanced usage)
   */
  getStripeInstance(): Stripe | null {
    return stripe;
  }
}

// Export singleton instance
export const stripeService = new StripeService();

// Export named functions for backward compatibility
export const createPaymentIntent = stripeService.createPaymentIntent.bind(stripeService);
export const createCheckoutSession = stripeService.createCheckoutSession.bind(stripeService);
export const retrievePaymentIntent = stripeService.retrievePaymentIntent.bind(stripeService);
export const retrieveCheckoutSession = stripeService.retrieveCheckoutSession.bind(stripeService);
export const verifyWebhookSignature = stripeService.verifyWebhookSignature.bind(stripeService);
export const formatAmountForDisplay = stripeService.formatAmountForDisplay.bind(stripeService);
export const formatAmountForStripe = stripeService.formatAmountForStripe.bind(stripeService);

// Export configuration for backward compatibility
export const STRIPE_CONFIG = CONFIG.STRIPE;

export default stripeService;
