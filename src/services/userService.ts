import prisma from '@/lib/prisma';
import { User, Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

/**
 * Service for user management operations
 */
export class UserService {
  /**
   * Get a user by ID
   */
  async getUserById(id: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id }
    });
  }

  /**
   * Get a user by email
   */
  async getUserByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { email }
    });
  }

  /**
   * Get all users with pagination and filtering
   */
  async getUsers(params: {
    skip?: number;
    take?: number;
    where?: Prisma.UserWhereInput;
    orderBy?: Prisma.UserOrderByWithRelationInput;
  }): Promise<User[]> {
    const { skip, take, where, orderBy } = params;
    return prisma.user.findMany({
      skip,
      take,
      where,
      orderBy,
    });
  }

  /**
   * Create a new user
   */
  async createUser(data: Prisma.UserCreateInput): Promise<User> {
    if (data.password) {
      data.password = await bcrypt.hash(data.password, SALT_ROUNDS);
    }
    
    return prisma.user.create({
      data
    });
  }

  /**
   * Update a user
   */
  async updateUser(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    if (data.password && typeof data.password === 'string') {
      data.password = await bcrypt.hash(data.password, SALT_ROUNDS);
    }
    
    return prisma.user.update({
      where: { id },
      data
    });
  }

  /**
   * Delete a user
   */
  async deleteUser(id: string): Promise<User> {
    return prisma.user.delete({
      where: { id }
    });
  }

  /**
   * Count users with optional filtering
   */
  async countUsers(where?: Prisma.UserWhereInput): Promise<number> {
    return prisma.user.count({ where });
  }

  /**
   * Update user profile
   */
  async updateProfile(id: string, data: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
  }): Promise<User> {
    return prisma.user.update({
      where: { id },
      data
    });
  }

  /**
   * Change user role
   */
  async changeUserRole(id: string, role: 'USER' | 'ADMIN' | 'ORGANISATEUR'): Promise<User> {
    return prisma.user.update({
      where: { id },
      data: { role }
    });
  }

  /**
   * Block a user
   */
  async blockUser(id: string, reason: string): Promise<void> {
    await prisma.blockedUser.upsert({
      where: { userId: id },
      update: { reason },
      create: {
        userId: id,
        reason
      }
    });
  }

  /**
   * Unblock a user
   */
  async unblockUser(id: string): Promise<void> {
    await prisma.blockedUser.delete({
      where: { userId: id }
    });
  }

  /**
   * Check if a user is blocked
   */
  async isUserBlocked(id: string): Promise<boolean> {
    const blockedUser = await prisma.blockedUser.findUnique({
      where: { userId: id }
    });
    return !!blockedUser;
  }
}

const userService = new UserService();
export default userService;