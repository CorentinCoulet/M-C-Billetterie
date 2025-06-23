import prisma from '@/lib/prisma';
import { Event, Prisma, Ticket } from '@prisma/client';
import eventService from '@/services/eventService';

/**
 * List all events
 */
export async function list() {
  return eventService.getEvents({});
}

/**
 * Create a new event
 */
export async function create(data: any) {
  return eventService.createEvent(data);
}

/**
 * Get an event by ID
 */
export async function getById(id: number | string) {
  // Convert id to string if it's a number
  const eventId = typeof id === 'number' ? String(id) : id;
  return eventService.getEventById(eventId);
}

/**
 * Update an event by ID
 */
export async function updateById(id: number | string, data: any) {
  // Convert id to string if it's a number
  const eventId = typeof id === 'number' ? String(id) : id;
  return eventService.updateEvent(eventId, data);
}

/**
 * Delete an event by ID
 */
export async function deleteById(id: number | string) {
  // Convert id to string if it's a number
  const eventId = typeof id === 'number' ? String(id) : id;
  return eventService.deleteEvent(eventId);
}

/**
 * Get tickets for an event
 */
export async function getEventTickets(id: number | string) {
  // Convert id to string if it's a number
  const eventId = typeof id === 'number' ? String(id) : id;

  return prisma.ticket.findMany({
    where: { eventId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true
        }
      },
      order: true
    }
  });
}

/**
 * Get statistics for an event
 */
export async function getEventStats(id: number | string) {
  // Convert id to string if it's a number
  const eventId = typeof id === 'number' ? String(id) : id;

  return eventService.getEventStatistics(eventId);
}

/**
 * Validate a ticket for an event
 */
export async function validateTicket(eventId: number | string, ticketId: string) {
  // Convert eventId to string if it's a number
  const eventIdStr = typeof eventId === 'number' ? String(eventId) : eventId;

  // Get the ticket
  const ticket = await prisma.ticket.findFirst({
    where: {
      id: ticketId,
      eventId: eventIdStr
    }
  });

  if (!ticket) {
    throw new Error('Ticket not found');
  }

  // Check if ticket is already used
  if (ticket.status === 'used') {
    return {
      valid: false,
      message: 'Ticket has already been used',
      ticket
    };
  }

  // Mark ticket as used
  const updatedTicket = await prisma.ticket.update({
    where: { id: ticketId },
    data: {
      status: 'used',
      usedAt: new Date()
    }
  });

  return {
    valid: true,
    message: 'Ticket validated successfully',
    ticket: updatedTicket
  };
}

/**
 * Get public events
 */
export async function getPublicEvents() {
  return eventService.getEvents({
    where: {
      isPublished: true
    }
  });
}

/**
 * Get featured events
 */
export async function getFeaturedEvents() {
  return eventService.getEvents({
    where: {
      isPublished: true,
      isFeatured: true
    }
  });
}

/**
 * Search events
 */
export async function searchEvents(params: {
  query?: string;
  category?: string;
  startDate?: string;
  endDate?: string;
  location?: string;
}) {
  const { query, category, startDate, endDate, location } = params;

  const where: Prisma.EventWhereInput = {
    isPublished: true
  };

  // Add search filters
  if (query) {
    where.OR = [
      { title: { contains: query, mode: 'insensitive' } },
      { description: { contains: query, mode: 'insensitive' } },
      { location: { contains: query, mode: 'insensitive' } }
    ];
  }

  if (category) {
    where.categoryId = category;
  }

  if (startDate) {
    where.date = {
      ...where.date,
      gte: new Date(startDate)
    };
  }

  if (endDate) {
    where.date = {
      ...where.date,
      lte: new Date(endDate)
    };
  }

  if (location) {
    where.location = {
      contains: location,
      mode: 'insensitive'
    };
  }

  return eventService.getEvents({ where });
}
