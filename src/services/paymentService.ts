import prisma from '@/lib/prisma';
import { PaymentStatus, OrderStatus } from '@prisma/client';
import Stripe from 'stripe';
import orderService from './orderService';

// Types spécifiques pour les relations
type UserBasic = {
  id: string;
  name: string | null;
  email: string;
}

type OrderBasic = {
  id: string;
  userId: string;
  status: OrderStatus;
  totalAmount: number;
  customerEmail: string | null;
  createdAt: Date;
  user: UserBasic | null;
}

type PaymentWithRelations = {
  id: string;
  orderId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  provider: string;
  providerPaymentId: string | null;
  providerRefundId: string | null;
  providerResponse: string | null;
  errorMessage: string | null;
  refundedAmount: number | null;
  refundReason: string | null;
  paidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  order: OrderBasic | null;
}

// Types d'entrée pour les opérations
type PaymentCreateInput = {
  orderId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  provider: string;
  providerPaymentId?: string | null;
  providerResponse?: string | null;
}

type PaymentUpdateInput = {
  status?: PaymentStatus;
  providerPaymentId?: string | null;
  providerRefundId?: string | null;
  providerResponse?: string | null;
  errorMessage?: string | null;
  refundedAmount?: number | null;
  refundReason?: string | null;
  paidAt?: Date | null;
}

type PaymentWhereInput = {
  id?: string;
  orderId?: string;
  status?: PaymentStatus;
  provider?: string;
  createdAt?: {
    gte?: Date;
    lte?: Date;
  };
  AND?: PaymentWhereInput[];
  OR?: PaymentWhereInput[];
}

type PaymentOrderByInput = {
  id?: 'asc' | 'desc';
  createdAt?: 'asc' | 'desc';
  updatedAt?: 'asc' | 'desc';
  status?: 'asc' | 'desc';
  amount?: 'asc' | 'desc';
}

type PaymentIntentResult = {
  clientSecret: string;
  paymentId: string;
}

type PaymentStatistics = {
  totalPayments: number;
  successfulPayments: number;
  failedPayments: number;
  refundedPayments: number;
  totalRevenue: number;
  totalRefunded: number;
}

// This will be imported from the stripe.ts utility file once created
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16', // Use the latest API version
});

/**
 * Service for payment processing operations
 */
export class PaymentService {
  /**
   * Get a payment by ID
   */
  async getPaymentById(id: string): Promise<PaymentWithRelations | null> {
    return prisma.payment.findUnique({
      where: { id },
      include: {
        order: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      }
    }) as Promise<PaymentWithRelations | null>;
  }

  /**
   * Get all payments with pagination and filtering
   */
  async getPayments(params: {
    skip?: number;
    take?: number;
    where?: PaymentWhereInput;
    orderBy?: PaymentOrderByInput;
  }): Promise<PaymentWithRelations[]> {
    const { skip, take, where, orderBy } = params;
    return prisma.payment.findMany({
      skip,
      take,
      where,
      orderBy: orderBy || { createdAt: 'desc' },
      include: {
        order: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      }
    }) as Promise<PaymentWithRelations[]>;
  }

  /**
   * Create a payment intent with Stripe
   */
  async createPaymentIntent(orderId: string): Promise<PaymentIntentResult> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: true,
        tickets: {
          include: {
            ticket: {
              include: {
                event: true
              }
            }
          }
        }
      }
    });

    if (!order) {
      throw new Error('Order not found');
    }

    if (order.status === 'COMPLETED') {
      throw new Error('Order is already paid');
    }

    if (order.status === 'CANCELLED') {
      throw new Error('Cannot pay for a cancelled order');
    }

    // Create a payment record in the database
    const payment = await prisma.payment.create({
      data: {
        orderId,
        amount: order.totalAmount,
        currency: 'EUR', // Default currency
        status: 'PENDING',
        provider: 'STRIPE'
      }
    });

    // Create a payment intent with Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(order.totalAmount * 100), // Stripe expects amount in cents
      currency: 'eur',
      metadata: {
        orderId: order.id,
        paymentId: payment.id,
        userId: order.userId
      },
      receipt_email: order.customerEmail || order.user?.email,
      description: `Payment for order #${order.id}`,
    });

    // Update the payment record with the Stripe payment intent ID
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        providerPaymentId: paymentIntent.id
      }
    });

    return {
      clientSecret: paymentIntent.client_secret!,
      paymentId: payment.id
    };
  }

  /**
   * Process a successful payment
   */
  async processSuccessfulPayment(paymentIntentId: string): Promise<PaymentWithRelations> {
    // Retrieve the payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      throw new Error('Payment has not succeeded');
    }

    const orderId = paymentIntent.metadata.orderId;
    const paymentId = paymentIntent.metadata.paymentId;

    if (!orderId || !paymentId) {
      throw new Error('Missing order or payment information');
    }

    // Update the payment record
    const payment = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'SUCCEEDED',
        providerPaymentId: paymentIntentId,
        providerResponse: JSON.stringify(paymentIntent),
        paidAt: new Date()
      },
      include: {
        order: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      }
    }) as Promise<PaymentWithRelations>;

    // Complete the order
    await orderService.completeOrder(orderId, paymentId);

    return payment;
  }

  /**
   * Handle a failed payment
   */
  async handleFailedPayment(paymentIntentId: string, error?: string): Promise<PaymentWithRelations> {
    // Retrieve the payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    const paymentId = paymentIntent.metadata.paymentId;

    if (!paymentId) {
      throw new Error('Missing payment information');
    }

    // Update the payment record
    return prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'FAILED',
        providerPaymentId: paymentIntentId,
        providerResponse: JSON.stringify(paymentIntent),
        errorMessage: error || 'Payment failed'
      },
      include: {
        order: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      }
    }) as Promise<PaymentWithRelations>;
  }

  /**
   * Create a refund
   */
  async createRefund(paymentId: string, amount?: number, reason?: string): Promise<PaymentWithRelations> {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId }
    });

    if (!payment) {
      throw new Error('Payment not found');
    }

    if (payment.status !== 'SUCCEEDED') {
      throw new Error('Cannot refund a payment that has not succeeded');
    }

    if (!payment.providerPaymentId) {
      throw new Error('Missing provider payment ID');
    }

    // Create a refund with Stripe
    const refundAmount = amount || payment.amount;
    const refund = await stripe.refunds.create({
      payment_intent: payment.providerPaymentId,
      amount: Math.round(refundAmount * 100), // Stripe expects amount in cents
      reason: (reason as 'duplicate' | 'fraudulent' | 'requested_by_customer' | undefined) || 'requested_by_customer'
    });

    // Update the payment record
    return prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: refundAmount === payment.amount ? 'REFUNDED' : 'PARTIALLY_REFUNDED',
        refundedAmount: {
          increment: refundAmount
        },
        refundReason: reason,
        providerRefundId: refund.id,
        updatedAt: new Date()
      },
      include: {
        order: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      }
    }) as Promise<PaymentWithRelations>;
  }

  /**
   * Get payment statistics
   */
  async getPaymentStatistics(): Promise<PaymentStatistics> {
    const [
      totalPayments,
      successfulPayments,
      failedPayments,
      refundedPayments,
      payments
    ] = await Promise.all([
      prisma.payment.count(),
      prisma.payment.count({ where: { status: 'SUCCEEDED' } }),
      prisma.payment.count({ where: { status: 'FAILED' } }),
      prisma.payment.count({ 
        where: { 
          OR: [
            { status: 'REFUNDED' },
            { status: 'PARTIALLY_REFUNDED' }
          ]
        } 
      }),
      prisma.payment.findMany()
    ]);

    const totalRevenue = payments
      .filter(p => p.status === 'SUCCEEDED' || p.status === 'PARTIALLY_REFUNDED')
      .reduce((sum, payment) => sum + payment.amount, 0);

    const totalRefunded = payments
      .reduce((sum, payment) => sum + (payment.refundedAmount || 0), 0);

    return {
      totalPayments,
      successfulPayments,
      failedPayments,
      refundedPayments,
      totalRevenue,
      totalRefunded
    };
  }
}

const paymentService = new PaymentService();
export default paymentService;
