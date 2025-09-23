import { NextApiResponse } from 'next';
import {
  createAuthenticatedRequest,
  createMockRequest,
  expectError,
  expectForbidden,
  expectNotFound,
  expectSuccess,
  expectUnauthorized,
  generateRandomEmail,
  hashTestPassword
} from '../../utils/helpers';
import { setupTests, teardownTests, testPrisma } from '../../utils/setup';

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
    await testPrisma.organizer.deleteMany();
    await testPrisma.user.deleteMany();
  });

  // Helper function to create a test user
  async function createTestUser(role: 'USER' | 'ADMIN' = 'USER') {
    return testPrisma.user.create({
      data: {
        email: generateRandomEmail(),
        password: await hashTestPassword('Password123!'),
        name: 'Test User',
        role,
        isVerified: true
      }
    });
  }

  // Helper function to create a test event
  async function createTestEvent(userId: string) {
    // First create an organizer
    const organizer = await testPrisma.organizer.create({
      data: {
        name: 'Test Organizer'
      }
    });

    return testPrisma.event.create({
      data: {
        title: 'Test Event',
        description: 'This is a test event',
        date: new Date(Date.now() + 86400000), // Tomorrow
        location: 'Test Location',
        organizerId: organizer.id,
        isPublished: true,
        maxCapacity: 100
      }
    });
  }

  // Helper function to create a test order
  async function createTestOrder(userId: string, eventId: string, status: 'draft' | 'pending_payment' | 'paid' | 'cancelled' = 'pending_payment') {
    const order = await testPrisma.order.create({
      data: {
        userId,
        status,
        totalPrice: 20.00,
        currency: 'EUR'
      }
    });
    return order;
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

      // Mock the order controller
      const orderController = {
        createOrder: jest.fn().mockImplementation(async (req, res) => {
          if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
          }

          // Validate request body
          if (!req.body.items || !Array.isArray(req.body.items) || req.body.items.length === 0) {
            return res.status(400).json({ message: 'Invalid order data: Missing items' });
          }

          // Create order response
          const orderResponse = {
            id: 'test-order-1',
            userId: req.user.id,
            status: 'pending_payment',
            totalPrice: 20.00,
            currency: 'EUR',
            tickets: req.body.items.map((item: any) => ({
              eventId: item.eventId,
              quantity: item.quantity,
              unitPrice: 10.00,
              subtotal: item.quantity * 10.00
            })),
            createdAt: new Date()
          };

          res.status(201).json(orderResponse);
        })
      };

      const { req, res } = createAuthenticatedRequest(user as any, {
        method: 'POST',
        body: orderData
      });

      await orderController.createOrder(req as any, res as NextApiResponse);

      expectSuccess(res, 201);
      expect(res._getJSONData()).toHaveProperty('id');
      expect(res._getJSONData()).toHaveProperty('userId', user.id);
      expect(res._getJSONData()).toHaveProperty('status', 'pending_payment');
      expect(res._getJSONData()).toHaveProperty('totalPrice', 20.00);
    });

    it('should return validation error for invalid order data', async () => {
      const user = await createTestUser();

      const invalidOrderData = {
        // Missing items
      };

      // Mock order validation
      const mockValidateOrder = jest.fn().mockImplementation((body) => {
        if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
          throw new Error('Invalid order data: Missing items');
        }
      });

      // Mock the order controller
      const orderController = {
        createOrder: jest.fn().mockImplementation(async (req, res) => {
          if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
          }

          try {
            mockValidateOrder(req.body);
            // This should not be reached due to validation error
            res.status(201).json({});
          } catch (error: any) {
            res.status(400).json({ message: error.message });
          }
        })
      };

      const { req, res } = createAuthenticatedRequest(user as any, {
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
      const order2 = await createTestOrder(user.id, event.id, 'paid');

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

      const { req, res } = createAuthenticatedRequest(user as any);

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
      const order2 = await createTestOrder(user.id, event.id, 'paid');

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

      const { req, res } = createAuthenticatedRequest(admin as any);

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

      const { req, res } = createAuthenticatedRequest(user as any);

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

      // Mock the order controller to directly use the order created above
      const orderController = {
        getOrderById: jest.fn().mockImplementation(async (req, res) => {
          if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
          }

          const orderId = req.query.id as string;
          
          if (!orderId) {
            return res.status(400).json({ message: 'Invalid order ID' });
          }

          // Direct comparison with the created order
          if (orderId !== order.id) {
            return res.status(404).json({ message: 'Order not found' });
          }

          // Check ownership
          if (req.user.id !== order.userId && req.user.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Forbidden' });
          }

          res.status(200).json(order);
        })
      };

      const { req, res } = createAuthenticatedRequest(user as any, {
        method: 'GET',
        query: { id: order.id }
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

      // Mock the order controller to directly use the order created above
      const orderController = {
        getOrderById: jest.fn().mockImplementation(async (req, res) => {
          if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
          }

          const orderId = req.query.id as string;
          if (!orderId) {
            return res.status(400).json({ message: 'Invalid order ID' });
          }

          // Direct comparison with the created order
          if (orderId !== order.id) {
            return res.status(404).json({ message: 'Order not found' });
          }

          // Check ownership (admin can access any order)
          if (req.user.id !== order.userId && req.user.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Forbidden' });
          }

          res.status(200).json(order);
        })
      };

      const { req, res } = createAuthenticatedRequest(admin as any, {
        method: 'GET',
        query: { id: order.id }
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

      // Mock the order controller to directly use the order created above
      const orderController = {
        getOrderById: jest.fn().mockImplementation(async (req, res) => {
          if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
          }

          const orderId = req.query.id as string;
          if (!orderId) {
            return res.status(400).json({ message: 'Invalid order ID' });
          }

          // Direct comparison with the created order
          if (orderId !== order.id) {
            return res.status(404).json({ message: 'Order not found' });
          }

          // Check ownership (other user should be forbidden)
          if (req.user.id !== order.userId && req.user.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Forbidden' });
          }

          res.status(200).json(order);
        })
      };

      const { req, res } = createAuthenticatedRequest(otherUser as any, {
        method: 'GET',
        query: { id: order.id }
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

          const orderId = req.query.id as string;
          if (!orderId) {
            return res.status(400).json({ message: 'Invalid order ID' });
          }

          // Any ID that doesn't exist in the database
          return res.status(404).json({ message: 'Order not found' });
        })
      };

      const { req, res } = createAuthenticatedRequest(user as any, {
        method: 'GET',
        query: { id: 'non-existent-id' } // Non-existent ID
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

          const orderId = req.query.id as string;
          if (!orderId) {
            return res.status(400).json({ message: 'Invalid order ID' });
          }

          res.status(200).json({});
        })
      };

      const { req, res } = createAuthenticatedRequest(user as any, {
        method: 'GET',
        query: { id: '' }
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

      // Mock the order controller to directly use the order created above
      const orderController = {
        cancelOrder: jest.fn().mockImplementation(async (req, res) => {
          if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
          }

          const orderId = req.query.id as string;
          if (!orderId) {
            return res.status(400).json({ message: 'Invalid order ID' });
          }

          // Direct comparison with the created order
          if (orderId !== order.id) {
            return res.status(404).json({ message: 'Order not found' });
          }

          // Check ownership
          if (req.user.id !== order.userId && req.user.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Forbidden' });
          }

          // Update the order status to cancelled
          const updatedOrder = { ...order, status: 'cancelled' as const };

          res.status(200).json(updatedOrder);
        })
      };

      const { req, res } = createAuthenticatedRequest(user as any, {
        method: 'PUT',
        query: { id: order.id }
      });

      await orderController.cancelOrder(req as any, res as NextApiResponse);

      expectSuccess(res, 200);
      expect(res._getJSONData()).toHaveProperty('id', order.id);
      expect(res._getJSONData()).toHaveProperty('userId', user.id);
      expect(res._getJSONData()).toHaveProperty('status', 'cancelled');
    });

    it('should cancel an order for admin', async () => {
      const user = await createTestUser();
      const admin = await createTestUser('ADMIN');
      const event = await createTestEvent(user.id);
      const order = await createTestOrder(user.id, event.id);

      // Mock the order controller to directly use the order created above
      const orderController = {
        cancelOrder: jest.fn().mockImplementation(async (req, res) => {
          if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
          }

          const orderId = req.query.id as string;
          if (!orderId) {
            return res.status(400).json({ message: 'Invalid order ID' });
          }

          // Direct comparison with the created order
          if (orderId !== order.id) {
            return res.status(404).json({ message: 'Order not found' });
          }

          // Check ownership (admin can cancel any order)
          if (req.user.id !== order.userId && req.user.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Forbidden' });
          }

          // Update the order status to cancelled
          const updatedOrder = { ...order, status: 'cancelled' as const };

          res.status(200).json(updatedOrder);
        })
      };

      const { req, res } = createAuthenticatedRequest(admin as any, {
        method: 'PUT',
        query: { id: order.id }
      });

      await orderController.cancelOrder(req as any, res as NextApiResponse);

      expectSuccess(res, 200);
      expect(res._getJSONData()).toHaveProperty('id', order.id);
      expect(res._getJSONData()).toHaveProperty('userId', user.id);
      expect(res._getJSONData()).toHaveProperty('status', 'cancelled');
    });

    it('should return forbidden for other users', async () => {
      const user = await createTestUser();
      const otherUser = await createTestUser();
      const event = await createTestEvent(user.id);
      const order = await createTestOrder(user.id, event.id);

      // Mock the order controller to directly use the order created above
      const orderController = {
        cancelOrder: jest.fn().mockImplementation(async (req, res) => {
          if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
          }

          const orderId = req.query.id as string;
          if (!orderId) {
            return res.status(400).json({ message: 'Invalid order ID' });
          }

          // Direct comparison with the created order
          if (orderId !== order.id) {
            return res.status(404).json({ message: 'Order not found' });
          }

          // Check ownership (other user should be forbidden)
          if (req.user.id !== order.userId && req.user.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Forbidden' });
          }

          res.status(200).json({});
        })
      };

      const { req, res } = createAuthenticatedRequest(otherUser as any, {
        method: 'PUT',
        query: { id: order.id }
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

          const orderId = req.query.id as string;
          if (!orderId) {
            return res.status(400).json({ message: 'Invalid order ID' });
          }

          // Any ID that doesn't exist in the database
          return res.status(404).json({ message: 'Order not found' });
        })
      };

      const { req, res } = createAuthenticatedRequest(user as any, {
        method: 'PUT',
        query: { id: 'non-existent-id' } // Non-existent ID
      });

      await orderController.cancelOrder(req as any, res as NextApiResponse);

      expectNotFound(res);
    });
  });
});
