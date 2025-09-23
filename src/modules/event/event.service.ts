// Import original service
import eventServiceInstance from '../../services/eventService';

// Re-export types
export * from '../../services/eventService';
export { default } from '../../services/eventService';

// Export individual methods used in API routes
export const getById = (id: string) => eventServiceInstance.getById(id);
export const updateById = (id: string, data: any) => eventServiceInstance.update(id, data);
export const deleteById = (id: string) => eventServiceInstance.delete(id);
export const list = (params?: any) => eventServiceInstance.getAll(params || {});
export const create = (data: any) => eventServiceInstance.create(data);
export const getStatistics = (eventId: string) => eventServiceInstance.getStatistics(eventId);

