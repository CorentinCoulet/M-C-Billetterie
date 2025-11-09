import { NextRequest } from 'next/server';
import { z } from 'zod';
import {
  getQueryParam,
  NextApiResponse,
  validateBody,
  withAuth
} from '../../../src/lib/next-api-helpers';

const createPaymentIntentSchema = z.object({
  orderId: z.string().min(1, 'ID de la commande requis'),
  paymentMethodId: z.string().optional(),
});

const processRefundSchema = z.object({
  paymentId: z.string().min(1, 'ID du paiement requis'),
  amount: z.number().positive().optional(),
  reason: z.string().optional(),
});

async function handleGetPayments(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    try {
      // Extract query parameters
      const page = parseInt(getQueryParam(req, 'page', '1') || '1');
      const limit = parseInt(getQueryParam(req, 'limit', '10') || '10');
      const status = getQueryParam(req, 'status');

      // Import payment service
      const paymentServiceModule = await import('../../../src/modules/payment/payment.service');
      
      // Get user's payments - for now, return empty array since we need orderId
      const payments: any[] = [];

      return NextApiResponse.success(payments, 'Paiements récupérés');
    } catch (error: any) {
      return NextApiResponse.error('Erreur lors de la récupération des paiements', 500);
    }
  });
}

async function handleCreatePaymentIntent(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    const { data, error } = await validateBody(req, createPaymentIntentSchema);
    if (error) return error;

    try {
      // Import payment service
      const paymentServiceModule = await import('../../../src/modules/payment/payment.service');
      
      // Create payment intent - need to calculate amount first
      const amount = 1000; // Placeholder - should get from order
      const paymentIntent = await paymentServiceModule.createStripePaymentIntent(amount);

      return NextApiResponse.success(paymentIntent, 'Intention de paiement créée', 201);
    } catch (error: any) {
      return NextApiResponse.error(
        error.message || 'Erreur lors de la création de l\'intention de paiement',
        500
      );
    }
  });
}

export async function GET(request: NextRequest) {
  return handleGetPayments(request);
}

export async function POST(request: NextRequest) {
  return handleCreatePaymentIntent(request);
}
