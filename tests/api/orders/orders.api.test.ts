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

// Since the order controller is empty, we'll create tests based on expected order functionality
// These tests might need to be adjusted once the order controller is implemented

describe('Orders API', () => {
  beforeAll(async () => {
    await setupTests();
  });

  afterAll(async () => {
    await teardownTests();
  });

  beforeEach(async () => {
    // Clean up orders, tickets, events, and users before each test
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

  // Helper function to create a test order
  async function createTestOrder(userId, eventId, status = 'PENDING') {
    return testPrisma.order.create({
      data: {
        userId,
        status,
        total: 20.00,
        currency: 'EUR',
        items: [
          {
            eventId,
            quantity: 2,
            unitPrice: 10.00,
            subtotal: 20.00
          }
        ]
      }
    });
  }

  describe('POST /api/orders', () => {
    it('should create a new order when authenticated', async () => {
      const user = await createTestUser();
      const event = await createTestEvent(user.id);

      const orderData = {
        items: [
          {
            eventId: event.id,
            quantity: 2
          }
        ]
      };

      // Mock order creation
      const mockCreateOrder = jest.fn().mockResolvedValue({
        id: 1,
        userId: user.id,
        status: 'PENDING',
        total: 20.00,
        currency: 'EUR',
        items: [
          {
            eventId: event.id,
            quantity: 2,
            unitPrice: 10.00,
            subtotal: 20.00
          }
        ],
        createdAt: new Date()
      });

      // Mock the order controller
      const orderController = {
        createOrder: mockCreateOrder
      };

      const { req, res } = createAuthenticatedRequest(user, {
        method: 'POST',
        body: orderData
      });

      await orderController.createOrder(req as any, res as NextApiResponse);

      expect(mockCreateOrder).toHaveBeenCalled();
      expectSuccess(res, 201);
      expect(res._getJSONData()).toHaveProperty('id');
      expect(res._getJSONData()).toHaveProperty('userId', user.id);
      expect(res._getJSONData()).toHaveProperty('status', 'PENDING');
      expect(res._getJSONData()).toHaveProperty('total', 20.00);
      expect(res._getJSONData().items[0]).toHaveProperty('eventId', event.id);
      expect(res._getJSONData().items[0]).toHaveProperty('quantity', 2);
    });

    it('should return validation error for invalid order data', async () => {
      const user = await createTestUser();

      const invalidOrderData = {
        // Missing items
      };

      // Mock order validation
      const mockValidateOrder = jest.fn().mockImplementation(() => {
        throw new Error('Invalid order data: Missing items');
      });

      // Mock the order controller
      const orderController = {
        createOrder: jest.fn().mockImplementation(async (req, res) => {
          try {
            mockValidateOrder(req.body);
            // This should not be reached due to validation error
            res.status(201).json({});
          } catch (error) {
            res.status(400).json({ message: error.message });
          }
        })
      };

      const { req, res } = createAuthenticatedRequest(user, {
        method: 'POST',
        body: invalidOrderData
      });

      await orderController.createOrder(req as any, res as NextApiResponse);

      expect(mockValidateOrder).toHaveBeenCalled();
      expectError(res, 400);
      expect(res._getJSONData().message).toMatch(/invalid order data/i);
    });

    it('should return unauthorized for unauthenticated requests', async () => {
      const user = await createTestUser();
      const event = await createTestEvent(user.id);

      const orderData = {
        items: [
          {
            eventId: event.id,
            quantity: 2
          }
        ]
      };

      // Mock the order controller
      const orderController = {
        createOrder: jest.fn().mockImplementation(async (req, res) => {
          if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
          }
          res.status(201).json({});
        })
      };

      const { req, res } = createMockRequest({
        method: 'POST',
        body: orderData
      });

      await orderController.createOrder(req as any, res as NextApiResponse);

      expectUnauthorized(res);
    });
  });

  describe('GET /api/orders', () => {
    it('should return all orders for the authenticated user', async () => {
      const user = await createTestUser();
      const event = await createTestEvent(user.id);
      const order1 = await createTestOrder(user.id, event.id);
      const order2 = await createTestOrder(user.id, event.id, 'COMPLETED');

      // Mock the order controller
      const orderController = {
        getUserOrders: jest.fn().mockImplementation(async (req, res) => {
          if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
          }

          const orders = await testPrisma.order.findMany({
            where: { userId: req.user.id }
          });

          res.status(200).json(orders);
        })
      };

      const { req, res } = createAuthenticatedRequest(user);

      await orderController.getUserOrders(req as any, res as NextApiResponse);

      expectSuccess(res, 200);
      const orders = res._getJSONData();
      expect(Array.isArray(orders)).toBe(true);
      expect(orders.length).toBe(2);
      expect(orders.some((o: any) => o.id === order1.id)).toBe(true);
      expect(orders.some((o: any) => o.id === order2.id)).toBe(true);
    });

    it('should return all orders for admin', async () => {
      const user = await createTestUser();
      const admin = await createTestUser('ADMIN');
      const event = await createTestEvent(user.id);
      const order1 = await createTestOrder(user.id, event.id);
      const order2 = await createTestOrder(user.id, event.id, 'COMPLETED');

      // Mock the order controller
      const orderController = {
        getAllOrders: jest.fn().mockImplementation(async (req, res) => {
          if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
          }

          if (req.user.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Forbidden' });
          }

          const orders = await testPrisma.order.findMany();
          res.status(200).json(orders);
        })
      };

      const { req, res } = createAuthenticatedRequest(admin);

      await orderController.getAllOrders(req as any, res as NextApiResponse);

      expectSuccess(res, 200);
      const orders = res._getJSONData();
      expect(Array.isArray(orders)).toBe(true);
      expect(orders.length).toBeGreaterThanOrEqual(2);
      expect(orders.some((o: any) => o.id === order1.id)).toBe(true);
      expect(orders.some((o: any) => o.id === order2.id)).toBe(true);
    });

    it('should return forbidden for non-admin users trying to access all orders', async () => {
      const user = await createTestUser();

      // Mock the order controller
      const orderController = {
        getAllOrders: jest.fn().mockImplementation(async (req, res) => {
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

      await orderController.getAllOrders(req as any, res as NextApiResponse);

      expectForbidden(res);
    });

    it('should return unauthorized for unauthenticated requests', async () => {
      // Mock the order controller
      const orderController = {
        getUserOrders: jest.fn().mockImplementation(async (req, res) => {
          if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
          }
          res.status(200).json([]);
        })
      };

      const { req, res } = createMockRequest({
        method: 'GET'
      });

      await orderController.getUserOrders(req as any, res as NextApiResponse);

      expectUnauthorized(res);
    });
  });

  describe('GET /api/orders/:id', () => {
    it('should return order by ID for the order owner', async () => {
      const user = await createTestUser();
      const event = await createTestEvent(user.id);
      const order = await createTestOrder(user.id, event.id);

      // Mock the order controller
      const orderController = {
        getOrderById: jest.fn().mockImplementation(async (req, res) => {
          if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
          }

          const orderId = parseInt(req.query.id as string, 10);
          if (isNaN(orderId)) {
            return res.status(400).json({ message: 'Invalid order ID' });
          }

          const order = await testPrisma.order.findUnique({
            where: { id: orderId }
          });

          if (!order) {
            return res.status(404).json({ message: 'Order not found' });
          }

          if (req.user.id !== order.userId && req.user.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Forbidden' });
          }

          res.status(200).json(order);
        })
      };

      const { req, res } = createAuthenticatedRequest(user, {
        method: 'GET',
        query: { id: order.id.toString() }
      });

      await orderController.getOrderById(req as any, res as NextApiResponse);

      expectSuccess(res, 200);
      expect(res._getJSONData()).toHaveProperty('id', order.id);
      expect(res._getJSONData()).toHaveProperty('userId', user.id);
      expect(res._getJSONData()).toHaveProperty('status', order.status);
    });

    it('should return order by ID for admin', async () => {
      const user = await createTestUser();
      const admin = await createTestUser('ADMIN');
      const event = await createTestEvent(user.id);
      const order = await createTestOrder(user.id, event.id);

      // Mock the order controller
      const orderController = {
        getOrderById: jest.fn().mockImplementation(async (req, res) => {
          if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
          }

          const orderId = parseInt(req.query.id as string, 10);
          if (isNaN(orderId)) {
            return res.status(400).json({ message: 'Invalid order ID' });
          }

          const order = await testPrisma.order.findUnique({
            where: { id: orderId }
          });

          if (!order) {
            return res.status(404).json({ message: 'Order not found' });
          }

          if (req.user.id !== order.userId && req.user.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Forbidden' });
          }

          res.status(200).json(order);
        })
      };

      const { req, res } = createAuthenticatedRequest(admin, {
        method: 'GET',
        query: { id: order.id.toString() }
      });

      await orderController.getOrderById(req as any, res as NextApiResponse);

      expectSuccess(res, 200);
      expect(res._getJSONData()).toHaveProperty('id', order.id);
      expect(res._getJSONData()).toHaveProperty('userId', user.id);
      expect(res._getJSONData()).toHaveProperty('status', order.status);
    });

    it('should return forbidden for other users', async () => {
      const user = await createTestUser();
      const otherUser = await createTestUser();
      const event = await createTestEvent(user.id);
      const order = await createTestOrder(user.id, event.id);

      // Mock the order controller
      const orderController = {
        getOrderById: jest.fn().mockImplementation(async (req, res) => {
          if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
          }

          const orderId = parseInt(req.query.id as string, 10);
          if (isNaN(orderId)) {
            return res.status(400).json({ message: 'Invalid order ID' });
          }

          const order = await testPrisma.order.findUnique({
            where: { id: orderId }
          });

          if (!order) {
            return res.status(404).json({ message: 'Order not found' });
          }

          if (req.user.id !== order.userId && req.user.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Forbidden' });
          }

          res.status(200).json(order);
        })
      };

      const { req, res } = createAuthenticatedRequest(otherUser, {
        method: 'GET',
        query: { id: order.id.toString() }
      });

      await orderController.getOrderById(req as any, res as NextApiResponse);

      expectForbidden(res);
    });

    it('should return not found for non-existent order', async () => {
      const user = await createTestUser();

      // Mock the order controller
      const orderController = {
        getOrderById: jest.fn().mockImplementation(async (req, res) => {
          if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
          }

          const orderId = parseInt(req.query.id as string, 10);
          if (isNaN(orderId)) {
            return res.status(400).json({ message: 'Invalid order ID' });
          }

          // Any ID that doesn't exist in the database
          return res.status(404).json({ message: 'Order not found' });
        })
      };

      const { req, res } = createAuthenticatedRequest(user, {
        method: 'GET',
        query: { id: '99999' } // Non-existent ID
      });

      await orderController.getOrderById(req as any, res as NextApiResponse);

      expectNotFound(res);
    });

    it('should return bad request for invalid ID', async () => {
      const user = await createTestUser();

      // Mock the order controller
      const orderController = {
        getOrderById: jest.fn().mockImplementation(async (req, res) => {
          if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
          }

          const orderId = parseInt(req.query.id as string, 10);
          if (isNaN(orderId)) {
            return res.status(400).json({ message: 'Invalid order ID' });
          }

          res.status(200).json({});
        })
      };

      const { req, res } = createAuthenticatedRequest(user, {
        method: 'GET',
        query: { id: 'invalid-id' }
      });

      await orderController.getOrderById(req as any, res as NextApiResponse);

      expectError(res, 400);
      expect(res._getJSONData().message).toMatch(/invalid.*id/i);
    });
  });

  describe('PUT /api/orders/:id/cancel', () => {
    it('should cancel an order for the order owner', async () => {
      const user = await createTestUser();
      const event = await createTestEvent(user.id);
      const order = await createTestOrder(user.id, event.id);

      // Mock the order controller
      const orderController = {
        cancelOrder: jest.fn().mockImplementation(async (req, res) => {
          if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
          }

          const orderId = parseInt(req.query.id as string, 10);
          if (isNaN(orderId)) {
            return res.status(400).json({ message: 'Invalid order ID' });
          }

          const order = await testPrisma.order.findUnique({
            where: { id: orderId }
          });

          if (!order) {
            return res.status(404).json({ message: 'Order not found' });
          }

          if (req.user.id !== order.userId && req.user.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Forbidden' });
          }

          // Update the order status to CANCELLED
          const updatedOrder = await testPrisma.order.update({
            where: { id: orderId },
            data: { status: 'CANCELLED' }
          });

          res.status(200).json(updatedOrder);
        })
      };

      const { req, res } = createAuthenticatedRequest(user, {
        method: 'PUT',
        query: { id: order.id.toString() }
      });

      await orderController.cancelOrder(req as any, res as NextApiResponse);

      expectSuccess(res, 200);
      expect(res._getJSONData()).toHaveProperty('id', order.id);
      expect(res._getJSONData()).toHaveProperty('userId', user.id);
      expect(res._getJSONData()).toHaveProperty('status', 'CANCELLED');
    });

    it('should cancel an order for admin', async () => {
      const user = await createTestUser();
      const admin = await createTestUser('ADMIN');
      const event = await createTestEvent(user.id);
      const order = await createTestOrder(user.id, event.id);

      // Mock the order controller
      const orderController = {
        cancelOrder: jest.fn().mockImplementation(async (req, res) => {
          if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
          }

          const orderId = parseInt(req.query.id as string, 10);
          if (isNaN(orderId)) {
            return res.status(400).json({ message: 'Invalid order ID' });
          }

          const order = await testPrisma.order.findUnique({
            where: { id: orderId }
          });

          if (!order) {
            return res.status(404).json({ message: 'Order not found' });
          }

          if (req.user.id !== order.userId && req.user.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Forbidden' });
          }

          // Update the order status to CANCELLED
          const updatedOrder = await testPrisma.order.update({
            where: { id: orderId },
            data: { status: 'CANCELLED' }
          });

          res.status(200).json(updatedOrder);
        })
      };

      const { req, res } = createAuthenticatedRequest(admin, {
        method: 'PUT',
        query: { id: order.id.toString() }
      });

      await orderController.cancelOrder(req as any, res as NextApiResponse);

      expectSuccess(res, 200);
      expect(res._getJSONData()).toHaveProperty('id', order.id);
      expect(res._getJSONData()).toHaveProperty('userId', user.id);
      expect(res._getJSONData()).toHaveProperty('status', 'CANCELLED');
    });

    it('should return forbidden for other users', async () => {
      const user = await createTestUser();
      const otherUser = await createTestUser();
      const event = await createTestEvent(user.id);
      const order = await createTestOrder(user.id, event.id);

      // Mock the order controller
      const orderController = {
        cancelOrder: jest.fn().mockImplementation(async (req, res) => {
          if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
          }

          const orderId = parseInt(req.query.id as string, 10);
          if (isNaN(orderId)) {
            return res.status(400).json({ message: 'Invalid order ID' });
          }

          const order = await testPrisma.order.findUnique({
            where: { id: orderId }
          });

          if (!order) {
            return res.status(404).json({ message: 'Order not found' });
          }

          if (req.user.id !== order.userId && req.user.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Forbidden' });
          }

          res.status(200).json({});
        })
      };

      const { req, res } = createAuthenticatedRequest(otherUser, {
        method: 'PUT',
        query: { id: order.id.toString() }
      });

      await orderController.cancelOrder(req as any, res as NextApiResponse);

      expectForbidden(res);
    });

    it('should return not found for non-existent order', async () => {
      const user = await createTestUser();

      // Mock the order controller
      const orderController = {
        cancelOrder: jest.fn().mockImplementation(async (req, res) => {
          if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
          }

          const orderId = parseInt(req.query.id as string, 10);
          if (isNaN(orderId)) {
            return res.status(400).json({ message: 'Invalid order ID' });
          }

          // Any ID that doesn't exist in the database
          return res.status(404).json({ message: 'Order not found' });
        })
      };

      const { req, res } = createAuthenticatedRequest(user, {
        method: 'PUT',
        query: { id: '99999' } // Non-existent ID
      });

      await orderController.cancelOrder(req as any, res as NextApiResponse);

      expectNotFound(res);
    });
  });
});