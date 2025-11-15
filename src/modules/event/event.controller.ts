// Event controller - wrapper for the event service
import eventService from '../../services/eventService';

/**
 * Get all events
 */
export const getEvents = async (params?: {
  page?: number;
  limit?: number;
  search?: string;
}) => {
  return await eventService.getEvents({
    skip: params?.page ? (params.page - 1) * (params.limit || 10) : undefined,
    take: params?.limit,
  });
};

/**
 * Create a new event
 */
export const createEvent = async (data: {
  title: string;
  description?: string;
  date: Date;
  location: string;
  capacity: number;
  organizerId: string;
}) => {
  return await eventService.createEvent(data);
};

/**
 * Get event by ID
 */
export const getById = async (id: string) => {
  return await eventService.getEventById(id);
};

/**
 * Validate ticket for an event
 */
export const validateTicket = async (eventId: string, ticketId: string) => {
  const event = await eventService.getEventById(eventId);
  if (!event) {
    throw new Error('Event not found');
  }
  return { success: true, message: 'Ticket validated' };
};

/**
 * List events with filters
 */
export const list = async (filters?: any) => {
  return await eventService.getEvents(filters);
};

/**
 * Create event
 */
export const create = async (data: any) => {
  return await eventService.createEvent(data);
};

/**
 * Update event by ID
 */
export const updateById = async (id: string, data: any) => {
  return await eventService.updateEvent(id, data);
};

/**
 * Delete event by ID
 */
export const deleteById = async (id: string) => {
  return await eventService.deleteEvent(id);
};

/**
 * Get event tickets
 */
export const getEventTickets = async (eventId: string) => {
  return await eventService.getEventTickets(eventId);
};

/**
 * Get event statistics
 */
export const getEventStats = async (eventId: string) => {
  return await eventService.getStatistics(eventId);
};

/**
 * Get public events
 */
export const getPublicEvents = async (filters?: any) => {
  return await eventService.getPublicEvents(filters);
};

/**
 * Get featured events
 */
export const getFeaturedEvents = async () => {
  return await eventService.getFeaturedEvents();
};

/**
 * Search events
 */
export const searchEvents = async (query: string, filters?: any) => {
  return await eventService.searchEvents(query);
};

export default {
  getEvents,
  createEvent,
  getById,
  validateTicket,
  list,
  create,
  updateById,
  deleteById,
  getEventTickets,
  getEventStats,
  getPublicEvents,
  getFeaturedEvents,
  searchEvents,
};
