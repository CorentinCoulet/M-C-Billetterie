import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import {
    UserCreateInput,
    UserOrderByInput,
    UserProfileUpdateInput,
    UserUpdateInput,
    UserWhereInput,
    UserWithRelations
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
        blocked: true
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
        blocked: true
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
    const { skip = 0, take = 10, where, orderBy } = params;
    
    return prisma.user.findMany({
      skip,
      take,
      where: where as any,
      orderBy: orderBy as any,
      include: {
        blocked: true
      }
    }) as Promise<UserWithRelations[]>;
  }

  /**
   * Create a new user
   */
  async createUser(data: UserCreateInput): Promise<UserWithRelations> {
    // Hash password if provided
    if (data.password) {
      data.password = await bcrypt.hash(data.password, SALT_ROUNDS);
    }

    return prisma.user.create({
      data: data as any,
      include: {
        blocked: true
      }
    }) as Promise<UserWithRelations>;
  }

  /**
   * Update a user
   */
  async updateUser(id: string, data: UserUpdateInput): Promise<UserWithRelations> {
    // Hash password if provided
    if (data.password) {
      data.password = await bcrypt.hash(data.password, SALT_ROUNDS);
    }

    return prisma.user.update({
      where: { id },
      data: data as any,
      include: {
        blocked: true
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
        blocked: true
      }
    }) as Promise<UserWithRelations>;
  }

  /**
   * Update user password
   */
  async updatePassword(id: string, newPassword: string): Promise<UserWithRelations> {
    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
    
    return prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
      include: {
        blocked: true
      }
    }) as Promise<UserWithRelations>;
  }

  /**
   * Change user role
   */
  async changeUserRole(id: string, role: string): Promise<UserWithRelations> {
    return prisma.user.update({
      where: { id },
      data: { role },
      include: {
        blocked: true
      }
    }) as Promise<UserWithRelations>;
  }

  /**
   * Verify user password
   */
  async verifyPassword(userId: string, password: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { password: true }
    });

    if (!user || !user.password) {
      return false;
    }

    return bcrypt.compare(password, user.password);
  }

  /**
   * Update user profile
   */
  async updateProfile(id: string, data: UserProfileUpdateInput): Promise<UserWithRelations> {
    return prisma.user.update({
      where: { id },
      data: data as any,
      include: {
        blocked: true
      }
    }) as Promise<UserWithRelations>;
  }

  /**
   * Mark user as verified
   */
  async markAsVerified(id: string): Promise<UserWithRelations> {
    return prisma.user.update({
      where: { id },
      data: { isVerified: true },
      include: {
        blocked: true
      }
    }) as Promise<UserWithRelations>;
  }

  /**
   * Block a user
   */
  async blockUser(id: string, reason: string): Promise<void> {
    await prisma.blockedUser.create({
      data: {
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
   * Check if user is blocked
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
