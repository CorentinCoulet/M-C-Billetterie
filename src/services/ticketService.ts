import prisma from '@/lib/prisma';
import { TicketType } from '@prisma/client';
import { BaseService } from './baseService';

// Types spécifiques pour les relations
type EventBasic = {
  id: string;
  title: string;
  date: Date;
  location: string;
}

type OrderTicketBasic = {
  id: string;
  orderId: string;
  ticketId: string;
  quantity: number;
  unitPrice: number;
}

type TicketWithRelations = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  quantity: number;
  type: TicketType | null;
  eventId: string;
  reserved: number;
  createdAt: Date;
  updatedAt: Date;
  event: EventBasic;
  orders: OrderTicketBasic[];
}

// Types d'entrée pour les opérations
type TicketCreateInput = {
  name: string;
  description?: string | null;
  price: number;
  quantity: number;
  type?: TicketType | null;
  eventId: string;
  reserved?: number;
}

type TicketUpdateInput = {
  name?: string;
  description?: string | null;
  price?: number;
  quantity?: number;
  type?: TicketType | null;
  reserved?: number;
}

type TicketWhereInput = {
  id?: string;
  name?: {
    contains?: string;
    mode?: 'insensitive';
  };
  eventId?: string;
  type?: TicketType;
  AND?: TicketWhereInput[];
  OR?: TicketWhereInput[];
}

type TicketOrderByInput = {
  id?: 'asc' | 'desc';
  name?: 'asc' | 'desc';
  price?: 'asc' | 'desc';
  quantity?: 'asc' | 'desc';
  createdAt?: 'asc' | 'desc';
  updatedAt?: 'asc' | 'desc';
}

type TicketAvailability = {
  available: boolean;
  remaining: number;
  total: number;
}

type UserTicket = {
  ticket: TicketWithRelations;
  orderId: string;
  purchaseDate: Date;
}

// Standard relations to include in ticket queries
const ticketIncludes = {
  event: true,
  orders: true
};

/**
 * Service for ticket management operations
 */
export class TicketService extends BaseService<TicketWithRelations> {
  constructor() {
    super(prisma.ticket, ticketIncludes);
  }

  /**
   * Get a ticket by ID
   */
  async getTicketById(id: string): Promise<TicketWithRelations | null> {
    return this.getById(id);
  }

  /**
   * Get all tickets for an event
   */
  async getTicketsByEvent(eventId: string): Promise<TicketWithRelations[]> {
    return this.getAll({
      where: { eventId }
    });
  }

  /**
   * Get all tickets with pagination and filtering
   */
  async getTickets(params: {
    skip?: number;
    take?: number;
    where?: TicketWhereInput;
    orderBy?: TicketOrderByInput;
  }): Promise<TicketWithRelations[]> {
    return this.getAll(params);
  }

  /**
   * Create a new ticket
   */
  async createTicket(data: TicketCreateInput): Promise<TicketWithRelations> {
    return this.create({
      ...data,
      event: {
        connect: { id: data.eventId }
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
    type?: TicketType | null;
  }>): Promise<TicketWithRelations[]> {
    const createdTickets: TicketWithRelations[] = [];

    for (const ticket of tickets) {
      const createdTicket = await this.create({
        ...ticket,
        event: {
          connect: { id: eventId }
        }
      });
      createdTickets.push(createdTicket);
    }

    return createdTickets;
  }

  /**
   * Update a ticket
   */
  async updateTicket(id: string, data: TicketUpdateInput): Promise<TicketWithRelations> {
    return this.update(id, data);
  }

  /**
   * Delete a ticket
   */
  async deleteTicket(id: string): Promise<TicketWithRelations> {
    return this.delete(id);
  }

  /**
   * Check ticket availability
   */
  async checkAvailability(id: string): Promise<TicketAvailability> {
    const ticket = await this.getById(id);

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
  async reserveTickets(id: string, quantity: number): Promise<TicketWithRelations> {
    const availability = await this.checkAvailability(id);

    if (!availability.available || availability.remaining < quantity) {
      throw new Error('Not enough tickets available');
    }

    // In a real implementation, you might want to use a transaction
    // to ensure atomicity when reserving tickets
    return this.update(id, {
      reserved: {
        increment: quantity
      }
    });
  }

  /**
   * Release reserved tickets
   */
  async releaseReservedTickets(id: string, quantity: number): Promise<TicketWithRelations> {
    const ticket = await this.getById(id);

    if (!ticket) {
      throw new Error('Ticket not found');
    }

    const newReservedValue = Math.max(0, ticket.reserved - quantity);

    return this.update(id, {
      reserved: newReservedValue
    });
  }

  /**
   * Get tickets purchased by a user
   */
  async getUserTickets(userId: string): Promise<UserTicket[]> {
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
                event: true,
                orders: true
              }
            }
          }
        }
      }
    });

    const userTickets: UserTicket[] = [];

    for (const order of orders) {
      for (const orderTicket of order.tickets) {
        userTickets.push({
          ticket: orderTicket.ticket as unknown as TicketWithRelations,
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
