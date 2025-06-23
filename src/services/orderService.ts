import prisma from '@/lib/prisma';
import { Order, Prisma, OrderStatus } from '@prisma/client';
import ticketService from './ticketService';

/**
 * Service for order management operations
 */
export class OrderService {
  /**
   * Get an order by ID
   */
  async getOrderById(id: string): Promise<Order | null> {
    return prisma.order.findUnique({
      where: { id },
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
            ticket: {
              include: {
                event: true
              }
            }
          }
        },
        payment: true
      }
    });
  }

  /**
   * Get all orders with pagination and filtering
   */
  async getOrders(params: {
    skip?: number;
    take?: number;
    where?: Prisma.OrderWhereInput;
    orderBy?: Prisma.OrderOrderByWithRelationInput;
  }): Promise<Order[]> {
    const { skip, take, where, orderBy } = params;
    return prisma.order.findMany({
      skip,
      take,
      where,
      orderBy: orderBy || { createdAt: 'desc' },
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
            ticket: true
          }
        },
        payment: true
      }
    });
  }

  /**
   * Create a new order
   */
  async createOrder(data: {
    userId: string;
    tickets: Array<{
      ticketId: string;
      quantity: number;
    }>;
    customerInfo?: {
      name?: string;
      email?: string;
      phone?: string;
    };
  }): Promise<Order> {
    const { userId, tickets, customerInfo } = data;

    // Calculate total amount and validate ticket availability
    let totalAmount = 0;
    const ticketItems = [];

    for (const item of tickets) {
      const ticket = await prisma.ticket.findUnique({
        where: { id: item.ticketId }
      });

      if (!ticket) {
        throw new Error(`Ticket with ID ${item.ticketId} not found`);
      }

      // Check availability
      const availability = await ticketService.checkAvailability(item.ticketId);
      if (!availability.available || availability.remaining < item.quantity) {
        throw new Error(`Not enough tickets available for ${ticket.name}`);
      }

      totalAmount += ticket.price * item.quantity;
      ticketItems.push({
        ticketId: item.ticketId,
        quantity: item.quantity,
        unitPrice: ticket.price
      });

      // Reserve the tickets
      await ticketService.reserveTickets(item.ticketId, item.quantity);
    }

    // Create the order with a transaction to ensure all operations succeed or fail together
    try {
      return await prisma.$transaction(async (tx) => {
        // Create the order
        const order = await tx.order.create({
          data: {
            userId,
            status: 'PENDING',
            totalAmount,
            customerName: customerInfo?.name,
            customerEmail: customerInfo?.email,
            customerPhone: customerInfo?.phone,
            tickets: {
              create: ticketItems.map(item => ({
                ticket: { connect: { id: item.ticketId } },
                quantity: item.quantity,
                unitPrice: item.unitPrice
              }))
            }
          },
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
                ticket: {
                  include: {
                    event: true
                  }
                }
              }
            }
          }
        });

        return order;
      });
    } catch (error) {
      // If anything fails, release the reserved tickets
      for (const item of tickets) {
        await ticketService.releaseReservedTickets(item.ticketId, item.quantity);
      }
      throw error;
    }
  }

  /**
   * Update order status
   */
  async updateOrderStatus(id: string, status: OrderStatus): Promise<Order> {
    return prisma.order.update({
      where: { id },
      data: { status },
      include: {
        tickets: {
          include: {
            ticket: true
          }
        }
      }
    });
  }

  /**
   * Cancel an order
   */
  async cancelOrder(id: string): Promise<Order> {
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        tickets: true
      }
    });

    if (!order) {
      throw new Error('Order not found');
    }

    if (order.status === 'COMPLETED') {
      throw new Error('Cannot cancel a completed order');
    }

    // Release reserved tickets
    for (const orderTicket of order.tickets) {
      await ticketService.releaseReservedTickets(
        orderTicket.ticketId,
        orderTicket.quantity
      );
    }

    return prisma.order.update({
      where: { id },
      data: {
        status: 'CANCELLED'
      },
      include: {
        tickets: {
          include: {
            ticket: true
          }
        }
      }
    });
  }

  /**
   * Complete an order after payment
   */
  async completeOrder(id: string, paymentId: string): Promise<Order> {
    return prisma.order.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        payment: {
          connect: { id: paymentId }
        }
      },
      include: {
        tickets: {
          include: {
            ticket: true
          }
        },
        payment: true
      }
    });
  }

  /**
   * Get orders by user
   */
  async getUserOrders(userId: string): Promise<Order[]> {
    return prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        tickets: {
          include: {
            ticket: {
              include: {
                event: true
              }
            }
          }
        },
        payment: true
      }
    });
  }

  /**
   * Get order statistics
   */
  async getOrderStatistics(): Promise<{
    totalOrders: number;
    completedOrders: number;
    pendingOrders: number;
    cancelledOrders: number;
    totalRevenue: number;
  }> {
    const [
      totalOrders,
      completedOrders,
      pendingOrders,
      cancelledOrders,
      payments
    ] = await Promise.all([
      prisma.order.count(),
      prisma.order.count({ where: { status: 'COMPLETED' } }),
      prisma.order.count({ where: { status: 'PENDING' } }),
      prisma.order.count({ where: { status: 'CANCELLED' } }),
      prisma.payment.findMany({
        where: {
          status: 'SUCCEEDED'
        }
      })
    ]);

    const totalRevenue = payments.reduce((sum, payment) => sum + payment.amount, 0);

    return {
      totalOrders,
      completedOrders,
      pendingOrders,
      cancelledOrders,
      totalRevenue
    };
  }
}

const orderService = new OrderService();
export default orderService;