import prisma from '@/lib/prisma';
import Stripe from 'stripe';
import { Prisma } from '../generated/prisma';
import { PaymentStatus } from '../types/prisma-fixes';

type PaymentWithRelations = Prisma.PaymentGetPayload<{
  include: {
    order: {
      include: {
        user: {
          select: {
            id: true;
            name: true;
            email: true;
          }
        }
      }
    }
  }
}>

type PaymentIntentResult = {
  clientSecret: string;
  paymentId: string;
}

type PaymentStatistics = {
  totalPayments: number;
  successfulPayments: number;
  failedPayments: number;
  totalRevenue: number;
}

// Lazy initialization of Stripe to avoid build-time errors
let stripeInstance: Stripe | null = null;
const getStripe = () => {
  if (!stripeInstance) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }
    stripeInstance = new Stripe(secretKey, {
      apiVersion: '2025-08-27.basil', // Use supported API version
    });
  }
  return stripeInstance;
};

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
   * Utilise les types Prisma officiels pour where et orderBy
   */
  async getPayments(params: {
    skip?: number;
    take?: number;
    where?: Prisma.PaymentWhereInput;
    orderBy?: Prisma.PaymentOrderByWithRelationInput;
  }): Promise<PaymentWithRelations[]> {
    const { skip, take, where, orderBy } = params;
    return prisma.payment.findMany({
      skip,
      take,
      where,
      orderBy: orderBy || { paymentDate: 'desc' },
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
            event: true
          }
        }
      }
    });

    if (!order) {
      throw new Error('Order not found');
    }

    if (order.status === 'paid') {
      throw new Error('Order is already paid');
    }

    if (order.status === 'cancelled') {
      throw new Error('Cannot pay for a cancelled order');
    }

    // Create a payment record in the database with a placeholder transaction ID
    const tempTransactionId = `temp_${orderId}_${Date.now()}`;
    const payment = await prisma.payment.create({
      data: {
        orderId,
        paymentMethod: 'STRIPE',
        paymentStatus: PaymentStatus.PENDING,
        paymentDate: new Date(),
        transactionId: tempTransactionId,
        currency: 'EUR'
      } satisfies Prisma.PaymentUncheckedCreateInput
    });

    // Create a payment intent with Stripe
    const paymentIntent = await getStripe().paymentIntents.create({
      amount: Math.round(order.totalPrice * 100), // Stripe expects amount in cents
      currency: 'eur',
      metadata: {
        orderId: order.id,
        paymentId: payment.id,
        userId: order.userId
      },
      receipt_email: order.user?.email,
      description: `Payment for order #${order.id}`,
    });

    // Update the payment record with the actual Stripe payment intent ID
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        transactionId: paymentIntent.id
      } satisfies Prisma.PaymentUpdateInput
    });

    return {
      clientSecret: paymentIntent.client_secret!,
      paymentId: payment.id
    };
  }

  async processSuccessfulPayment(paymentIntentId: string): Promise<PaymentWithRelations> {
    // Retrieve the payment intent from Stripe first
    const paymentIntent = await getStripe().paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      throw new Error('Payment has not succeeded');
    }

    const orderId = paymentIntent.metadata.orderId;
    const paymentId = paymentIntent.metadata.paymentId;

    if (!orderId || !paymentId) {
      throw new Error('Missing order or payment information');
    }

    return await prisma.$transaction(async (tx) => {
      try {
        // 1. Vérifier l'état actuel
        const [payment, order] = await Promise.all([
          tx.payment.findUnique({
            where: { id: paymentId },
            include: { order: true }
          }),
          tx.order.findUnique({
            where: { id: orderId },
            include: { tickets: true }
          })
        ]);

        if (!payment) {
          throw new Error('Payment not found');
        }

        if (!order) {
          throw new Error('Order not found');
        }

        if (payment.paymentStatus === PaymentStatus.COMPLETED) {
          throw new Error('Payment already processed');
        }

        if (order.status === 'paid') {
          throw new Error('Order already completed');
        }

        // 2. Mettre à jour le paiement
        const updatedPayment = await tx.payment.update({
          where: { id: paymentId },
          data: {
            paymentStatus: PaymentStatus.COMPLETED,
            transactionId: paymentIntentId,
            paymentDate: new Date()
          } satisfies Prisma.PaymentUpdateInput
        });

        // 3. Mettre à jour la commande
        await tx.order.update({
          where: { id: orderId },
          data: {
            status: 'paid',
            metadata: {
              ...((order.metadata as any) || {}),
              stripePaymentIntentId: paymentIntentId,
              paymentProcessedAt: new Date().toISOString()
            }
          }
        });

        // 4. Mettre à jour les tickets
        if (order.tickets.length > 0) {
          await tx.ticket.updateMany({
            where: { orderId },
            data: {
              status: 'paid',
              purchasedAt: new Date()
            }
          });
        }

        // 5. Retourner le paiement avec les relations
        const finalPayment = await tx.payment.findUnique({
          where: { id: paymentId },
          include: {
            order: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true
                  }
                },
                tickets: {
                  include: {
                    event: true
                  }
                }
              }
            }
          }
        }) as PaymentWithRelations;

        return finalPayment;

      } catch (error) {
        throw new Error(`Payment processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });
  }

  /**
   * Handle a failed payment with transaction (P1 FIX)
   * 🔒 CRITIQUE: Transaction pour libérer les ressources en cas d'échec
   */
  async handleFailedPayment(paymentIntentId: string, error?: string): Promise<PaymentWithRelations> {
    // Retrieve the payment intent from Stripe
    const paymentIntent = await getStripe().paymentIntents.retrieve(paymentIntentId);

    const paymentId = paymentIntent.metadata.paymentId;
    const orderId = paymentIntent.metadata.orderId;

    if (!paymentId) {
      throw new Error('Missing payment information');
    }

    // 🚀 P1 FIX: Transaction pour libérer les tickets en cas d'échec de paiement
    return await prisma.$transaction(async (tx) => {
      try {
        // 1. Mettre à jour le paiement comme échoué
        const failedPayment = await tx.payment.update({
          where: { id: paymentId },
          data: {
            paymentStatus: PaymentStatus.FAILED,
            transactionId: paymentIntentId
          } satisfies Prisma.PaymentUpdateInput
        });

        // 2. Si on a un orderId, libérer les tickets réservés
        if (orderId) {
          const order = await tx.order.findUnique({
            where: { id: orderId },
            include: { tickets: true }
          });

          if (order) {
            // Libérer les tickets pour qu'ils redeviennent disponibles
            if (order.tickets.length > 0) {
              await tx.ticket.updateMany({
                where: { orderId },
                data: {
                  orderId: null,
                  status: 'pending' // Remettre disponible
                }
              });
            }

            // Marquer la commande comme échouée
            await tx.order.update({
              where: { id: orderId },
              data: {
                status: 'cancelled',
                metadata: {
                  ...((order.metadata as any) || {}),
                  failedAt: new Date().toISOString(),
                  failureReason: error || 'Payment failed'
                }
              }
            });
          }
        }

        // 3. Retourner le paiement avec les relations
        return await tx.payment.findUnique({
          where: { id: paymentId },
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
        }) as PaymentWithRelations;

      } catch (txError) {
        throw new Error(`Failed payment handling failed: ${txError instanceof Error ? txError.message : 'Unknown error'}`);
      }
    });
  }

  /**
   * Get payment statistics
   */
  async getPaymentStatistics(): Promise<PaymentStatistics> {
    const [
      totalPayments,
      successfulPayments,
      failedPayments,
      payments
    ] = await Promise.all([
      prisma.payment.count(),
      prisma.payment.count({ where: { paymentStatus: PaymentStatus.COMPLETED } }),
      prisma.payment.count({ where: { paymentStatus: PaymentStatus.FAILED } }),
      prisma.payment.findMany({
        include: {
          order: true
        }
      })
    ]);

    // Calculate total revenue from successful payments
    // Since we don't have an amount field in Payment, we get it from the related order
    const totalRevenue = payments
      .filter(p => p.paymentStatus === PaymentStatus.COMPLETED)
      .reduce((sum, payment) => sum + (payment.order?.totalPrice || 0), 0);

    return {
      totalPayments,
      successfulPayments,
      failedPayments,
      totalRevenue
    };
  }
}

const paymentService = new PaymentService();
export default paymentService;
