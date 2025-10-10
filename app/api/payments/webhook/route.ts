import { logger } from '@/lib/logger';
import { getStripeApiVersion, STRIPE_CONFIG, validateStripeConfig } from '@/src/config/stripe';
import { createMethodHandler } from '@/src/lib/next-api-helpers';
import prisma from '@/src/lib/prisma';
import { OrderService } from '@/src/services/orderService';
import { PaymentService } from '@/src/services/paymentService';
import { NextRequest, NextResponse } from 'next/server';

// Import Stripe dynamically to avoid build issues
const getStripe = async () => {
  // Skip Stripe initialization during build phase
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    throw new Error('Stripe not available during build phase');
  }

  const Stripe = (await import('stripe')).default;
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }
  
  // Use centralized API version management
  const apiVersion = getStripeApiVersion();
    
  return new Stripe(secretKey, {
    apiVersion: apiVersion as any,
    typescript: true, // Enable TypeScript support
  });
};

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

// 🚀 Cache for idempotency (prevent double processing)
const processedEvents = new Map<string, boolean>();

// Clean cache every hour to prevent memory leaks
const CACHE_CLEANUP_INTERVAL = STRIPE_CONFIG.CACHE_CLEANUP_INTERVAL;
const MAX_CACHE_SIZE = STRIPE_CONFIG.MAX_PROCESSED_EVENTS;
const CACHE_KEEP_SIZE = STRIPE_CONFIG.CACHE_CLEANUP_SIZE;

async function handlePost(request: NextRequest) {
  logger.info('Stripe webhook received');
  
  // Skip webhook processing during build phase
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return NextResponse.json({ 
      error: 'Webhook not available during build phase' 
    }, { status: 503 });
  }
  
  // Validate and log Stripe configuration on first request
  validateStripeConfig();
  
  if (!webhookSecret) {
    logger.error('STRIPE_WEBHOOK_SECRET missing');
    return NextResponse.json({ 
      error: 'Webhook secret not configured' 
    }, { status: 500 });
  }

  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    logger.error('Stripe signature missing');
    return NextResponse.json({ 
      error: 'No signature provided' 
    }, { status: 400 });
  }

  let event: any;

  // 🔒 Mandatory Stripe signature verification
  try {
    const stripeInstance = await getStripe();
    event = stripeInstance.webhooks.constructEvent(body, signature, webhookSecret);
    logger.info({ eventType: event.type, eventId: event.id }, 'Signature verified for event');
  } catch (err) {
    logger.error({ error: err }, 'Stripe signature verification failed');
    return NextResponse.json({ 
      error: 'Invalid signature' 
    }, { status: 400 });
  }

  // 🚀 Avoid processing the same event multiple times
  if (processedEvents.has(event.id)) {
    logger.warn({ eventId: event.id }, 'Event already processed - ignored');
    return NextResponse.json({ 
      received: true, 
      status: 'already_processed',
      event_id: event.id
    });
  }

  try {
    // 🎯 Complete Stripe event handling
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event);
        break;

      case 'payment_intent.requires_action':
        await handlePaymentIntentRequiresAction(event);
        break;

      case 'payment_intent.canceled':
        await handlePaymentIntentCanceled(event);
        break;

      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event);
        break;

      case 'checkout.session.expired':
        await handleCheckoutSessionExpired(event);
        break;

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event);
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        logger.info({ eventType: event.type }, 'Subscription event received - processing not implemented');
        break;

      default:
        logger.info({ eventType: event.type }, 'Unhandled event');
        break;
    }

    // Mark as processed for idempotency
    processedEvents.set(event.id, true);
    
    // Clean cache periodically (keep only the last CACHE_KEEP_SIZE)
    if (processedEvents.size > MAX_CACHE_SIZE) {
      const entries = Array.from(processedEvents.entries());
      processedEvents.clear();
      entries.slice(-CACHE_KEEP_SIZE).forEach(([id, processed]) => {
        processedEvents.set(id, processed);
      });
      logger.info({ keptEntries: CACHE_KEEP_SIZE }, 'Idempotency cache cleaned');
    }

    logger.info({ eventType: event.type, eventId: event.id }, 'Event processed successfully');
    return NextResponse.json({ 
      received: true, 
      event_type: event.type,
      event_id: event.id 
    });

  } catch (error) {
    logger.error({ error, eventType: event.type, eventId: event.id }, 'Error processing webhook');
    
    // 📊 Logging for debugging
    await logWebhookError(event, error);
    
    return NextResponse.json({ 
      error: 'Webhook processing failed',
      event_type: event.type,
      event_id: event.id 
    }, { status: 500 });
  }
}

export default createMethodHandler({
  POST: handlePost,
});

/**
 * 🎯 Processing of successful payments
 */
async function handlePaymentIntentSucceeded(event: any) {
  const paymentIntent = event.data.object;
  
  logger.info({ 
    paymentIntentId: paymentIntent.id,
    amount: paymentIntent.amount,
    currency: paymentIntent.currency,
    metadata: paymentIntent.metadata
  }, 'Payment Intent succeeded');

  try {
    // 🚀 Use our service with atomic transaction
    const paymentService = new PaymentService();
    const processedPayment = await paymentService.processSuccessfulPayment(paymentIntent.id);
    
    logger.info({
      paymentId: processedPayment.id,
      orderId: processedPayment.order?.id,
      userId: processedPayment.order?.user?.id,
      email: processedPayment.order?.user?.email
    }, 'Payment processed successfully');

    // 📧 Send confirmation email (to be implemented)
    if (processedPayment.order?.user?.email) {
      await sendPaymentConfirmationEmail(processedPayment);
    } else {
      logger.warn({ paymentId: processedPayment.id }, 'No email found for payment');
    }
    
  } catch (error) {
    logger.error({ error, paymentIntentId: paymentIntent.id }, 'Error processing payment_intent.succeeded');
    throw error;
  }
}

/**
 * 🎯 Processing of payment failures
 */
async function handlePaymentIntentFailed(event: any) {
  const paymentIntent = event.data.object;
  
  logger.error({ 
    paymentIntentId: paymentIntent.id,
    error: paymentIntent.last_payment_error?.message
  }, 'Payment Intent failed');

  try {
    const paymentService = new PaymentService();
    const failedPayment = await paymentService.handleFailedPayment(
      paymentIntent.id, 
      paymentIntent.last_payment_error?.message
    );
    
    logger.info({
      paymentId: failedPayment.id,
      orderId: failedPayment.order?.id,
      reason: paymentIntent.last_payment_error?.message
    }, 'Failed payment processed');

    // 📧 Send payment failure email
    if (failedPayment.order?.user?.email) {
      await sendPaymentFailedEmail(failedPayment, paymentIntent.last_payment_error?.message);
    } else {
      logger.warn({ paymentId: failedPayment.id }, 'No email found for failed payment');
    }
    
  } catch (error) {
    logger.error({ error, paymentIntentId: paymentIntent.id }, 'Error processing payment_intent.failed');
    throw error;
  }
}

/**
 * 🎯 Processing of payments requiring action
 */
async function handlePaymentIntentRequiresAction(event: any) {
  const paymentIntent = event.data.object;
  
  logger.info({ 
    paymentIntentId: paymentIntent.id,
    nextAction: paymentIntent.next_action?.type
  }, 'Payment Intent requires action');

  // Log for tracking - no DB action needed
  await logPaymentRequiresAction(paymentIntent);
}

/**
 * 🎯 Processing of canceled payments
 */
async function handlePaymentIntentCanceled(event: any) {
  const paymentIntent = event.data.object;
  
  logger.info({ paymentIntentId: paymentIntent.id }, 'Payment Intent canceled');

  try {
    const paymentService = new PaymentService();
    await paymentService.handleFailedPayment(paymentIntent.id, 'Payment cancelled');
    
    logger.info({ paymentIntentId: paymentIntent.id }, 'Payment cancellation processed');
    
  } catch (error) {
    logger.error({ error, paymentIntentId: paymentIntent.id }, 'Error processing payment_intent.canceled');
    throw error;
  }
}

/**
 * 🎯 Processing of completed checkout sessions
 */
async function handleCheckoutSessionCompleted(event: any) {
  const session = event.data.object;
  
  logger.info({ 
    sessionId: session.id,
    paymentIntent: session.payment_intent,
    metadata: session.metadata
  }, 'Checkout session completed');

  // If we have a payment_intent, it will be processed by the payment_intent.succeeded event
  // Otherwise, process here
  if (!session.payment_intent && session.payment_status === 'paid') {
    try {
      await handleCheckoutDirectPayment(session);
    } catch (error) {
      logger.error({ error, sessionId: session.id }, 'Error processing checkout.session.completed');
      throw error;
    }
  }
}

/**
 * 🎯 Processing of expired checkout sessions
 */
async function handleCheckoutSessionExpired(event: any) {
  const session = event.data.object;
  
  logger.info({ sessionId: session.id }, 'Checkout session expired');
  
  // Release reserved resources
  if (session.metadata?.orderId) {
    try {
      const orderService = new OrderService();
      await orderService.cancelOrder(session.metadata.orderId);
      
      logger.info({ orderId: session.metadata.orderId }, 'Order canceled for expired session');
    } catch (error) {
      logger.error({ error, orderId: session.metadata.orderId }, 'Error canceling order for expired session');
      throw error;
    }
  }
}

/**
 * 🎯 Processing of invoice payments
 */
async function handleInvoicePaymentSucceeded(event: any) {
  const invoice = event.data.object;
  
  logger.info({ 
    invoiceId: invoice.id,
    customer: invoice.customer,
    amountPaid: invoice.amount_paid
  }, 'Invoice payment succeeded');
  
  // Specific processing for subscriptions if applicable
  // Note: subscription info would need to be accessed differently based on your use case
}

/**
 * 🎯 Processing of direct checkout payments
 */
async function handleCheckoutDirectPayment(session: any) {
  const { orderId } = session.metadata || {};
  
  if (!orderId) {
    logger.error({ sessionId: session.id }, 'No orderId in checkout session metadata');
    throw new Error('Missing orderId in session metadata');
  }

  if (!session.amount_total) {
    logger.error({ sessionId: session.id }, 'No amount_total in checkout session');
    throw new Error('Missing amount_total in session');
  }

  try {
    const orderService = new OrderService();
    
    // Create payment record and complete order
    await prisma.$transaction(async (tx) => {
      // Verify order exists and is not already paid
      const existingOrder = await tx.order.findUnique({
        where: { id: orderId },
        include: { payment: true }
      });

      if (!existingOrder) {
        throw new Error(`Order ${orderId} not found`);
      }

      if (existingOrder.status === 'paid') {
        logger.warn({ orderId }, 'Order already paid - skipping');
        return;
      }

      // Create payment
      const payment = await tx.payment.create({
        data: {
          orderId,
          paymentMethod: 'STRIPE_CHECKOUT',
          paymentStatus: 'COMPLETED',
          paymentDate: new Date(),
          transactionId: session.id,
          currency: session.currency?.toUpperCase() || 'EUR'
        }
      });

      // Complete order
      await orderService.completeOrder(orderId, payment.id);
    });
    
    logger.info({ sessionId: session.id, orderId }, 'Direct checkout payment processed');
    
  } catch (error) {
    logger.error({ error, sessionId: session.id }, 'Error processing direct checkout payment');
    throw error;
  }
}

/**
 * 📧 Send payment confirmation email (stub)
 */
async function sendPaymentConfirmationEmail(payment: any) {
  // TODO: Implement email sending with email service
  logger.info({ email: payment.order?.user?.email }, 'Confirmation email to send');
}

/**
 * 📧 Send payment failure email (stub)
 */
async function sendPaymentFailedEmail(payment: any, reason?: string) {
  // TODO: Implement failure email sending
  logger.info({ email: payment.order?.user?.email, reason }, 'Failure email to send');
}

/**
 * 📊 Log payments requiring action
 */
async function logPaymentRequiresAction(paymentIntent: any) {
  // TODO: Store in logs or monitoring system
  logger.info({
    id: paymentIntent.id,
    nextAction: paymentIntent.next_action?.type
  }, 'Payment requires action');
}

/**
 * 📊 Log webhook errors for debugging
 */
async function logWebhookError(event: any, error: any) {
  try {
    // TODO: Implement logging to DB or external service
    logger.error({
      eventId: event.id,
      eventType: event.type,
      error: error instanceof Error ? error.message : String(error),
      eventData: JSON.stringify(event.data, null, 2).substring(0, 1000) // Truncate to avoid long logs
    }, 'Webhook Error Log');
  } catch (logError) {
    logger.error({ error: logError }, 'Error logging webhook error');
  }
}

// 🔄 Clean idempotency cache periodically (every hour)
setInterval(() => {
  if (processedEvents.size > CACHE_KEEP_SIZE) {
    const entries = Array.from(processedEvents.entries());
    processedEvents.clear();
    const keptEntries = Math.floor(CACHE_KEEP_SIZE / 2);
    entries.slice(-keptEntries).forEach(([id, processed]) => {
      processedEvents.set(id, processed);
    });
    logger.info({ keptEntries }, 'Scheduled idempotency cache cleanup');
  }
}, CACHE_CLEANUP_INTERVAL);
