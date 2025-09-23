// User controller - wrapper pour le service user
import userService from '../../services/userService';

/**
 * Get all users
 */
export const getUsers = async (params?: {
  page?: number;
  limit?: number;
  role?: string;
}) => {
  return await userService.getUsers({
    skip: params?.page ? (params.page - 1) * (params.limit || 10) : undefined,
    take: params?.limit,
    where: params?.role ? { role: params.role as any } : undefined,
  });
};

/**
 * Create a new user
 */
export const createUser = async (data: {
  name: string;
  email: string;
  password: string;
  role?: string;
}) => {
  return await userService.createUser(data as any);
};

/**
 * Get user by ID
 */
export const getById = async (id: string) => {
  return await userService.getUserById(id);
};

/**
 * Update user
 */
export const updateUser = async (id: string, data: {
  name?: string;
  email?: string;
  role?: string;
}) => {
  return await userService.updateUser(id, data as any);
};

/**
 * Delete user
 */
export const deleteUser = async (id: string) => {
  return await userService.deleteUser(id);
};

export default {
  getUsers,
  createUser,
  getById,
  updateUser,
  deleteUser,
  // Méthodes manquantes ajoutées
  list: async (filters?: any) => {
    return await userService.getUsers(filters);
  },
  updateById: async (id: string, data: any) => {
    return await userService.updateUser(id, data);
  },
  deleteById: async (id: string) => {
    return await userService.deleteUser(id);
  },
  getProfile: async (userId: string) => {
    return await userService.getUserById(userId);
  },
  updateProfile: async (userId: string, data: any) => {
    return await userService.updateProfile(userId, data);
  },
  getStats: async (userId: string) => {
    return await userService.getUserStats(userId);
  }
};
