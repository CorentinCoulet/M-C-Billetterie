import emailService from '../services/emailService';
import orderService from '../services/orderService';
import paymentService from '../services/paymentService';
import { generateOrderTickets } from './qrcode';

/**
 * Orchestration service to coordinate different services
 * during complex operations like ticket purchases
 */
export class OrchestrationService {
  /**
   * Complete ticket purchase process
   * 1. Create the order
   * 2. Create payment intent
   * 3. Generate tickets (after successful payment)
   * 4. Send confirmation email
   */
  async processPurchase(params: {
    userId: string;
    eventId: string;
    quantity: number;
    customerEmail?: string;
  }) {
    const { userId, eventId, quantity, customerEmail } = params;

    try {
      // 1. Create the order
      const order = await orderService.createOrder({
        userId,
        tickets: [
          {
            ticketId: eventId, // To be adapted according to your logic
            quantity,
          }
        ],
        customerInfo: customerEmail ? { email: customerEmail } : undefined,
      });

      // 2. Create Stripe payment intent
      const paymentIntent = await paymentService.createPaymentIntent(order.id);

      return {
        orderId: order.id,
        clientSecret: paymentIntent.clientSecret,
        paymentId: paymentIntent.paymentId,
      };
    } catch (error) {
      console.error('Error in processPurchase:', error);
      throw error;
    }
  }

  /**
   * Finalize purchase after successful payment
   */
  async completePurchase(params: {
    orderId: string;
    paymentIntentId: string;
  }) {
    const { orderId, paymentIntentId } = params;

    try {
      // 1. Update payment
      const payment = await paymentService.processSuccessfulPayment(paymentIntentId);
      
      // 2. Get order details
      const order = await orderService.getOrderById(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      // 3. Generate tickets with QR codes
      const tickets = await generateOrderTickets({
        orderId: order.id,
        eventId: order.tickets[0]?.eventId || '',
        userId: order.userId,
        eventTitle: order.tickets[0]?.event.title || 'Unknown Event',
        eventDate: order.tickets[0]?.event.date.toISOString() || new Date().toISOString(),
        venue: order.tickets[0]?.event.location || 'Unknown Venue',
        quantity: order.tickets.length,
        validUntil: order.tickets[0]?.event.date.toISOString() || new Date().toISOString(),
      });

      // 4. Send confirmation email
      if (order.user) {
        await emailService.sendOrderConfirmationEmail(
          order.user.email,
          order.user.name,
          order.id,
          {
            totalAmount: order.totalPrice,
            orderDate: order.createdAt || new Date(),
            tickets: order.tickets.map(t => ({
              name: t.code || 'Ticket',
              quantity: 1,
              price: order.totalPrice / order.tickets.length,
              eventName: t.event.title,
              eventDate: t.event.date,
              eventLocation: t.event.location || 'Unknown Location',
            }))
          }
        );
      }

      // 5. Mark order as completed
      await orderService.updateOrderStatus(orderId, 'paid');

      return {
        order,
        payment,
        tickets,
      };
    } catch (error) {
      console.error('Error in completePurchase:', error);
      throw error;
    }
  }

  /**
   * Cancel an order and refund if necessary
   */
  async cancelOrder(params: {
    orderId: string;
    reason?: string;
  }) {
    const { orderId, reason } = params;

    try {
      // 1. Get the order
      const order = await orderService.getOrderById(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      // 2. If a payment exists, handle refund if necessary
      if (order.payment && order.payment.paymentStatus === 'SUCCEEDED') {
        // TODO: Implement refund logic if necessary
        // Currently, the schema does not support refunds
        console.log(`Refund needed for payment ${order.payment.id} but not implemented`);
      }

      // 3. Cancel the order
      await orderService.updateOrderStatus(orderId, 'cancelled');

      // 4. Send cancellation confirmation email
      if (order.user) {
        // For now, log the cancellation (cancellation email to be implemented)
        console.log(`Order ${orderId} cancelled for user ${order.user.email}. Reason: ${reason}`);
        // TODO: Implement sendOrderCancellationEmail in emailService
      }

      return order;
    } catch (error) {
      console.error('Error in cancelOrder:', error);
      throw error;
    }
  }

  /**
   * Handle Stripe webhook events
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async handleStripeWebhook(event: { type: string; data: { object: Record<string, any> } }) {
    try {
      switch (event.type) {
        case 'payment_intent.succeeded':
          const paymentIntent = event.data.object;
          const orderId = paymentIntent.metadata?.orderId as string;
          
          if (orderId) {
            await this.completePurchase({
              orderId,
              paymentIntentId: paymentIntent.id as string,
            });
          }
          break;

        case 'payment_intent.payment_failed':
          const failedPayment = event.data.object;
          const failedOrderId = failedPayment.metadata?.orderId as string;
          
          if (failedOrderId) {
            await paymentService.handleFailedPayment(
              failedPayment.id as string,
              failedPayment.last_payment_error?.message as string
            );
          }
          break;

        case 'checkout.session.completed':
          const session = event.data.object;
          const sessionOrderId = session.metadata?.orderId as string;
          
          if (sessionOrderId && session.payment_intent) {
            await this.completePurchase({
              orderId: sessionOrderId,
              paymentIntentId: session.payment_intent as string,
            });
          }
          break;

        default:
          console.log(`Unhandled webhook event type: ${event.type}`);
      }
    } catch (error) {
      console.error('Error handling Stripe webhook:', error);
      throw error;
    }
  }
}

const orchestrationService = new OrchestrationService();
export default orchestrationService;
