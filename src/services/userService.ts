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
      data: { role: role as any },
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

  /**
   * Mark user as verified
   */
  async markAsVerified(id: string): Promise<UserWithRelations> {
    const user = await prisma.user.update({
      where: { id },
      data: { isVerified: true },
      include: {
        blocked: true
      }
    });
    return user as UserWithRelations;
  }

  /**
   * Block a user
   */
  async blockUser(id: string, reason: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new Error('User not found');
    }

    await prisma.blockedUser.create({
      data: {
        userId: id,
        reason,
        blockedAt: new Date(),
      }
    });
  }

  /**
   * Unblock a user
   */
  async unblockUser(id: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new Error('User not found');
    }

    await prisma.blockedUser.deleteMany({
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

  /**
   * Get user management statistics (Admin)
   */
  async getUserManagementStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    blockedUsers: number;
    usersByRole: { role: string; count: number }[];
    newUsersOverTime: { date: string; count: number }[];
  }> {
    const [
      totalUsers,
      blockedUsers,
      usersByRole,
      newUsersData
    ] = await Promise.all([
      prisma.user.count(),
      prisma.blockedUser.count(),
      prisma.user.groupBy({
        by: ['role'],
        _count: { id: true },
      }),
      prisma.user.findMany({
        select: { createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 1000, // Last 1000 users
      }),
    ]);

    const newUsersOverTime = this.processNewUsersOverTime(newUsersData);

    return {
      totalUsers,
      activeUsers: totalUsers - blockedUsers,
      blockedUsers,
      usersByRole: usersByRole.map(item => ({
        role: item.role,
        count: item._count.id
      })),
      newUsersOverTime
    };
  }

  /**
   * Process new users over time for statistics
   */
  private processNewUsersOverTime(userData: { createdAt: Date }[]): { date: string; count: number }[] {
    const last12Months = this.getLast12MonthsLabels();
    const usersByMonth: Record<string, number> = {};

    // Initialize all months with 0
    last12Months.forEach(month => {
      usersByMonth[month] = 0;
    });

    // Count users by month
    userData.forEach(user => {
      const date = user.createdAt;
      const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (usersByMonth[monthYear] !== undefined) {
        usersByMonth[monthYear]++;
      }
    });

    // Convert to array format
    return last12Months.map(month => ({
      date: month,
      count: usersByMonth[month]
    }));
  }

  /**
   * Get last 12 months labels
   */
  private getLast12MonthsLabels(): string[] {
    const months = [];
    const now = new Date();
    
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
    }
    
    return months;
  }
}

const userService = new UserService();
export default userService;
