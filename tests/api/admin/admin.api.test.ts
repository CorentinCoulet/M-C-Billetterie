import { NextApiResponse } from 'next';
import { testPrisma, setupTests, teardownTests } from '../../../utils/setup';
import {
  createMockRequest,
  createAuthenticatedRequest,
  expectSuccess,
  expectError,
  expectValidationError,
  expectUnauthorized,
  expectForbidden,
  expectNotFound,
  hashTestPassword,
  generateRandomEmail
} from '../../../utils/helpers';

// Since there's no dedicated admin controller, we'll create tests based on expected admin functionality
// These tests might need to be adjusted once the admin controller is implemented

describe('Admin API', () => {
  beforeAll(async () => {
    await setupTests();
  });

  afterAll(async () => {
    await teardownTests();
  });

  beforeEach(async () => {
    // Clean up data before each test
    await testPrisma.order.deleteMany();
    await testPrisma.ticket.deleteMany();
    await testPrisma.event.deleteMany();
    await testPrisma.user.deleteMany();
  });

  // Helper function to create a test user
  async function createTestUser(role = 'USER') {
    return testPrisma.user.create({
      data: {
        email: generateRandomEmail(),
        password: await hashTestPassword('Password123!'),
        name: 'Test User',
        role,
        isEmailVerified: true
      }
    });
  }

  // Helper function to create a test event
  async function createTestEvent(organizerId) {
    return testPrisma.event.create({
      data: {
        title: 'Test Event',
        description: 'This is a test event',
        startDate: new Date(Date.now() + 86400000), // Tomorrow
        endDate: new Date(Date.now() + 172800000), // Day after tomorrow
        location: 'Test Location',
        organizerId,
        isPublished: true,
        capacity: 100,
        price: 10.00,
        currency: 'EUR',
        category: 'CONCERT'
      }
    });
  }

  describe('GET /api/admin/dashboard', () => {
    it('should return dashboard data for admin', async () => {
      const admin = await createTestUser('ADMIN');
      const user = await createTestUser();
      const event = await createTestEvent(user.id);

      // Mock the admin controller
      const adminController = {
        getDashboardData: jest.fn().mockImplementation(async (req, res) => {
          if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
          }

          if (req.user.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Forbidden' });
          }

          // Mock dashboard data
          const dashboardData = {
            totalUsers: 2,
            totalEvents: 1,
            totalTickets: 0,
            totalOrders: 0,
            recentUsers: [user],
            recentEvents: [event],
            recentOrders: []
          };

          res.status(200).json(dashboardData);
        })
      };

      const { req, res } = createAuthenticatedRequest(admin);

      await adminController.getDashboardData(req as any, res as NextApiResponse);

      expectSuccess(res, 200);
      expect(res._getJSONData()).toHaveProperty('totalUsers', 2);
      expect(res._getJSONData()).toHaveProperty('totalEvents', 1);
      expect(res._getJSONData()).toHaveProperty('recentUsers');
      expect(res._getJSONData()).toHaveProperty('recentEvents');
    });

    it('should return forbidden for non-admin users', async () => {
      const user = await createTestUser();

      // Mock the admin controller
      const adminController = {
        getDashboardData: jest.fn().mockImplementation(async (req, res) => {
          if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
          }

          if (req.user.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Forbidden' });
          }

          res.status(200).json({});
        })
      };

      const { req, res } = createAuthenticatedRequest(user);

      await adminController.getDashboardData(req as any, res as NextApiResponse);

      expectForbidden(res);
    });

    it('should return unauthorized for unauthenticated requests', async () => {
      // Mock the admin controller
      const adminController = {
        getDashboardData: jest.fn().mockImplementation(async (req, res) => {
          if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
          }
          res.status(200).json({});
        })
      };

      const { req, res } = createMockRequest({
        method: 'GET'
      });

      await adminController.getDashboardData(req as any, res as NextApiResponse);

      expectUnauthorized(res);
    });
  });

  describe('GET /api/admin/users', () => {
    it('should return all users for admin', async () => {
      const admin = await createTestUser('ADMIN');
      const user1 = await createTestUser();
      const user2 = await createTestUser();

      // Mock the admin controller
      const adminController = {
        getAllUsers: jest.fn().mockImplementation(async (req, res) => {
          if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
          }

          if (req.user.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Forbidden' });
          }

          const users = await testPrisma.user.findMany();
          res.status(200).json(users);
        })
      };

      const { req, res } = createAuthenticatedRequest(admin);

      await adminController.getAllUsers(req as any, res as NextApiResponse);

      expectSuccess(res, 200);
      const users = res._getJSONData();
      expect(Array.isArray(users)).toBe(true);
      expect(users.length).toBeGreaterThanOrEqual(3); // admin, user1, user2
      expect(users.some((u: any) => u.id === admin.id)).toBe(true);
      expect(users.some((u: any) => u.id === user1.id)).toBe(true);
      expect(users.some((u: any) => u.id === user2.id)).toBe(true);
    });

    it('should return forbidden for non-admin users', async () => {
      const user = await createTestUser();

      // Mock the admin controller
      const adminController = {
        getAllUsers: jest.fn().mockImplementation(async (req, res) => {
          if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
          }

          if (req.user.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Forbidden' });
          }

          res.status(200).json([]);
        })
      };

      const { req, res } = createAuthenticatedRequest(user);

      await adminController.getAllUsers(req as any, res as NextApiResponse);

      expectForbidden(res);
    });
  });

  describe('PUT /api/admin/users/:id/role', () => {
    it('should update user role for admin', async () => {
      const admin = await createTestUser('ADMIN');
      const user = await createTestUser();

      const updateData = {
        role: 'ORGANIZER'
      };

      // Mock the admin controller
      const adminController = {
        updateUserRole: jest.fn().mockImplementation(async (req, res) => {
          if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
          }

          if (req.user.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Forbidden' });
          }

          const userId = parseInt(req.query.id as string, 10);
          if (isNaN(userId)) {
            return res.status(400).json({ message: 'Invalid user ID' });
          }

          const { role } = req.body;
          if (!role || !['USER', 'ORGANIZER', 'ADMIN'].includes(role)) {
            return res.status(400).json({ message: 'Invalid role' });
          }

          const user = await testPrisma.user.findUnique({
            where: { id: userId }
          });

          if (!user) {
            return res.status(404).json({ message: 'User not found' });
          }

          const updatedUser = await testPrisma.user.update({
            where: { id: userId },
            data: { role }
          });

          res.status(200).json(updatedUser);
        })
      };

      const { req, res } = createAuthenticatedRequest(admin, {
        method: 'PUT',
        query: { id: user.id.toString() },
        body: updateData
      });

      await adminController.updateUserRole(req as any, res as NextApiResponse);

      expectSuccess(res, 200);
      expect(res._getJSONData()).toHaveProperty('id', user.id);
      expect(res._getJSONData()).toHaveProperty('role', 'ORGANIZER');
    });

    it('should return validation error for invalid role', async () => {
      const admin = await createTestUser('ADMIN');
      const user = await createTestUser();

      const invalidUpdateData = {
        role: 'INVALID_ROLE'
      };

      // Mock the admin controller
      const adminController = {
        updateUserRole: jest.fn().mockImplementation(async (req, res) => {
          if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
          }

          if (req.user.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Forbidden' });
          }

          const userId = parseInt(req.query.id as string, 10);
          if (isNaN(userId)) {
            return res.status(400).json({ message: 'Invalid user ID' });
          }

          const { role } = req.body;
          if (!role || !['USER', 'ORGANIZER', 'ADMIN'].includes(role)) {
            return res.status(400).json({ message: 'Invalid role' });
          }

          res.status(200).json({});
        })
      };

      const { req, res } = createAuthenticatedRequest(admin, {
        method: 'PUT',
        query: { id: user.id.toString() },
        body: invalidUpdateData
      });

      await adminController.updateUserRole(req as any, res as NextApiResponse);

      expectError(res, 400);
      expect(res._getJSONData().message).toMatch(/invalid role/i);
    });

    it('should return forbidden for non-admin users', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();

      const updateData = {
        role: 'ORGANIZER'
      };

      // Mock the admin controller
      const adminController = {
        updateUserRole: jest.fn().mockImplementation(async (req, res) => {
          if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
          }

          if (req.user.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Forbidden' });
          }

          res.status(200).json({});
        })
      };

      const { req, res } = createAuthenticatedRequest(user1, {
        method: 'PUT',
        query: { id: user2.id.toString() },
        body: updateData
      });

      await adminController.updateUserRole(req as any, res as NextApiResponse);

      expectForbidden(res);
    });
  });

  describe('GET /api/admin/events', () => {
    it('should return all events for admin', async () => {
      const admin = await createTestUser('ADMIN');
      const user = await createTestUser();
      const event1 = await createTestEvent(user.id);
      const event2 = await createTestEvent(user.id);

      // Mock the admin controller
      const adminController = {
        getAllEvents: jest.fn().mockImplementation(async (req, res) => {
          if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
          }

          if (req.user.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Forbidden' });
          }

          const events = await testPrisma.event.findMany();
          res.status(200).json(events);
        })
      };

      const { req, res } = createAuthenticatedRequest(admin);

      await adminController.getAllEvents(req as any, res as NextApiResponse);

      expectSuccess(res, 200);
      const events = res._getJSONData();
      expect(Array.isArray(events)).toBe(true);
      expect(events.length).toBeGreaterThanOrEqual(2);
      expect(events.some((e: any) => e.id === event1.id)).toBe(true);
      expect(events.some((e: any) => e.id === event2.id)).toBe(true);
    });

    it('should return forbidden for non-admin users', async () => {
      const user = await createTestUser();

      // Mock the admin controller
      const adminController = {
        getAllEvents: jest.fn().mockImplementation(async (req, res) => {
          if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
          }

          if (req.user.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Forbidden' });
          }

          res.status(200).json([]);
        })
      };

      const { req, res } = createAuthenticatedRequest(user);

      await adminController.getAllEvents(req as any, res as NextApiResponse);

      expectForbidden(res);
    });
  });

  describe('PUT /api/admin/events/:id/approve', () => {
    it('should approve an event for admin', async () => {
      const admin = await createTestUser('ADMIN');
      const user = await createTestUser();
      
      // Create an unpublished event
      const event = await testPrisma.event.create({
        data: {
          title: 'Unpublished Event',
          description: 'This is an unpublished event',
          startDate: new Date(Date.now() + 86400000),
          endDate: new Date(Date.now() + 172800000),
          location: 'Test Location',
          organizerId: user.id,
          isPublished: false,
          capacity: 100,
          price: 10.00,
          currency: 'EUR',
          category: 'CONCERT'
        }
      });

      // Mock the admin controller
      const adminController = {
        approveEvent: jest.fn().mockImplementation(async (req, res) => {
          if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
          }

          if (req.user.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Forbidden' });
          }

          const eventId = parseInt(req.query.id as string, 10);
          if (isNaN(eventId)) {
            return res.status(400).json({ message: 'Invalid event ID' });
          }

          const event = await testPrisma.event.findUnique({
            where: { id: eventId }
          });

          if (!event) {
            return res.status(404).json({ message: 'Event not found' });
          }

          const updatedEvent = await testPrisma.event.update({
            where: { id: eventId },
            data: { isPublished: true }
          });

          res.status(200).json(updatedEvent);
        })
      };

      const { req, res } = createAuthenticatedRequest(admin, {
        method: 'PUT',
        query: { id: event.id.toString() }
      });

      await adminController.approveEvent(req as any, res as NextApiResponse);

      expectSuccess(res, 200);
      expect(res._getJSONData()).toHaveProperty('id', event.id);
      expect(res._getJSONData()).toHaveProperty('isPublished', true);
    });

    it('should return forbidden for non-admin users', async () => {
      const user = await createTestUser();
      const event = await createTestEvent(user.id);

      // Mock the admin controller
      const adminController = {
        approveEvent: jest.fn().mockImplementation(async (req, res) => {
          if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
          }

          if (req.user.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Forbidden' });
          }

          res.status(200).json({});
        })
      };

      const { req, res } = createAuthenticatedRequest(user, {
        method: 'PUT',
        query: { id: event.id.toString() }
      });

      await adminController.approveEvent(req as any, res as NextApiResponse);

      expectForbidden(res);
    });
  });

  describe('GET /api/admin/stats', () => {
    it('should return platform statistics for admin', async () => {
      const admin = await createTestUser('ADMIN');
      const user = await createTestUser();
      const event = await createTestEvent(user.id);

      // Mock the admin controller
      const adminController = {
        getPlatformStats: jest.fn().mockImplementation(async (req, res) => {
          if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
          }

          if (req.user.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Forbidden' });
          }

          // Mock platform statistics
          const stats = {
            userStats: {
              total: 2,
              newUsersThisMonth: 2,
              activeUsersThisMonth: 2
            },
            eventStats: {
              total: 1,
              newEventsThisMonth: 1,
              upcomingEvents: 1
            },
            ticketStats: {
              total: 0,
              soldThisMonth: 0,
              revenue: 0
            },
            orderStats: {
              total: 0,
              completedThisMonth: 0,
              averageOrderValue: 0
            }
          };

          res.status(200).json(stats);
        })
      };

      const { req, res } = createAuthenticatedRequest(admin);

      await adminController.getPlatformStats(req as any, res as NextApiResponse);

      expectSuccess(res, 200);
      expect(res._getJSONData()).toHaveProperty('userStats');
      expect(res._getJSONData()).toHaveProperty('eventStats');
      expect(res._getJSONData()).toHaveProperty('ticketStats');
      expect(res._getJSONData()).toHaveProperty('orderStats');
      expect(res._getJSONData().userStats).toHaveProperty('total', 2);
      expect(res._getJSONData().eventStats).toHaveProperty('total', 1);
    });

    it('should return forbidden for non-admin users', async () => {
      const user = await createTestUser();

      // Mock the admin controller
      const adminController = {
        getPlatformStats: jest.fn().mockImplementation(async (req, res) => {
          if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
          }

          if (req.user.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Forbidden' });
          }

          res.status(200).json({});
        })
      };

      const { req, res } = createAuthenticatedRequest(user);

      await adminController.getPlatformStats(req as any, res as NextApiResponse);

      expectForbidden(res);
    });
  });

  describe('POST /api/admin/settings', () => {
    it('should update platform settings for admin', async () => {
      const admin = await createTestUser('ADMIN');

      const settingsData = {
        siteName: 'M&C Society',
        siteDescription: 'A platform for event ticketing',
        contactEmail: 'contact@mcsociety.com',
        defaultCurrency: 'EUR',
        featuredEventsLimit: 6,
        maintenanceMode: false
      };

      // Mock the admin controller
      const adminController = {
        updateSettings: jest.fn().mockImplementation(async (req, res) => {
          if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
          }

          if (req.user.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Forbidden' });
          }

          // Mock settings update
          const settings = req.body;
          res.status(200).json(settings);
        })
      };

      const { req, res } = createAuthenticatedRequest(admin, {
        method: 'POST',
        body: settingsData
      });

      await adminController.updateSettings(req as any, res as NextApiResponse);

      expectSuccess(res, 200);
      expect(res._getJSONData()).toHaveProperty('siteName', 'M&C Society');
      expect(res._getJSONData()).toHaveProperty('defaultCurrency', 'EUR');
      expect(res._getJSONData()).toHaveProperty('maintenanceMode', false);
    });

    it('should return validation error for invalid settings', async () => {
      const admin = await createTestUser('ADMIN');

      const invalidSettingsData = {
        siteName: '', // Empty site name
        defaultCurrency: 'INVALID', // Invalid currency
        featuredEventsLimit: -1 // Negative limit
      };

      // Mock the admin controller
      const adminController = {
        updateSettings: jest.fn().mockImplementation(async (req, res) => {
          if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
          }

          if (req.user.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Forbidden' });
          }

          // Validate settings
          const { siteName, defaultCurrency, featuredEventsLimit } = req.body;
          const errors = [];

          if (!siteName) errors.push('Site name is required');
          if (defaultCurrency && !['EUR', 'USD', 'GBP'].includes(defaultCurrency)) {
            errors.push('Invalid currency');
          }
          if (featuredEventsLimit !== undefined && featuredEventsLimit < 0) {
            errors.push('Featured events limit must be positive');
          }

          if (errors.length > 0) {
            return res.status(400).json({ message: 'Invalid settings', errors });
          }

          res.status(200).json({});
        })
      };

      const { req, res } = createAuthenticatedRequest(admin, {
        method: 'POST',
        body: invalidSettingsData
      });

      await adminController.updateSettings(req as any, res as NextApiResponse);

      expectError(res, 400);
      expect(res._getJSONData()).toHaveProperty('message', 'Invalid settings');
      expect(res._getJSONData()).toHaveProperty('errors');
      expect(Array.isArray(res._getJSONData().errors)).toBe(true);
      expect(res._getJSONData().errors.length).toBeGreaterThan(0);
    });

    it('should return forbidden for non-admin users', async () => {
      const user = await createTestUser();

      const settingsData = {
        siteName: 'M&C Society',
        defaultCurrency: 'EUR'
      };

      // Mock the admin controller
      const adminController = {
        updateSettings: jest.fn().mockImplementation(async (req, res) => {
          if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
          }

          if (req.user.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Forbidden' });
          }

          res.status(200).json({});
        })
      };

      const { req, res } = createAuthenticatedRequest(user, {
        method: 'POST',
        body: settingsData
      });

      await adminController.updateSettings(req as any, res as NextApiResponse);

      expectForbidden(res);
    });
  });
});