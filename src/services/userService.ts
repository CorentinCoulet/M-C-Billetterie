import prisma from '@/lib/prisma';
import { Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { 
  UserWithRelations, 
  UserCreateInput, 
  UserUpdateInput, 
  UserWhereInput, 
  UserOrderByInput, 
  UserProfileUpdateInput 
} from '../types/user';

const SALT_ROUNDS = 10;

/**
 * Service for user management operations
 */
export class UserService {
  /**
   * Get a user by ID
   */
  async getUserById(id: string): Promise<UserWithRelations | null> {
    return prisma.user.findUnique({
      where: { id },
      include: {
        blockedUser: true
      }
    }) as Promise<UserWithRelations | null>;
  }

  /**
   * Get a user by email
   */
  async getUserByEmail(email: string): Promise<UserWithRelations | null> {
    return prisma.user.findUnique({
      where: { email },
      include: {
        blockedUser: true
      }
    }) as Promise<UserWithRelations | null>;
  }

  /**
   * Get all users with pagination and filtering
   */
  async getUsers(params: {
    skip?: number;
    take?: number;
    where?: UserWhereInput;
    orderBy?: UserOrderByInput;
  }): Promise<UserWithRelations[]> {
    const { skip, take, where, orderBy } = params;
    return prisma.user.findMany({
      skip,
      take,
      where,
      orderBy,
      include: {
        blockedUser: true
      }
    }) as Promise<UserWithRelations[]>;
  }

  /**
   * Create a new user
   */
  async createUser(data: UserCreateInput): Promise<UserWithRelations> {
    if (data.password) {
      data.password = await bcrypt.hash(data.password, SALT_ROUNDS);
    }

    return prisma.user.create({
      data,
      include: {
        blockedUser: true
      }
    }) as Promise<UserWithRelations>;
  }

  /**
   * Update a user
   */
  async updateUser(id: string, data: UserUpdateInput): Promise<UserWithRelations> {
    if (data.password && typeof data.password === 'string') {
      data.password = await bcrypt.hash(data.password, SALT_ROUNDS);
    }

    return prisma.user.update({
      where: { id },
      data,
      include: {
        blockedUser: true
      }
    }) as Promise<UserWithRelations>;
  }

  /**
   * Delete a user
   */
  async deleteUser(id: string): Promise<UserWithRelations> {
    return prisma.user.delete({
      where: { id },
      include: {
        blockedUser: true
      }
    }) as Promise<UserWithRelations>;
  }

  /**
   * Count users with optional filtering
   */
  async countUsers(where?: UserWhereInput): Promise<number> {
    return prisma.user.count({ where });
  }

  /**
   * Update user profile
   */
  async updateProfile(id: string, data: UserProfileUpdateInput): Promise<UserWithRelations> {
    return prisma.user.update({
      where: { id },
      data,
      include: {
        blockedUser: true
      }
    }) as Promise<UserWithRelations>;
  }

  /**
   * Change user role
   */
  async changeUserRole(id: string, role: Role): Promise<UserWithRelations> {
    return prisma.user.update({
      where: { id },
      data: { role },
      include: {
        blockedUser: true
      }
    }) as Promise<UserWithRelations>;
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
