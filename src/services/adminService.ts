import type { User } from '../generated/prisma';
import { prisma } from '../lib/prisma';
import { analyticsService } from './analyticsService';
import { eventManagementService } from './eventManagementService';
import { systemLogsService } from './systemLogsService';

export class AdminService {
  /**
   * Get dashboard statistics (delegated to AnalyticsService)
   */
  async getDashboardStatistics() {
    return analyticsService.getDashboardStatistics();
  }

  /**
   * Get sales statistics (delegated to AnalyticsService)
   */
  async getSalesStatistics() {
    return analyticsService.getSalesStatistics();
  }

  /**
   * Get user management statistics (delegated to AnalyticsService)
   */
  async getUserManagementStats() {
    return analyticsService.getUserAnalytics();
  }

  /**
   * Get event management statistics (delegated to EventManagementService)
   */
  async getEventManagementStats() {
    return eventManagementService.getEventManagementStats();
  }

  /**
   * Get system logs (delegated to SystemLogsService)
   */
  async getSystemLogs(params?: any) {
    return systemLogsService.getSystemLogs(params);
  }

  /**
   * Log system activity (delegated to SystemLogsService)
   */
  async logSystemActivity(data: any) {
    return systemLogsService.logSystemActivity(data);
  }

  // ================================
  // CORE ADMIN OPERATIONS (kept in AdminService)
  // ================================

  /**
   * Block a user
   */
  async blockUser(userId: string, reason: string, adminId: string): Promise<void> {
    try {
      // Check if user is already blocked
      const existingBlock = await prisma.blockedUser.findUnique({
        where: { userId }
      });

      if (existingBlock) {
        throw new Error('User is already blocked');
      }

      // Block the user
      await prisma.blockedUser.create({
        data: {
          userId,
          reason: `${reason} (blocked by admin: ${adminId})`,
          blockedAt: new Date()
        }
      });

      // Log admin action
      await systemLogsService.logAdminAction({
        adminId,
        action: 'BLOCK_USER',
        targetUserId: userId,
        details: { reason }
      });
    } catch (error) {
      // Log error
      await systemLogsService.logSystemActivity({
        action: 'ADMIN_ERROR',
        userId: adminId,
        level: 'high',
        result: 'error',
        details: { error: error instanceof Error ? error.message : 'Unknown error', action: 'blockUser', targetUserId: userId }
      });
      throw error;
    }
  }

  /**
   * Unblock a user
   */
  async unblockUser(userId: string, adminId: string): Promise<void> {
    try {
      const blockedUser = await prisma.blockedUser.findUnique({
        where: { userId }
      });

      if (!blockedUser) {
        throw new Error('User is not blocked');
      }

      // Unblock the user
      await prisma.blockedUser.delete({
        where: { userId }
      });

      // Log admin action
      await systemLogsService.logAdminAction({
        adminId,
        action: 'UNBLOCK_USER',
        targetUserId: userId,
        details: { previousReason: blockedUser.reason }
      });
    } catch (error) {
      // Log error
      await systemLogsService.logSystemActivity({
        action: 'ADMIN_ERROR',
        userId: adminId,
        level: 'high',
        result: 'error',
        details: { error: error instanceof Error ? error.message : 'Unknown error', action: 'unblockUser', targetUserId: userId }
      });
      throw error;
    }
  }

  /**
   * Get blocked users
   */
  async getBlockedUsers(): Promise<Array<{
    userId: string;
    user: {
      name: string | null;
      email: string;
    };
    reason: string;
    blockedAt: Date;
  }>> {
    const blockedUsers = await prisma.blockedUser.findMany({
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: { blockedAt: 'desc' }
    });

    return blockedUsers.map(blocked => ({
      userId: blocked.userId,
      user: blocked.user,
      reason: blocked.reason,
      blockedAt: blocked.blockedAt
    }));
  }

  /**
   * Update user role
   */
  async updateUserRole(userId: string, newRole: string, adminId: string): Promise<User> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        throw new Error('User not found');
      }

      const oldRole = user.role;
      
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { role: newRole as any }
      });

      // Log admin action
      await systemLogsService.logAdminAction({
        adminId,
        action: 'UPDATE_USER_ROLE',
        targetUserId: userId,
        details: { 
          oldRole, 
          newRole,
          userEmail: user.email
        }
      });

      return updatedUser;
    } catch (error) {
      // Log error
      await systemLogsService.logSystemActivity({
        action: 'ADMIN_ERROR',
        userId: adminId,
        level: 'high',
        result: 'error',
        details: { error: error instanceof Error ? error.message : 'Unknown error', action: 'updateUserRole', targetUserId: userId }
      });
      throw error;
    }
  }

  /**
   * Delete user account (admin action)
   */
  async deleteUser(userId: string, adminId: string, reason?: string): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, name: true }
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Check if user has active orders or tickets
      const [activeOrders, activeTickets] = await Promise.all([
        prisma.order.count({
          where: { 
            userId,
            status: { in: ['pending_payment', 'paid'] }
          }
        }),
        prisma.ticket.count({
          where: {
            userId,
            status: { in: ['paid', 'pending'] }
          }
        })
      ]);

      if (activeOrders > 0 || activeTickets > 0) {
        throw new Error('Cannot delete user with active orders or tickets');
      }

      // Delete user (cascade will handle related records)
      await prisma.user.delete({
        where: { id: userId }
      });

      // Log admin action
      await systemLogsService.logAdminAction({
        adminId,
        action: 'DELETE_USER',
        targetUserId: userId,
        details: {
          reason: reason || 'Admin deletion',
          userEmail: user.email,
          userName: user.name
        }
      });
    } catch (error) {
      // Log error
      await systemLogsService.logSystemActivity({
        action: 'ADMIN_ERROR',
        userId: adminId,
        level: 'critical',
        result: 'error',
        details: { error: error instanceof Error ? error.message : 'Unknown error', action: 'deleteUser', targetUserId: userId }
      });
      throw error;
    }
  }

  /**
   * Get user details for admin view
   */
  async getUserDetails(userId: string): Promise<{
    user: User;
    orders: Array<{
      id: string;
      totalPrice: number;
      status: string;
      createdAt: Date;
    }>;
    tickets: Array<{
      id: string;
      eventTitle: string;
      status: string;
      purchasedAt: Date;
    }>;
    loginHistory: Array<{
      timestamp: Date;
      ipAddress: string;
      success: boolean;
    }>;
    isBlocked: boolean;
    blockReason?: string;
  }> {
    const [user, orders, tickets, loginAttempts, blockedUser] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId }
      }),
      prisma.order.findMany({
        where: { userId },
        select: {
          id: true,
          totalPrice: true,
          status: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      }),
      prisma.ticket.findMany({
        where: { userId },
        select: {
          id: true,
          status: true,
          purchasedAt: true,
          event: {
            select: { title: true }
          }
        },
        orderBy: { purchasedAt: 'desc' },
        take: 10
      }),
      prisma.loginAttempt.findMany({
        where: { userId },
        select: {
          timestamp: true,
          ipAddress: true,
          success: true
        },
        orderBy: { timestamp: 'desc' },
        take: 20
      }),
      prisma.blockedUser.findUnique({
        where: { userId }
      })
    ]);

    if (!user) {
      throw new Error('User not found');
    }

    return {
      user,
      orders,
      tickets: tickets.map(ticket => ({
        id: ticket.id,
        eventTitle: ticket.event.title,
        status: ticket.status,
        purchasedAt: ticket.purchasedAt
      })),
      loginHistory: loginAttempts,
      isBlocked: !!blockedUser,
      blockReason: blockedUser?.reason
    };
  }

  /**
   * Get admin activity summary
   */
  async getAdminActivitySummary(adminId: string): Promise<{
    totalActions: number;
    todayActions: number;
    recentActions: Array<{
      action: string;
      timestamp: Date;
      targetUserId?: string;
      details?: any;
    }>;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalActions, todayActions, recentActions] = await Promise.all([
      prisma.auditLog.count({
        where: {
          userId: adminId,
          action: { startsWith: 'ADMIN_' }
        }
      }),
      prisma.auditLog.count({
        where: {
          userId: adminId,
          action: { startsWith: 'ADMIN_' },
          timestamp: { gte: today }
        }
      }),
      prisma.auditLog.findMany({
        where: {
          userId: adminId,
          action: { startsWith: 'ADMIN_' }
        },
        select: {
          action: true,
          timestamp: true,
          resourceId: true,
          details: true
        },
        orderBy: { timestamp: 'desc' },
        take: 10
      })
    ]);

    return {
      totalActions,
      todayActions,
      recentActions: recentActions.map(action => ({
        action: action.action,
        timestamp: action.timestamp,
        targetUserId: action.resourceId || undefined,
        details: action.details ? JSON.parse(action.details) : null
      }))
    };
  }

  /**
   * System maintenance operations
   */
  async performSystemMaintenance(adminId: string, operations: {
    cleanupLogs?: boolean;
    cleanupSessions?: boolean;
    optimizeDatabase?: boolean;
  }): Promise<{
    results: {
      operation: string;
      success: boolean;
      details: any;
    }[];
  }> {
    const results = [];

    try {
      if (operations.cleanupLogs) {
        const logCleanupResult = await systemLogsService.cleanupOldLogs(90);
        results.push({
          operation: 'cleanup_logs',
          success: true,
          details: logCleanupResult
        });
      }

      if (operations.cleanupSessions) {
        const expiredSessions = await prisma.userSession.deleteMany({
          where: {
            OR: [
              { expiresAt: { lt: new Date() } },
              { isActive: false },
              { destroyedAt: { not: null } }
            ]
          }
        });
        results.push({
          operation: 'cleanup_sessions',
          success: true,
          details: { deletedSessions: expiredSessions.count }
        });
      }

      if (operations.optimizeDatabase) {
        // This would typically involve database-specific optimization commands
        // For now, we'll just analyze some statistics
        const dbStats = await Promise.all([
          prisma.user.count(),
          prisma.event.count(),
          prisma.order.count(),
          prisma.ticket.count(),
          prisma.auditLog.count()
        ]);
        
        results.push({
          operation: 'optimize_database',
          success: true,
          details: {
            users: dbStats[0],
            events: dbStats[1],
            orders: dbStats[2],
            tickets: dbStats[3],
            auditLogs: dbStats[4]
          }
        });
      }

      // Log maintenance activity
      await systemLogsService.logAdminAction({
        adminId,
        action: 'SYSTEM_MAINTENANCE',
        details: { operations, results }
      });

      return { results };
    } catch (error) {
      await systemLogsService.logSystemActivity({
        action: 'ADMIN_ERROR',
        userId: adminId,
        level: 'high',
        result: 'error',
        details: { error: error instanceof Error ? error.message : 'Unknown error', action: 'performSystemMaintenance' }
      });
      throw error;
    }
  }
}

// Export singleton instance
export const adminService = new AdminService();
export default adminService;
