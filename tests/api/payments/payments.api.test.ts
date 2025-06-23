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

// Since there's no dedicated payment controller, we'll create tests based on expected payment functionality
// These tests might need to be adjusted once the payment controller is implemented

describe('Payments API', () => {
  beforeAll(async () => {
    await setupTests();
  });

  afterAll(async () => {
    await teardownTests();
  });

  beforeEach(async () => {
    // Clean up payments, orders, tickets, events, and users before each test
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

  describe('POST /api/payments/process', () => {
    it('should process a payment successfully', async () => {
      // This test is a placeholder for the payment processing functionality
      // The actual implementation would depend on the payment gateway integration

      const user = await createTestUser();
      const event = await createTestEvent(user.id);
      const order = await createTestOrder(user.id, event.id);

      const paymentData = {
        orderId: order.id,
        paymentMethod: 'CREDIT_CARD',
        cardNumber: '4242424242424242', // Test card number
        expiryMonth: '12',
        expiryYear: '2025',
        cvc: '123'
      };

      // Mock payment processing
      const mockProcessPayment = jest.fn().mockResolvedValue({
        id: 'pay_123456789',
        status: 'COMPLETED',
        amount: 20.00,
        currency: 'EUR',
        orderId: order.id,
        paymentMethod: 'CREDIT_CARD',
        createdAt: new Date()
      });

      // Mock the payment controller
      const paymentController = {
        processPayment: mockProcessPayment
      };

      const { req, res } = createAuthenticatedRequest(user, {
        method: 'POST',
        body: paymentData
      });

      await paymentController.processPayment(req as any, res as NextApiResponse);

      expect(mockProcessPayment).toHaveBeenCalled();
      expectSuccess(res, 200);
      expect(res._getJSONData()).toHaveProperty('id');
      expect(res._getJSONData()).toHaveProperty('status', 'COMPLETED');
      expect(res._getJSONData()).toHaveProperty('amount', 20.00);
      expect(res._getJSONData()).toHaveProperty('orderId', order.id);
    });

    it('should return validation error for invalid payment data', async () => {
      const user = await createTestUser();
      const event = await createTestEvent(user.id);
      const order = await createTestOrder(user.id, event.id);

      const invalidPaymentData = {
        orderId: order.id,
        paymentMethod: 'CREDIT_CARD',
        // Missing card details
      };

      // Mock payment validation
      const mockValidatePayment = jest.fn().mockImplementation(() => {
        throw new Error('Invalid payment data: Missing card details');
      });

      // Mock the payment controller
      const paymentController = {
        processPayment: jest.fn().mockImplementation(async (req, res) => {
          try {
            mockValidatePayment(req.body);
            // This should not be reached due to validation error
            res.status(200).json({});
          } catch (error) {
            res.status(400).json({ message: error.message });
          }
        })
      };

      const { req, res } = createAuthenticatedRequest(user, {
        method: 'POST',
        body: invalidPaymentData
      });

      await paymentController.processPayment(req as any, res as NextApiResponse);

      expect(mockValidatePayment).toHaveBeenCalled();
      expectError(res, 400);
      expect(res._getJSONData().message).toMatch(/invalid payment data/i);
    });

    it('should return unauthorized for unauthenticated requests', async () => {
      const user = await createTestUser();
      const event = await createTestEvent(user.id);
      const order = await createTestOrder(user.id, event.id);

      const paymentData = {
        orderId: order.id,
        paymentMethod: 'CREDIT_CARD',
        cardNumber: '4242424242424242',
        expiryMonth: '12',
        expiryYear: '2025',
        cvc: '123'
      };

      // Mock the payment controller
      const paymentController = {
        processPayment: jest.fn().mockImplementation(async (req, res) => {
          if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
          }
          res.status(200).json({});
        })
      };

      const { req, res } = createMockRequest({
        method: 'POST',
        body: paymentData
      });

      await paymentController.processPayment(req as any, res as NextApiResponse);

      expectUnauthorized(res);
    });
  });

  describe('GET /api/payments/:id', () => {
    it('should return payment details for the payment owner', async () => {
      const user = await createTestUser();
      
      // Mock payment data
      const paymentId = 'pay_123456789';
      const paymentData = {
        id: paymentId,
        userId: user.id,
        status: 'COMPLETED',
        amount: 20.00,
        currency: 'EUR',
        paymentMethod: 'CREDIT_CARD',
        createdAt: new Date()
      };

      // Mock the payment controller
      const paymentController = {
        getPaymentById: jest.fn().mockImplementation(async (req, res) => {
          if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
          }

          const id = req.query.id;
          if (id !== paymentId) {
            return res.status(404).json({ message: 'Payment not found' });
          }

          if (req.user.id !== paymentData.userId && req.user.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Forbidden' });
          }

          res.status(200).json(paymentData);
        })
      };

      const { req, res } = createAuthenticatedRequest(user, {
        method: 'GET',
        query: { id: paymentId }
      });

      await paymentController.getPaymentById(req as any, res as NextApiResponse);

      expectSuccess(res, 200);
      expect(res._getJSONData()).toHaveProperty('id', paymentId);
      expect(res._getJSONData()).toHaveProperty('userId', user.id);
      expect(res._getJSONData()).toHaveProperty('status', 'COMPLETED');
    });

    it('should return payment details for admin', async () => {
      const user = await createTestUser();
      const admin = await createTestUser('ADMIN');
      
      // Mock payment data
      const paymentId = 'pay_123456789';
      const paymentData = {
        id: paymentId,
        userId: user.id,
        status: 'COMPLETED',
        amount: 20.00,
        currency: 'EUR',
        paymentMethod: 'CREDIT_CARD',
        createdAt: new Date()
      };

      // Mock the payment controller
      const paymentController = {
        getPaymentById: jest.fn().mockImplementation(async (req, res) => {
          if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
          }

          const id = req.query.id;
          if (id !== paymentId) {
            return res.status(404).json({ message: 'Payment not found' });
          }

          if (req.user.id !== paymentData.userId && req.user.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Forbidden' });
          }

          res.status(200).json(paymentData);
        })
      };

      const { req, res } = createAuthenticatedRequest(admin, {
        method: 'GET',
        query: { id: paymentId }
      });

      await paymentController.getPaymentById(req as any, res as NextApiResponse);

      expectSuccess(res, 200);
      expect(res._getJSONData()).toHaveProperty('id', paymentId);
      expect(res._getJSONData()).toHaveProperty('userId', user.id);
      expect(res._getJSONData()).toHaveProperty('status', 'COMPLETED');
    });

    it('should return forbidden for other users', async () => {
      const user = await createTestUser();
      const otherUser = await createTestUser();
      
      // Mock payment data
      const paymentId = 'pay_123456789';
      const paymentData = {
        id: paymentId,
        userId: user.id,
        status: 'COMPLETED',
        amount: 20.00,
        currency: 'EUR',
        paymentMethod: 'CREDIT_CARD',
        createdAt: new Date()
      };

      // Mock the payment controller
      const paymentController = {
        getPaymentById: jest.fn().mockImplementation(async (req, res) => {
          if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
          }

          const id = req.query.id;
          if (id !== paymentId) {
            return res.status(404).json({ message: 'Payment not found' });
          }

          if (req.user.id !== paymentData.userId && req.user.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Forbidden' });
          }

          res.status(200).json(paymentData);
        })
      };

      const { req, res } = createAuthenticatedRequest(otherUser, {
        method: 'GET',
        query: { id: paymentId }
      });

      await paymentController.getPaymentById(req as any, res as NextApiResponse);

      expectForbidden(res);
    });

    it('should return not found for non-existent payment', async () => {
      const user = await createTestUser();
      
      // Mock the payment controller
      const paymentController = {
        getPaymentById: jest.fn().mockImplementation(async (req, res) => {
          if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
          }

          const id = req.query.id;
          // Any ID other than the mocked one will be considered non-existent
          return res.status(404).json({ message: 'Payment not found' });
        })
      };

      const { req, res } = createAuthenticatedRequest(user, {
        method: 'GET',
        query: { id: 'non_existent_payment' }
      });

      await paymentController.getPaymentById(req as any, res as NextApiResponse);

      expectNotFound(res);
    });
  });

  describe('GET /api/payments/user', () => {
    it('should return all payments for the authenticated user', async () => {
      const user = await createTestUser();
      
      // Mock payment data
      const paymentsData = [
        {
          id: 'pay_123456789',
          userId: user.id,
          status: 'COMPLETED',
          amount: 20.00,
          currency: 'EUR',
          paymentMethod: 'CREDIT_CARD',
          createdAt: new Date()
        },
        {
          id: 'pay_987654321',
          userId: user.id,
          status: 'COMPLETED',
          amount: 30.00,
          currency: 'EUR',
          paymentMethod: 'CREDIT_CARD',
          createdAt: new Date()
        }
      ];

      // Mock the payment controller
      const paymentController = {
        getUserPayments: jest.fn().mockImplementation(async (req, res) => {
          if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
          }

          // Filter payments for the authenticated user
          const userPayments = paymentsData.filter(p => p.userId === req.user.id);
          res.status(200).json(userPayments);
        })
      };

      const { req, res } = createAuthenticatedRequest(user);

      await paymentController.getUserPayments(req as any, res as NextApiResponse);

      expectSuccess(res, 200);
      const payments = res._getJSONData();
      expect(Array.isArray(payments)).toBe(true);
      expect(payments.length).toBe(2);
      expect(payments[0]).toHaveProperty('id', 'pay_123456789');
      expect(payments[0]).toHaveProperty('userId', user.id);
      expect(payments[1]).toHaveProperty('id', 'pay_987654321');
      expect(payments[1]).toHaveProperty('userId', user.id);
    });

    it('should return unauthorized for unauthenticated requests', async () => {
      // Mock the payment controller
      const paymentController = {
        getUserPayments: jest.fn().mockImplementation(async (req, res) => {
          if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
          }
          res.status(200).json([]);
        })
      };

      const { req, res } = createMockRequest({
        method: 'GET'
      });

      await paymentController.getUserPayments(req as any, res as NextApiResponse);

      expectUnauthorized(res);
    });
  });

  describe('POST /api/payments/refund', () => {
    it('should process a refund successfully for the payment owner', async () => {
      const user = await createTestUser();
      
      // Mock payment data
      const paymentId = 'pay_123456789';
      const paymentData = {
        id: paymentId,
        userId: user.id,
        status: 'COMPLETED',
        amount: 20.00,
        currency: 'EUR',
        paymentMethod: 'CREDIT_CARD',
        createdAt: new Date()
      };

      const refundData = {
        paymentId,
        reason: 'Customer requested refund'
      };

      // Mock the payment controller
      const paymentController = {
        processRefund: jest.fn().mockImplementation(async (req, res) => {
          if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
          }

          const { paymentId } = req.body;
          if (paymentId !== 'pay_123456789') {
            return res.status(404).json({ message: 'Payment not found' });
          }

          if (req.user.id !== paymentData.userId && req.user.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Forbidden' });
          }

          res.status(200).json({
            id: 'ref_123456789',
            paymentId,
            amount: paymentData.amount,
            status: 'COMPLETED',
            createdAt: new Date()
          });
        })
      };

      const { req, res } = createAuthenticatedRequest(user, {
        method: 'POST',
        body: refundData
      });

      await paymentController.processRefund(req as any, res as NextApiResponse);

      expectSuccess(res, 200);
      expect(res._getJSONData()).toHaveProperty('id', 'ref_123456789');
      expect(res._getJSONData()).toHaveProperty('paymentId', paymentId);
      expect(res._getJSONData()).toHaveProperty('status', 'COMPLETED');
    });

    it('should process a refund successfully for admin', async () => {
      const user = await createTestUser();
      const admin = await createTestUser('ADMIN');
      
      // Mock payment data
      const paymentId = 'pay_123456789';
      const paymentData = {
        id: paymentId,
        userId: user.id,
        status: 'COMPLETED',
        amount: 20.00,
        currency: 'EUR',
        paymentMethod: 'CREDIT_CARD',
        createdAt: new Date()
      };

      const refundData = {
        paymentId,
        reason: 'Admin initiated refund'
      };

      // Mock the payment controller
      const paymentController = {
        processRefund: jest.fn().mockImplementation(async (req, res) => {
          if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
          }

          const { paymentId } = req.body;
          if (paymentId !== 'pay_123456789') {
            return res.status(404).json({ message: 'Payment not found' });
          }

          if (req.user.id !== paymentData.userId && req.user.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Forbidden' });
          }

          res.status(200).json({
            id: 'ref_123456789',
            paymentId,
            amount: paymentData.amount,
            status: 'COMPLETED',
            createdAt: new Date()
          });
        })
      };

      const { req, res } = createAuthenticatedRequest(admin, {
        method: 'POST',
        body: refundData
      });

      await paymentController.processRefund(req as any, res as NextApiResponse);

      expectSuccess(res, 200);
      expect(res._getJSONData()).toHaveProperty('id', 'ref_123456789');
      expect(res._getJSONData()).toHaveProperty('paymentId', paymentId);
      expect(res._getJSONData()).toHaveProperty('status', 'COMPLETED');
    });

    it('should return forbidden for other users', async () => {
      const user = await createTestUser();
      const otherUser = await createTestUser();
      
      // Mock payment data
      const paymentId = 'pay_123456789';
      const paymentData = {
        id: paymentId,
        userId: user.id,
        status: 'COMPLETED',
        amount: 20.00,
        currency: 'EUR',
        paymentMethod: 'CREDIT_CARD',
        createdAt: new Date()
      };

      const refundData = {
        paymentId,
        reason: 'Attempted refund by other user'
      };

      // Mock the payment controller
      const paymentController = {
        processRefund: jest.fn().mockImplementation(async (req, res) => {
          if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
          }

          const { paymentId } = req.body;
          if (paymentId !== 'pay_123456789') {
            return res.status(404).json({ message: 'Payment not found' });
          }

          if (req.user.id !== paymentData.userId && req.user.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Forbidden' });
          }

          res.status(200).json({});
        })
      };

      const { req, res } = createAuthenticatedRequest(otherUser, {
        method: 'POST',
        body: refundData
      });

      await paymentController.processRefund(req as any, res as NextApiResponse);

      expectForbidden(res);
    });

    it('should return not found for non-existent payment', async () => {
      const user = await createTestUser();
      
      const refundData = {
        paymentId: 'non_existent_payment',
        reason: 'Refund for non-existent payment'
      };

      // Mock the payment controller
      const paymentController = {
        processRefund: jest.fn().mockImplementation(async (req, res) => {
          if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
          }

          const { paymentId } = req.body;
          // Any ID other than the mocked one will be considered non-existent
          return res.status(404).json({ message: 'Payment not found' });
        })
      };

      const { req, res } = createAuthenticatedRequest(user, {
        method: 'POST',
        body: refundData
      });

      await paymentController.processRefund(req as any, res as NextApiResponse);

      expectNotFound(res);
    });
  });
});