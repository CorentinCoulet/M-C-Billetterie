import prisma from '@/lib/prisma';
import { OrderStatus } from '@prisma/client';
import ticketService from './ticketService';

// Types spécifiques pour les relations
type UserBasic = {
  id: string;
  name: string | null;
  email: string;
}

type EventBasic = {
  id: string;
  title: string;
  date: Date;
  location: string;
}

type TicketBasic = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  quantity: number;
  type: string | null;
  eventId: string;
  reserved: number;
  createdAt: Date;
  updatedAt: Date;
  event: EventBasic;
}

type OrderTicketBasic = {
  id: string;
  orderId: string;
  ticketId: string;
  quantity: number;
  unitPrice: number;
  ticket: TicketBasic;
}

type PaymentBasic = {
  id: string;
  orderId: string;
  amount: number;
  status: string;
  provider: string;
  paymentIntentId: string | null;
  createdAt: Date;
}

type OrderWithRelations = {
  id: string;
  userId: string;
  status: OrderStatus;
  totalAmount: number;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  createdAt: Date;
  updatedAt: Date;
  user: UserBasic | null;
  tickets: OrderTicketBasic[];
  payment: PaymentBasic | null;
}

// Types d'entrée pour les opérations
type OrderCreateInput = {
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
}

type OrderWhereInput = {
  id?: string;
  userId?: string;
  status?: OrderStatus;
  createdAt?: {
    gte?: Date;
    lte?: Date;
  };
  AND?: OrderWhereInput[];
  OR?: OrderWhereInput[];
}

type OrderOrderByInput = {
  id?: 'asc' | 'desc';
  createdAt?: 'asc' | 'desc';
  updatedAt?: 'asc' | 'desc';
  status?: 'asc' | 'desc';
  totalAmount?: 'asc' | 'desc';
}

type OrderStatistics = {
  totalOrders: number;
  completedOrders: number;
  pendingOrders: number;
  cancelledOrders: number;
  totalRevenue: number;
}

/**
 * Service for order management operations
 */
export class OrderService {
  /**
   * Get an order by ID
   */
  async getOrderById(id: string): Promise<OrderWithRelations | null> {
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
    }) as Promise<OrderWithRelations | null>;
  }

  /**
   * Get all orders with pagination and filtering
   */
  async getOrders(params: {
    skip?: number;
    take?: number;
    where?: OrderWhereInput;
    orderBy?: OrderOrderByInput;
  }): Promise<OrderWithRelations[]> {
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
            ticket: {
              include: {
                event: true
              }
            }
          }
        },
        payment: true
      }
    }) as Promise<OrderWithRelations[]>;
  }

  /**
   * Create a new order
   */
  async createOrder(data: OrderCreateInput): Promise<OrderWithRelations> {
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

        return order as OrderWithRelations;
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
  async updateOrderStatus(id: string, status: OrderStatus): Promise<OrderWithRelations> {
    return prisma.order.update({
      where: { id },
      data: { status },
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
    }) as Promise<OrderWithRelations>;
  }

  /**
   * Cancel an order
   */
  async cancelOrder(id: string): Promise<OrderWithRelations> {
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
    }) as Promise<OrderWithRelations>;
  }

  /**
   * Complete an order after payment
   */
  async completeOrder(id: string, paymentId: string): Promise<OrderWithRelations> {
    return prisma.order.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        payment: {
          connect: { id: paymentId }
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
        },
        payment: true
      }
    }) as Promise<OrderWithRelations>;
  }

  /**
   * Get orders by user
   */
  async getUserOrders(userId: string): Promise<OrderWithRelations[]> {
    return prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
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
    }) as Promise<OrderWithRelations[]>;
  }

  /**
   * Get order statistics
   */
  async getOrderStatistics(): Promise<OrderStatistics> {
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
