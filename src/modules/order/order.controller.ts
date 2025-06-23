import { AuthenticatedRequest } from '@/middlewares/auth';
import { NextApiResponse } from 'next';
import { z } from 'zod';
import orderService from '@/services/orderService';

const createOrderSchema = z.object({
  userId: z.string().min(1),
  tickets: z.array(
    z.object({
      ticketId: z.string().min(1),
      quantity: z.number().positive(),
    })
  ),
  customerInfo: z
    .object({
      name: z.string().optional(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
    })
    .optional(),
});

const updateOrderStatusSchema = z.object({
  status: z.enum(['PENDING', 'COMPLETED', 'CANCELLED']),
});

export async function list(req: AuthenticatedRequest, res: NextApiResponse) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const orders = await orderService.getOrders({
      where: {
        userId: req.user.id,
      },
    });

    return res.status(200).json(orders);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An error occurred';
    return res.status(500).json({ message });
  }
}

export async function create(req: AuthenticatedRequest, res: NextApiResponse) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const parseResult = createOrderSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ message: 'Invalid input', errors: parseResult.error.flatten() });
    }

    const order = await orderService.createOrder(parseResult.data);
    return res.status(201).json(order);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An error occurred';
    return res.status(500).json({ message });
  }
}

export async function getById(req: AuthenticatedRequest, res: NextApiResponse) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const orderId = req.query.id as string;
    if (!orderId) {
      return res.status(400).json({ message: 'Order ID is required' });
    }

    const order = await orderService.getOrderById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Only the order owner or admin can view the order
    if (order.userId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    return res.status(200).json(order);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An error occurred';
    return res.status(500).json({ message });
  }
}

export async function updateStatus(req: AuthenticatedRequest, res: NextApiResponse) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const orderId = req.query.id as string;
    if (!orderId) {
      return res.status(400).json({ message: 'Order ID is required' });
    }

    const parseResult = updateOrderStatusSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ message: 'Invalid input', errors: parseResult.error.flatten() });
    }

    const order = await orderService.getOrderById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Only the order owner or admin can update the order
    if (order.userId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const updatedOrder = await orderService.updateOrderStatus(orderId, parseResult.data.status);
    return res.status(200).json(updatedOrder);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An error occurred';
    return res.status(500).json({ message });
  }
}

export async function cancel(req: AuthenticatedRequest, res: NextApiResponse) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const orderId = req.query.id as string;
    if (!orderId) {
      return res.status(400).json({ message: 'Order ID is required' });
    }

    const order = await orderService.getOrderById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Only the order owner or admin can cancel the order
    if (order.userId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const cancelledOrder = await orderService.cancelOrder(orderId);
    return res.status(200).json(cancelledOrder);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An error occurred';
    return res.status(500).json({ message });
  }
}

export async function getOrderStatistics(req: AuthenticatedRequest, res: NextApiResponse) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    // Only admins can view order statistics
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const statistics = await orderService.getOrderStatistics();
    return res.status(200).json(statistics);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An error occurred';
    return res.status(500).json({ message });
  }
}