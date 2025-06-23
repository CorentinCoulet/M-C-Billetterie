import type { AuthenticatedRequest } from '@/middlewares/auth';
import paymentService from '@/services/paymentService';
import type { NextApiResponse } from 'next';
import { z } from 'zod';

const createPaymentIntentSchema = z.object({
  orderId: z.string().min(1),
});

const processRefundSchema = z.object({
  paymentId: z.string().min(1),
  amount: z.number().positive().optional(),
  reason: z.string().optional(),
});

/**
 * Get all payments (admin only)
 */
export async function list(req: AuthenticatedRequest, res: NextApiResponse) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    // Only admins can see all payments
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const payments = await paymentService.getPayments({
      skip: req.query.skip ? parseInt(req.query.skip as string, 10) : undefined,
      take: req.query.take ? parseInt(req.query.take as string, 10) : undefined,
    });

    res.status(200).json(payments);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error fetching payments';
    res.status(500).json({ message });
  }
}

/**
 * Get a payment by ID
 */
export async function getPaymentById(req: AuthenticatedRequest, res: NextApiResponse) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const paymentId = req.query.id as string;
    const payment = await paymentService.getPaymentById(paymentId);

    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    // Only the user who made the payment or an admin can see it
    if (payment.order.userId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    res.status(200).json(payment);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error fetching payment';
    res.status(500).json({ message });
  }
}

/**
 * Get payments for the authenticated user
 */
export async function getUserPayments(req: AuthenticatedRequest, res: NextApiResponse) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const payments = await paymentService.getPayments({
      where: {
        order: {
          userId: req.user.id
        }
      }
    });

    res.status(200).json(payments);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error fetching user payments';
    res.status(500).json({ message });
  }
}

/**
 * Create a payment intent
 */
export async function createIntent(req: AuthenticatedRequest, res: NextApiResponse) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const parseResult = createPaymentIntentSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ message: 'Invalid input', errors: parseResult.error.flatten() });
    }

    const { orderId } = parseResult.data;
    const result = await paymentService.createPaymentIntent(orderId);

    res.status(200).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error creating payment intent';
    res.status(500).json({ message });
  }
}

/**
 * Process a payment
 */
export async function processPayment(req: AuthenticatedRequest, res: NextApiResponse) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const { paymentIntentId } = req.body;
    if (!paymentIntentId) {
      return res.status(400).json({ message: 'Payment intent ID is required' });
    }

    const payment = await paymentService.processSuccessfulPayment(paymentIntentId);
    res.status(200).json(payment);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error processing payment';
    res.status(500).json({ message });
  }
}

/**
 * Process a refund
 */
export async function processRefund(req: AuthenticatedRequest, res: NextApiResponse) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const parseResult = processRefundSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ message: 'Invalid input', errors: parseResult.error.flatten() });
    }

    const { paymentId, amount, reason } = parseResult.data;
    const payment = await paymentService.getPaymentById(paymentId);

    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    // Only the user who made the payment or an admin can refund it
    if (payment.order.userId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const refund = await paymentService.createRefund(paymentId, amount, reason);
    res.status(200).json(refund);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error processing refund';
    res.status(500).json({ message });
  }
}

/**
 * Handle webhook events from payment provider
 */
export async function webhook(req: AuthenticatedRequest, res: NextApiResponse) {
  try {
    const { type, data } = req.body;

    // Handle different webhook event types
    switch (type) {
      case 'payment_intent.succeeded':
        await paymentService.processSuccessfulPayment(data.id);
        break;
      case 'payment_intent.payment_failed':
        await paymentService.handleFailedPayment(data.id, data.last_payment_error?.message);
        break;
      // Add more event types as needed
    }

    res.status(200).json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error handling webhook';
    res.status(500).json({ message });
  }
}

/**
 * Get payment statistics (admin only)
 */
export async function getStatistics(req: AuthenticatedRequest, res: NextApiResponse) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    // Only admins can see payment statistics
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const statistics = await paymentService.getPaymentStatistics();
    res.status(200).json(statistics);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error fetching payment statistics';
    res.status(500).json({ message });
  }
}