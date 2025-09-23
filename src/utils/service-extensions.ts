/**
 * Signature and missing method corrections
 */

import { Prisma } from '../generated/prisma';
import { TicketService } from '../services/ticketQRService';

// TicketService extensions
declare module '../services/ticketQRService' {
  interface TicketService {
    checkAvailability(eventId: string, quantity: number): Promise<boolean>;
    reserveTickets(eventId: string, userId: string, quantity: number): Promise<any>;
    releaseReservedTickets(userId: string, eventId: string): Promise<void>;
  }
}

// Prisma types for tickets
type TicketWithRelations = Prisma.TicketGetPayload<{
  include: {
    event: true;
    user: true;
    order: true;
    qrCode: true;
  }
}>;

// Temporary extensions pending complete refactoring
export const ServiceExtensions = {
  /**
   * TicketService extension
   * Adds missing methods for ticket management
   */
  extendTicketService(service: any) {
    if (!service.checkAvailability) {
      service.checkAvailability = async (eventId: string, quantity: number): Promise<boolean> => {
        // Simple availability check
        const tickets = await service.listTickets({ eventId, status: 'available' });
        return tickets.length >= quantity;
      };
    }

    if (!service.reserveTickets) {
      service.reserveTickets = async (eventId: string, userId: string, quantity: number): Promise<TicketWithRelations[]> => {
        // Ticket reservation
        const availableTickets = await service.listTickets({
          eventId,
          status: 'available'
        });
        
        if (availableTickets.length < quantity) {
          throw new Error('Not enough tickets available');
        }

        const ticketsToReserve = availableTickets.slice(0, quantity);
        return Promise.all(
          ticketsToReserve.map((ticket: TicketWithRelations) => 
            service.reserveTicket(ticket.id, userId)
          )
        );
      };
    }

    if (!service.releaseReservedTickets) {
      service.releaseReservedTickets = async (userId: string, eventId: string): Promise<void> => {
        const reservedTickets = await service.listTickets({
          eventId,
          userId,
          status: 'pending'
        });

        await Promise.all(
          reservedTickets.map((ticket: TicketWithRelations) => 
            service.cancelTicket(ticket.id)
          )
        );
      };
    }

    return service;
  },

  /**
   * EventService extension  
   * Methods have been added directly to the service
   */
  extendEventService(service: any) {
    // Methods have been added directly to the service
    return service;
  },

  /**
   * AuthService extension
   * Methods have been added directly to the service
   */
  extendAuthService(service: any) {
    // Methods have been added directly to the service
    return service;
  },

  /**
   * UserService extension
   * Methods have been added directly to the service
   */
  extendUserService(service: any) {
    // Methods have been added directly to the service
    return service;
  }
};

// Temporary types for corrections
export interface TicketType {
  id: string;
  name: string;
  price: number;
  eventId: string;
  quantity: number;
  status: string;
}

export interface OrderWithTickets {
  id: string;
  userId: string;
  totalAmount: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  tickets: TicketType[];
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

// Temporary corrections for Prisma types
export const TypeCorrections = {
  // OrderStatus correction
  OrderStatus: {
    PENDING: 'pending' as const,
    COMPLETED: 'completed' as const,
    CANCELLED: 'cancelled' as const,
    PAID: 'paid' as const
  },

  // TicketStatus correction
  TicketStatus: {
    AVAILABLE: 'available' as const,
    PENDING: 'pending' as const,
    PAID: 'paid' as const,
    USED: 'used' as const,
    CANCELLED: 'cancelled' as const
  }
} as const;

export default ServiceExtensions;
