import { DashboardService } from '../../../src/services/dashboard.service';
import { UserRole } from '../../../src/types/enums/user.enum';
import {
    generateRandomEmail,
    hashTestPassword,
} from '../../utils/helpers';
import { setupTests, teardownTests, testPrisma } from '../../utils/setup';

// Mock prisma to use testPrisma
jest.mock('../../../src/lib/prisma', () => ({
  __esModule: true,
  default: require('../../utils/setup').testPrisma,
}));

describe('Dashboard API (Service Layer)', () => {
  beforeAll(async () => {
    await setupTests();
  });

  afterAll(async () => {
    await teardownTests();
  });

  beforeEach(async () => {
    await testPrisma.user.deleteMany();
    await testPrisma.order.deleteMany();
    await testPrisma.ticket.deleteMany();
    await testPrisma.event.deleteMany();
    await testPrisma.organizer.deleteMany();
  });

  describe('getDashboardStats - User Stats', () => {
    it('should return stats for USER role', async () => {
      const email = generateRandomEmail();
      const user = await testPrisma.user.create({
        data: {
          email,
          password: await hashTestPassword('Password123!'),
          name: 'Test User',
          role: UserRole.USER,
          isVerified: true,
        },
      });

      const stats = await DashboardService.getDashboardStats(user.id, UserRole.USER);

      expect(stats).toHaveProperty('totalTickets');
      expect(stats).toHaveProperty('recentOrders');
      expect(typeof stats.totalTickets).toBe('number');
      expect(typeof stats.recentOrders).toBe('number');
    });

    it('should return stats for ORGANIZER role (with no team)', async () => {
      const email = generateRandomEmail();
      const user = await testPrisma.user.create({
        data: {
          email,
          password: await hashTestPassword('Password123!'),
          name: 'Test Organizer',
          role: UserRole.ORGANIZER,
          isVerified: true,
        },
      });

      // User has no team/organizer, should return empty stats
      const stats = await DashboardService.getDashboardStats(user.id, UserRole.ORGANIZER);

      expect(stats).toHaveProperty('totalEvents');
      expect(stats).toHaveProperty('totalRevenue');
      expect(stats).toHaveProperty('totalParticipants');
      expect(stats).toHaveProperty('activeEvents');
      expect(stats.totalEvents).toBe(0);
      expect(stats.totalRevenue).toBe(0);
    });

    it('should return stats for ADMIN role', async () => {
      const email = generateRandomEmail();
      const user = await testPrisma.user.create({
        data: {
          email,
          password: await hashTestPassword('Password123!'),
          name: 'Test Admin',
          role: UserRole.ADMIN,
          isVerified: true,
        },
      });

      const stats = await DashboardService.getDashboardStats(user.id, UserRole.ADMIN);

      expect(stats).toHaveProperty('totalUsers');
      expect(stats).toHaveProperty('platformRevenue');
      expect(stats).toHaveProperty('systemHealth');
      expect(stats).toHaveProperty('securityAlerts');
      expect(typeof stats.totalUsers).toBe('number');
      expect(typeof stats.platformRevenue).toBe('number');
    });

    it('should handle user with no data gracefully', async () => {
      const email = generateRandomEmail();
      const user = await testPrisma.user.create({
        data: {
          email,
          password: await hashTestPassword('Password123!'),
          name: 'Test User Empty',
          role: UserRole.USER,
          isVerified: true,
        },
      });

      const stats = await DashboardService.getDashboardStats(user.id, UserRole.USER);

      expect(stats.totalTickets).toBe(0);
      expect(stats.recentOrders).toBe(0);
    });
  });

  describe('getRecentActivities', () => {
    it('should return activities for USER role', async () => {
      const email = generateRandomEmail();
      const user = await testPrisma.user.create({
        data: {
          email,
          password: await hashTestPassword('Password123!'),
          name: 'Test User',
          role: UserRole.USER,
          isVerified: true,
        },
      });

      const activities = await DashboardService.getRecentActivities(user.id, UserRole.USER);

      expect(Array.isArray(activities)).toBe(true);
      expect(activities.length).toBeGreaterThanOrEqual(0);
    });

    it('should return activities for ORGANIZER role (with no team)', async () => {
      const email = generateRandomEmail();
      const user = await testPrisma.user.create({
        data: {
          email,
          password: await hashTestPassword('Password123!'),
          name: 'Test Organizer',
          role: UserRole.ORGANIZER,
          isVerified: true,
        },
      });

      // User has no team, should return empty activities
      const activities = await DashboardService.getRecentActivities(user.id, UserRole.ORGANIZER);

      expect(Array.isArray(activities)).toBe(true);
      expect(activities).toHaveLength(0);
    });

    it('should return activities for ADMIN role (with no events)', async () => {
      const email = generateRandomEmail();
      const user = await testPrisma.user.create({
        data: {
          email,
          password: await hashTestPassword('Password123!'),
          name: 'Test Admin',
          role: UserRole.ADMIN,
          isVerified: true,
        },
      });

      // No events created, should return empty activities
      const activities = await DashboardService.getRecentActivities(user.id, UserRole.ADMIN);

      expect(Array.isArray(activities)).toBe(true);
      expect(activities).toHaveLength(0);
    });
  });
});
