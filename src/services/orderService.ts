import prisma from '@/lib/prisma';
import { OrderStatus, Prisma } from '../generated/prisma';
import { PaymentStatus } from '../types/prisma-fixes';

// Use Prisma generated types for better type safety
type OrderWithRelations = Prisma.OrderGetPayload<{
  include: {
    user: {
      select: {
        id: true;
        name: true;
        email: true;
      }
    };
    tickets: {
      include: {
        event: true;
      }
    };
    payment: true;
  }
}>;

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
  eventId: string;
  userId: string | null;
  orderId: string | null;
  code: string;
  status: string;
  seatNumber: string | null;
  purchasedAt: Date;
  event: EventBasic;
}

type PaymentBasic = {
  id: string;
  orderId: string;
  paymentMethod: string;
  paymentStatus: string;
  paymentDate: Date;
  transactionId: string;
  currency: string;
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

type OrderWhereInput = Prisma.OrderWhereInput;
type OrderOrderByInput = Prisma.OrderOrderByWithRelationInput;

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
            event: true
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
            event: true
          }
        },
        payment: true
      }
    });
  }

  /**
   * Create a new order with transaction (P1 FIX)
   * 🔒 CRITIQUE: Transaction pour éviter corruption de données
   */
  async createOrder(data: OrderCreateInput): Promise<OrderWithRelations> {
    const { userId, tickets, customerInfo } = data;

    // 🚀 P1 FIX: Utilisation d'une transaction pour atomicité
    return await prisma.$transaction(async (tx) => {
      // Vérifier et réserver les tickets de manière atomique
      let totalAmount = 0;
      const ticketItems: Array<{
        ticketId: string;
        quantity: number;
        unitPrice: number;
      }> = [];
      const reservedTickets: string[] = [];

      try {
        // 1. Vérifier la disponibilité des tickets et calculer le prix total
        for (const item of tickets) {
          const ticket = await tx.ticket.findUnique({
            where: { id: item.ticketId },
            include: { 
              event: true,
              order: true // Vérifier si déjà réservé
            }
          });

          if (!ticket) {
            throw new Error(`Ticket with ID ${item.ticketId} not found`);
          }

          // Vérifier si le ticket est disponible
          if (ticket.orderId) {
            throw new Error(`Ticket ${item.ticketId} is already reserved`);
          }

          // Vérifier la disponibilité de l'événement
          if (ticket.event && new Date(ticket.event.date) < new Date()) {
            throw new Error(`Event ${ticket.event.title} has already passed`);
          }

          // Calcul du prix (implémentation simplifiée)
          const unitPrice = 50; // À remplacer par la vraie logique de prix
          
          totalAmount += unitPrice * item.quantity;
          ticketItems.push({
            ticketId: item.ticketId,
            quantity: item.quantity,
            unitPrice
          });

          reservedTickets.push(item.ticketId);
        }

        // 2. Créer la commande de manière atomique
        const order = await tx.order.create({
          data: {
            userId,
            status: OrderStatus.pending_payment,
            totalPrice: totalAmount,
            currency: 'EUR',
            metadata: {
              customerInfo,
              ticketItems,
              transactionId: `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            }
          }
        });

        // 3. Réserver les tickets pour cette commande
        for (const ticketId of reservedTickets) {
          await tx.ticket.update({
            where: { id: ticketId },
            data: { 
              orderId: order.id,
              status: 'pending' // Statut en attente de paiement
            }
          });
        }

        // 4. Retourner la commande avec toutes les relations
        return await tx.order.findUnique({
          where: { id: order.id },
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
            },
            payment: true
          }
        }) as OrderWithRelations;

      } catch (error) {
        // La transaction sera automatiquement rollback
        throw new Error(`Order creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });
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
            event: true
          }
        },
        payment: true
      }
    });
  }

  /**
   * Cancel an order with transaction (P1 FIX)
   * 🔒 CRITIQUE: Transaction pour libérer les tickets atomiquement
   */
  async cancelOrder(id: string): Promise<OrderWithRelations> {
    return await prisma.$transaction(async (tx) => {
      // 1. Vérifier l'existence de la commande
      const order = await tx.order.findUnique({
        where: { id },
        include: {
          tickets: true,
          payment: true
        }
      });

      if (!order) {
        throw new Error('Order not found');
      }

      if (order.status === OrderStatus.paid) {
        throw new Error('Cannot cancel a paid order - use refund instead');
      }

      if (order.status === OrderStatus.cancelled) {
        throw new Error('Order is already cancelled');
      }

      try {
        // 2. Libérer tous les tickets réservés
        if (order.tickets.length > 0) {
          await tx.ticket.updateMany({
            where: { orderId: id },
            data: { 
              orderId: null,
              status: 'pending' // Remettre en disponible
            }
          });
        }

        // 3. Annuler le paiement en attente si il existe
        if (order.payment && order.payment.paymentStatus === 'PENDING') {
          await tx.payment.update({
            where: { id: order.payment.id },
            data: { 
              paymentStatus: PaymentStatus.CANCELLED as any
            }
          });
        }

        // 4. Mettre à jour le statut de la commande
        const cancelledOrder = await tx.order.update({
          where: { id },
          data: { 
            status: OrderStatus.cancelled,
            metadata: {
              ...((order.metadata as any) || {}),
              cancelledAt: new Date().toISOString(),
              cancelReason: 'User cancelled'
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
                event: true
              }
            },
            payment: true
          }
        });

        return cancelledOrder;

      } catch (error) {
        throw new Error(`Order cancellation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });
  }

  /**
   * Complete an order after payment with transaction (P1 FIX)
   * 🔒 CRITIQUE: Transaction pour assurer cohérence paiement/commande
   */
  async completeOrder(id: string, paymentId: string): Promise<OrderWithRelations> {
    return await prisma.$transaction(async (tx) => {
      try {
        // 1. Vérifier l'existence de la commande et du paiement
        const [order, payment] = await Promise.all([
          tx.order.findUnique({
            where: { id },
            include: { tickets: true }
          }),
          tx.payment.findUnique({
            where: { id: paymentId }
          })
        ]);

        if (!order) {
          throw new Error('Order not found');
        }

        if (!payment) {
          throw new Error('Payment not found');
        }

        if (order.status === OrderStatus.paid) {
          throw new Error('Order is already completed');
        }

        if (payment.paymentStatus !== 'COMPLETED') {
          throw new Error('Payment is not completed');
        }

        // 2. Mettre à jour le statut des tickets
        if (order.tickets.length > 0) {
          await tx.ticket.updateMany({
            where: { orderId: id },
            data: { 
              status: 'paid',
              purchasedAt: new Date()
            }
          });
        }

        // 3. Mettre à jour la commande avec le paiement
        const completedOrder = await tx.order.update({
          where: { id },
          data: {
            status: OrderStatus.paid,
            payment: {
              connect: { id: paymentId }
            },
            metadata: {
              ...((order.metadata as any) || {}),
              completedAt: new Date().toISOString(),
              paymentConfirmedAt: new Date().toISOString()
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
                event: true
              }
            },
            payment: true
          }
        });

        return completedOrder;

      } catch (error) {
        throw new Error(`Order completion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });
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
            event: true
          }
        },
        payment: true
      }
    });
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
      prisma.order.count({ where: { status: OrderStatus.paid } }),
      prisma.order.count({ where: { status: OrderStatus.pending_payment } }),
      prisma.order.count({ where: { status: OrderStatus.cancelled } }),
      prisma.payment.findMany({
        where: {
          paymentStatus: 'succeeded'
        }
      })
    ]);

    // Calculate revenue from orders instead of payments since Payment model doesn't have amount field
    const revenueOrders = await prisma.order.findMany({
      where: {
        status: OrderStatus.paid
      },
      select: {
        totalPrice: true
      }
    });

    const totalRevenue = revenueOrders.reduce((sum, order) => sum + order.totalPrice, 0);

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
