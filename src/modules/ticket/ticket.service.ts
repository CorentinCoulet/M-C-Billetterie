// Import original service
import ticketServiceInstance from '../../services/ticketService';

// Re-export types
export * from '../../services/ticketService';
export { default } from '../../services/ticketService';

// Export individual methods used in API routes
export const getById = (id: string) => ticketServiceInstance.getTicketById(id);
export const getByEventId = (eventId: string) => ticketServiceInstance.getTicketsByEvent(eventId);
export const getUserTickets = (userId: string) => ticketServiceInstance.getUserTickets(userId);
export const create = (data: any) => ticketServiceInstance.createTicket(data);
export const createTicket = (data: any) => ticketServiceInstance.createTicket(data);
export const updateById = (id: string, data: any) => ticketServiceInstance.updateTicket(id, data);
export const deleteById = (id: string) => ticketServiceInstance.deleteTicket(id);
export const list = (params?: any) => ticketServiceInstance.getTickets(params || {});
