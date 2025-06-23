import prisma from '@/lib/prisma';
import { Ticket, Prisma } from '@prisma/client';

/**
 * Service for ticket management operations
 */
export class TicketService {
  /**
   * Get a ticket by ID
   */
  async getTicketById(id: string): Promise<Ticket | null> {
    return prisma.ticket.findUnique({
      where: { id },
      include: {
        event: true,
        orders: true
      }
    });
  }

  /**
   * Get all tickets for an event
   */
  async getTicketsByEvent(eventId: string): Promise<Ticket[]> {
    return prisma.ticket.findMany({
      where: { eventId },
      include: {
        event: true
      }
    });
  }

  /**
   * Get all tickets with pagination and filtering
   */
  async getTickets(params: {
    skip?: number;
    take?: number;
    where?: Prisma.TicketWhereInput;
    orderBy?: Prisma.TicketOrderByWithRelationInput;
  }): Promise<Ticket[]> {
    const { skip, take, where, orderBy } = params;
    return prisma.ticket.findMany({
      skip,
      take,
      where,
      orderBy,
      include: {
        event: true
      }
    });
  }

  /**
   * Create a new ticket
   */
  async createTicket(data: Prisma.TicketCreateInput): Promise<Ticket> {
    return prisma.ticket.create({
      data,
      include: {
        event: true
      }
    });
  }

  /**
   * Create multiple tickets for an event
   */
  async createTicketsForEvent(eventId: string, tickets: Array<{
    name: string;
    description?: string;
    price: number;
    quantity: number;
    type?: string;
  }>): Promise<Ticket[]> {
    const createdTickets = [];
    
    for (const ticket of tickets) {
      const createdTicket = await prisma.ticket.create({
        data: {
          ...ticket,
          event: {
            connect: { id: eventId }
          }
        },
        include: {
          event: true
        }
      });
      createdTickets.push(createdTicket);
    }
    
    return createdTickets;
  }

  /**
   * Update a ticket
   */
  async updateTicket(id: string, data: Prisma.TicketUpdateInput): Promise<Ticket> {
    return prisma.ticket.update({
      where: { id },
      data,
      include: {
        event: true
      }
    });
  }

  /**
   * Delete a ticket
   */
  async deleteTicket(id: string): Promise<Ticket> {
    return prisma.ticket.delete({
      where: { id }
    });
  }

  /**
   * Check ticket availability
   */
  async checkAvailability(id: string): Promise<{
    available: boolean;
    remaining: number;
    total: number;
  }> {
    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        orders: true
      }
    });

    if (!ticket) {
      throw new Error('Ticket not found');
    }

    const soldCount = ticket.orders.length;
    const remaining = ticket.quantity - soldCount;

    return {
      available: remaining > 0,
      remaining,
      total: ticket.quantity
    };
  }

  /**
   * Reserve tickets (decrease available quantity)
   */
  async reserveTickets(id: string, quantity: number): Promise<Ticket> {
    const availability = await this.checkAvailability(id);
    
    if (!availability.available || availability.remaining < quantity) {
      throw new Error('Not enough tickets available');
    }

    // In a real implementation, you might want to use a transaction
    // to ensure atomicity when reserving tickets
    return prisma.ticket.update({
      where: { id },
      data: {
        reserved: {
          increment: quantity
        }
      }
    });
  }

  /**
   * Release reserved tickets
   */
  async releaseReservedTickets(id: string, quantity: number): Promise<Ticket> {
    const ticket = await prisma.ticket.findUnique({
      where: { id }
    });

    if (!ticket) {
      throw new Error('Ticket not found');
    }

    const newReservedValue = Math.max(0, ticket.reserved - quantity);

    return prisma.ticket.update({
      where: { id },
      data: {
        reserved: newReservedValue
      }
    });
  }

  /**
   * Get tickets purchased by a user
   */
  async getUserTickets(userId: string): Promise<Array<{
    ticket: Ticket;
    orderId: string;
    purchaseDate: Date;
  }>> {
    const orders = await prisma.order.findMany({
      where: {
        userId,
        status: 'COMPLETED'
      },
      include: {
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

    const userTickets = [];
    
    for (const order of orders) {
      for (const orderTicket of order.tickets) {
        userTickets.push({
          ticket: orderTicket.ticket,
          orderId: order.id,
          purchaseDate: order.createdAt
        });
      }
    }

    return userTickets;
  }
}

const ticketService = new TicketService();
export default ticketService;