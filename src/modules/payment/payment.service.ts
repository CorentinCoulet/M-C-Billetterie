import Stripe from 'stripe';
import { PrismaClient } from '../../generated/prisma';
import { logger } from '../../lib/logger';
import { PaymentStatus, PaymentStatusType, StripeApiVersion } from '../../types/prisma-fixes';

const prisma = new PrismaClient();

// Lazy initialization to avoid build-time errors
let stripe: Stripe | null = null;
const getStripe = (): Stripe => {
  if (!stripe) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }
    stripe = new Stripe(secretKey, {
      apiVersion: StripeApiVersion
    });
  }
  return stripe;
};

export interface PaymentCreateData {
  orderId: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  stripePaymentIntentId?: string;
}

export interface PaymentUpdateData {
  paymentStatus?: string;
  transactionId?: string;
  paymentDate?: Date;
}

export class PaymentService {
  static async create(data: PaymentCreateData) {
    try {
      const payment = await prisma.payment.create({
        data: {
          orderId: data.orderId,
          paymentMethod: data.paymentMethod,
          paymentStatus: 'PENDING',
          currency: data.currency,
          paymentDate: new Date(),
          transactionId: data.stripePaymentIntentId || `tx_${Date.now()}`
        }
      });

      return payment;
    } catch (error) {
      logger.error({ error }, 'Erreur lors de la création du paiement');
      throw error;
    }
  }

  static async findById(id: string) {
    try {
      return await prisma.payment.findUnique({
        where: { id },
        include: {
          order: {
            include: {
              user: true,
              tickets: {
                include: {
                  event: true
                }
              }
            }
          }
        }
      });
    } catch (error) {
      logger.error({ error }, 'Erreur lors de la récupération du paiement');
      throw error;
    }
  }

  static async update(id: string, data: PaymentUpdateData) {
    try {
      return await prisma.payment.update({
        where: { id },
        data: {
          ...data,
          ...(data.paymentStatus && { paymentStatus: data.paymentStatus }),
          ...(data.transactionId && { transactionId: data.transactionId }),
          ...(data.paymentDate && { paymentDate: data.paymentDate })
        }
      });
    } catch (error) {
      logger.error({ error }, 'Erreur lors de la mise à jour du paiement');
      throw error;
    }
  }

  static async processStripePayment(paymentIntentId: string) {
    try {
      if (!stripe) {
        throw new Error('Stripe is not configured');
      }

      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      
      const payment = await prisma.payment.findFirst({
        where: { transactionId: paymentIntentId }
      });

      if (!payment) {
        throw new Error('Paiement non trouvé');
      }

      let paymentStatus: PaymentStatusType = PaymentStatus.PENDING;
      
      switch (paymentIntent.status as string) {
        case 'succeeded':
          paymentStatus = PaymentStatus.COMPLETED;
          break;
        case 'canceled':
          paymentStatus = PaymentStatus.CANCELLED;
          break;
        case 'payment_failed':
          paymentStatus = PaymentStatus.FAILED;
          break;
      }

      return await this.update(payment.id, {
        paymentStatus,
        paymentDate: new Date()
      });
    } catch (error) {
      logger.error({ error }, 'Erreur lors du traitement du paiement Stripe');
      throw error;
    }
  }

  static async createStripePaymentIntent(amount: number, currency = 'eur') {
    try {
      if (!stripe) {
        throw new Error('Stripe is not configured');
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Stripe utilise les centimes
        currency,
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: {
          source: 'billetterie_app'
        }
      });

      return paymentIntent;
    } catch (error) {
      logger.error({ error }, 'Erreur lors de la création de PaymentIntent Stripe');
      throw error;
    }
  }

  static async refund(paymentId: string, amount?: number) {
    try {
      const payment = await this.findById(paymentId);
      if (!payment) {
        throw new Error('Paiement non trouvé');
      }

      if (payment.transactionId) {
        if (!stripe) {
          throw new Error('Stripe is not configured');
        }

        // Remboursement via Stripe
        const refund = await stripe.refunds.create({
          payment_intent: payment.transactionId,
          amount: amount ? Math.round(amount * 100) : undefined
        });

        // Mettre à jour le paiement
        await this.update(paymentId, {
          paymentStatus: 'REFUNDED'
        });

        return { success: true, refundId: refund.id };
      }

      throw new Error('Impossible de rembourser ce paiement');
    } catch (error) {
      logger.error({ error }, 'Erreur lors du remboursement');
      throw error;
    }
  }

  static async getPaymentsByOrder(orderId: string) {
    try {
      return await prisma.payment.findMany({
        where: { orderId },
        orderBy: { paymentDate: 'desc' }
      });
    } catch (error) {
      logger.error({ error }, 'Erreur lors de la récupération des paiements');
      throw error;
    }
  }
}

// Export des méthodes individuelles pour les routes API
export const create = (data: PaymentCreateData) => PaymentService.create(data);
export const findById = (id: string) => PaymentService.findById(id);
export const update = (id: string, data: PaymentUpdateData) => PaymentService.update(id, data);
export const processStripePayment = (paymentIntentId: string) => PaymentService.processStripePayment(paymentIntentId);
export const createStripePaymentIntent = (amount: number, currency?: string) => PaymentService.createStripePaymentIntent(amount, currency);
export const refund = (paymentId: string, amount?: number) => PaymentService.refund(paymentId, amount);
export const getPaymentsByOrder = (orderId: string) => PaymentService.getPaymentsByOrder(orderId);

// Export pour compatibilité avec les routes existantes
export const PaymentModuleService = {
  create,
  findById,
  update,
  processStripePayment,
  createStripePaymentIntent,
  refund,
  getPaymentsByOrder
};

export default PaymentService;
