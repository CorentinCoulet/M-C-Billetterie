import { NextRequest } from 'next/server';
import { z } from 'zod';
import {
    createMethodHandler,
    NextApiResponse,
    validateBody,
    withAuth
} from '../../../src/lib/next-api-helpers';

const createOrderSchema = z.object({
  tickets: z.array(
    z.object({
      ticketId: z.string().min(1, 'ID du ticket requis'),
      quantity: z.number().positive('La quantité doit être positive'),
    })
  ).min(1, 'Au moins un ticket requis'),
  customerInfo: z.object({
    name: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
  }).optional(),
});

async function handleGetOrders(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    try {
      // Import order service
      const orderServiceModule = await import('../../../src/modules/order/order.service');

      // Get orders for user
      const orders = await orderServiceModule.getUserOrders(user.id);

      return NextApiResponse.success(orders, 'Commandes récupérées');
    } catch (error: any) {
      console.error('Get orders error:', error);
      return NextApiResponse.error('Erreur lors de la récupération des commandes', 500);
    }
  });
}

async function handleCreateOrder(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    const { data, error } = await validateBody(req, createOrderSchema);
    if (error) return error;

    try {
      // Import order service
      const orderServiceModule = await import('../../../src/modules/order/order.service');

      // Create order with user ID
      const orderData = {
        ...data,
        userId: user.id,
      };

      const order = await orderServiceModule.createOrder(orderData);

      return NextApiResponse.success(order, 'Commande créée avec succès', 201);
    } catch (error: any) {
      console.error('Create order error:', error);
      return NextApiResponse.error(
        error.message || 'Erreur lors de la création de la commande',
        500
      );
    }
  });
}

export default createMethodHandler({
  GET: handleGetOrders,
  POST: handleCreateOrder,
});
