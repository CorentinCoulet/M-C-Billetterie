// Import of the original service
import orderServiceInstance from '../../services/orderService';

// Re-export types
export * from '../../services/orderService';
export { default } from '../../services/orderService';

// Export individual methods used in API routes
export const getById = (id: string) => orderServiceInstance.getOrderById(id);
export const getOrderById = (id: string) => orderServiceInstance.getOrderById(id);
export const getUserOrders = (userId: string) => orderServiceInstance.getUserOrders(userId);
export const updateById = (id: string, data: any) => orderServiceInstance.updateOrderStatus(id, data.status);
export const deleteById = (id: string) => orderServiceInstance.cancelOrder(id);
export const list = (params?: any) => orderServiceInstance.getOrders(params || {});
export const create = (data: any) => orderServiceInstance.createOrder(data);
export const createOrder = (data: any) => orderServiceInstance.createOrder(data);
export const updateOrderStatus = (id: string, status: any) => orderServiceInstance.updateOrderStatus(id, status);
export const cancelOrder = (id: string) => orderServiceInstance.cancelOrder(id);
export const completeOrder = (id: string, paymentId: string) => orderServiceInstance.completeOrder(id, paymentId);
export const getOrderStatistics = () => orderServiceInstance.getOrderStatistics();
