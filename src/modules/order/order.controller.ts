// Order controller - wrapper pour le service order
import orderService from '../../services/orderService';

// Types de contrôleur
export interface OrderRequest {
  userId: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface CreateOrderRequest {
  tickets: Array<{
    ticketId: string;
    quantity: number;
  }>;
  userId: string;
  customerInfo?: {
    name?: string;
    email?: string;
    phone?: string;
  };
}

/**
 * Get orders for a user
 */
export const getOrders = async (params: OrderRequest) => {
  return await orderService.getUserOrders(params.userId);
};

/**
 * Create a new order
 */
export const createOrder = async (data: CreateOrderRequest) => {
  const { tickets, customerInfo, userId } = data;
  
  // Calculer le montant total
  let totalAmount = 0;
  for (const item of tickets) {
    // Dans un vrai scénario, récupérer le prix du ticket
    const ticket = await orderService.getOrderById(item.ticketId);
    if (ticket) {
      totalAmount += item.quantity * 100; // Prix temporaire
    }
  }

  const orderData = {
    userId,
    totalAmount,
    status: 'PENDING' as any,
    tickets: tickets.map(t => ({
      ticketId: t.ticketId,
      quantity: t.quantity,
      unitPrice: 100, // Prix temporaire
    }))
  };

  return await orderService.createOrder(orderData);
};

/**
 * Get order by ID
 */
export const getById = async (id: string) => {
  return await orderService.getOrderById(id);
};

export default {
  getOrders,
  createOrder,
  getById,
};
