import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { UserRole } from '../types/enums/user.enum';
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
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        blocked: true
      }
    });
    return user as UserWithRelations | null;
  }

  /**
   * Get a user by email
   */
  async getUserByEmail(email: string): Promise<UserWithRelations | null> {
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        blocked: true
      }
    });
    return user as UserWithRelations | null;
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
    
    const users = await prisma.user.findMany({
      skip,
      take,
      where: where as any,
      orderBy: orderBy as any,
      include: {
        blocked: true
      }
    });
    return users as UserWithRelations[];
  }

  /**
   * Create a new user
   */
  async createUser(data: UserCreateInput): Promise<UserWithRelations> {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email }
    });

    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Hash password if provided
    if (data.password) {
      data.password = await bcrypt.hash(data.password, SALT_ROUNDS);
    }

    const user = await prisma.user.create({
      data: data as any,
      include: {
        blocked: true
      }
    });
    return user as UserWithRelations;
  }

  /**
   * Update a user
   */
  async updateUser(id: string, data: UserUpdateInput): Promise<UserWithRelations> {
    // Hash password if provided
    if (data.password) {
      data.password = await bcrypt.hash(data.password, SALT_ROUNDS);
    }

    const user = await prisma.user.update({
      where: { id },
      data: data as any,
      include: {
        blocked: true
      }
    });
    return user as UserWithRelations;
  }

  /**
   * Delete a user
   */
  async deleteUser(id: string): Promise<UserWithRelations> {
    const user = await prisma.user.delete({
      where: { id },
      include: {
        blocked: true
      }
    });
    return user as UserWithRelations;
  }

  /**
   * Update user password
   */
  async updatePassword(id: string, newPassword: string): Promise<UserWithRelations> {
    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
    
    const user = await prisma.user.update({
      where: { id },
      data: { 
        password: hashedPassword,
        passwordChangedAt: new Date()
      },
      include: {
        blocked: true
      }
    });
    return user as UserWithRelations;
  }

  /**
   * Change user role
   */
  async changeUserRole(id: string, role: UserRole): Promise<UserWithRelations> {
    const user = await prisma.user.update({
      where: { id },
      data: { role },
      include: {
        blocked: true
      }
    });
    return user as UserWithRelations;
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
    const user = await prisma.user.update({
      where: { id },
      data: data as any,
      include: {
        blocked: true
      }
    });
    return user as UserWithRelations;
  }

  /**
   * Get user statistics
   */
  async getUserStats(userId: string): Promise<{
    totalOrders: number;
    totalTickets: number;
    totalSpent: number;
    eventsAttended: number;
  }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        orders: {
          where: {
            status: 'paid'
          }
        },
        tickets: {
          where: {
            status: 'used'
          },
          include: {
            event: true
          }
        }
      }
    });

    if (!user) {
      return {
        totalOrders: 0,
        totalTickets: 0,
        totalSpent: 0,
        eventsAttended: 0
      };
    }

    const totalOrders = user.orders.length;
    const totalTickets = user.tickets.length;
    const totalSpent = user.orders.reduce((sum, order) => sum + order.totalPrice, 0);
    const eventsAttended = new Set(user.tickets.map(t => t.eventId)).size;

    return {
      totalOrders,
      totalTickets,
      totalSpent,
      eventsAttended
    };
  }
}

const userService = new UserService();
export default userService;
