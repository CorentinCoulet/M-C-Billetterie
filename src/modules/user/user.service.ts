// Import of the original service
import userServiceInstance from '../../services/userService';

// Re-export types
export * from '../../services/userService';
export { default } from '../../services/userService';

// Export individual methods used in API routes
export const getById = (id: string) => userServiceInstance.getUserById(id);
export const getUserById = (id: string) => userServiceInstance.getUserById(id);
export const getUserByEmail = (email: string) => userServiceInstance.getUserByEmail(email);
export const updateById = (id: string, data: any) => userServiceInstance.updateUser(id, data);
export const deleteById = (id: string) => userServiceInstance.deleteUser(id);
export const list = (params?: any) => userServiceInstance.getUsers(params || {});
export const create = (data: any) => userServiceInstance.createUser(data);
export const getProfile = (id: string) => userServiceInstance.getUserById(id);
export const updateProfile = (id: string, data: any) => userServiceInstance.updateProfile(id, data);
export const getStats = (userId: string) => userServiceInstance.getUserStats(userId);
export const updatePassword = (id: string, newPassword: string) => userServiceInstance.updatePassword(id, newPassword);
export const verifyPassword = (userId: string, password: string) => userServiceInstance.verifyPassword(userId, password);

