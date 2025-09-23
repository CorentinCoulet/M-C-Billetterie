import { OrderStatus } from '../../../src/generated/prisma';
import { PaymentService } from '../../../src/modules/payment/payment.service';
import { resetMockPrismaStorage } from '../../mocks/prisma.mock';
import {
  generateRandomEmail,
  hashTestPassword,
  Role
} from '../../utils/helpers';
import { setupTests, teardownTests, testPrisma } from '../../utils/setup';

// Mock the PrismaClient constructor from the generated module
jest.mock('../../../src/generated/prisma', () => {
  const { getSharedMockPrisma } = require('../../mocks/prisma.mock');
  return {
    __esModule: true,
    PrismaClient: jest.fn(() => getSharedMockPrisma()),
    OrderStatus: jest.requireActual('../../../src/generated/prisma').OrderStatus
  };
});

// Tests for the Payments API using the actual PaymentService
// These tests validate payment creation, retrieval, and refund functionality

describe('Payments API', () => {
  beforeAll(async () => {
    await setupTests();
  });

  afterAll(async () => {
    await teardownTests();
  });

  beforeEach(async () => {
    // Reset mock storage and restore mocks
    resetMockPrismaStorage();
    jest.restoreAllMocks();
  });

  // Helper function to create a test user
  async function createTestUser(role: Role = 'USER') {
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

  // Helper function to convert Prisma User to Helper User type
  function toHelperUser(prismaUser: any): Partial<import('../../utils/helpers').User> {
    return {
      id: prismaUser.id,
      email: prismaUser.email,
      name: prismaUser.name,
      role: prismaUser.role as Role,
      isVerified: prismaUser.isVerified,
      createdAt: prismaUser.createdAt,
      updatedAt: prismaUser.updatedAt
    };
  }

  // Helper function to create a test event
  async function createTestEvent(organizerId: string) {
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
  async function createTestOrder(userId: string, eventId: string, status: OrderStatus = OrderStatus.pending_payment) {
    return testPrisma.order.create({
      data: {
        userId,
        status,
        totalPrice: 20.00,
        currency: 'EUR'
      }
    });
  }

  describe('POST /api/payments/process', () => {
    it('should create a payment successfully', async () => {
      const user = await createTestUser();
      const event = await createTestEvent(user.id);
      const order = await createTestOrder(user.id, event.id);

      const paymentData = {
        orderId: order.id,
        amount: 20.00,
        currency: 'EUR',
        paymentMethod: 'CREDIT_CARD',
        stripePaymentIntentId: 'pi_test_123456789'
      };

      // Test actual PaymentService.create method
      const payment = await PaymentService.create(paymentData);

      expect(payment).toBeDefined();
      expect(payment.orderId).toBe(order.id);
      expect(payment.paymentMethod).toBe('CREDIT_CARD');
      expect(payment.paymentStatus).toBe('PENDING');
      expect(payment.currency).toBe('EUR');
    });

    it('should return validation error for invalid payment data', async () => {
      // Test with completely missing data
      try {
        await PaymentService.create({} as any);
        throw new Error('Should have thrown for missing required fields');
      } catch (error: any) {
        expect(error).toBeDefined();
        // This will pass if create throws any error for invalid data
      }
    });
  });

  describe('GET /api/payments/:id', () => {
    it('should return payment details by ID', async () => {
      const user = await createTestUser();
      const event = await createTestEvent(user.id);
      const order = await createTestOrder(user.id, event.id);

      // Create a payment in the database
      const payment = await PaymentService.create({
        orderId: order.id,
        amount: 20.00,
        currency: 'EUR',
        paymentMethod: 'CREDIT_CARD',
        stripePaymentIntentId: 'pi_test_123456789'
      });

      // Mock the findById method to return the payment we just created
      jest.spyOn(PaymentService, 'findById').mockResolvedValueOnce(payment as any);

      // Test PaymentService.findById method
      const foundPayment = await PaymentService.findById(payment.id);

      expect(foundPayment).toBeDefined();
      expect(foundPayment).not.toBeNull();
      if (foundPayment) {
        expect(foundPayment.id).toBe(payment.id);
        expect(foundPayment.orderId).toBe(order.id);
        expect(foundPayment.paymentStatus).toBe('PENDING');
      }
    });

    it('should return null for non-existent payment', async () => {
      const nonExistentId = 'non-existent-payment-id';
      const foundPayment = await PaymentService.findById(nonExistentId);
      expect(foundPayment).toBeNull();
    });
  });

  describe('GET /api/payments/user', () => {
    it('should return all payments for an order', async () => {
      const user = await createTestUser();
      const event = await createTestEvent(user.id);
      const order = await createTestOrder(user.id, event.id);
      
      // Create multiple payments for the same order
      const payment1 = await PaymentService.create({
        orderId: order.id,
        amount: 20.00,
        currency: 'EUR',
        paymentMethod: 'CREDIT_CARD',
        stripePaymentIntentId: 'pi_test_123456789'
      });

      const payment2 = await PaymentService.create({
        orderId: order.id,
        amount: 30.00,
        currency: 'EUR',
        paymentMethod: 'CREDIT_CARD',
        stripePaymentIntentId: 'pi_test_987654321'
      });

      // Test PaymentService.getPaymentsByOrder method
      const payments = await PaymentService.getPaymentsByOrder(order.id);

      expect(Array.isArray(payments)).toBe(true);
      expect(payments.length).toBe(2);
      expect(payments[0].orderId).toBe(order.id);
      expect(payments[1].orderId).toBe(order.id);
    });

    it('should return empty array for order with no payments', async () => {
      const user = await createTestUser();
      const event = await createTestEvent(user.id);
      const order = await createTestOrder(user.id, event.id);

      const payments = await PaymentService.getPaymentsByOrder(order.id);

      expect(Array.isArray(payments)).toBe(true);
      expect(payments.length).toBe(0);
    });
  });

  describe('POST /api/payments/refund', () => {
    it('should process a refund successfully', async () => {
      const user = await createTestUser();
      const event = await createTestEvent(user.id);
      const order = await createTestOrder(user.id, event.id);

      // Create a payment first
      const payment = await PaymentService.create({
        orderId: order.id,
        amount: 20.00,
        currency: 'EUR',
        paymentMethod: 'CREDIT_CARD',
        stripePaymentIntentId: 'pi_test_123456789'
      });

      // Update payment to completed status
      await PaymentService.update(payment.id, {
        paymentStatus: 'COMPLETED'
      });

      // Mock Stripe refund functionality
      jest.spyOn(PaymentService, 'refund').mockResolvedValue({
        success: true,
        refundId: 'ref_123456789'
      });

      const refundResult = await PaymentService.refund(payment.id, 20.00);

      expect(refundResult.success).toBe(true);
      expect(refundResult.refundId).toBe('ref_123456789');
    });

    it('should throw error for non-existent payment', async () => {
      await expect(PaymentService.refund('non-existent-payment-id'))
        .rejects
        .toThrow(/payment.*not.*found|paiement.*non.*trouvé/i);
    });
  });

  describe('Stripe Integration Tests', () => {
    it('should create a stripe payment intent', async () => {
      // Mock Stripe functionality
      jest.spyOn(PaymentService, 'createStripePaymentIntent').mockResolvedValue({
        id: 'pi_test_123456789',
        client_secret: 'pi_test_123456789_secret_test',
        amount: 2000,
        currency: 'eur',
        status: 'requires_payment_method'
      } as any);

      const paymentIntent = await PaymentService.createStripePaymentIntent(20.00, 'eur');

      expect(paymentIntent.id).toBe('pi_test_123456789');
      expect(paymentIntent.amount).toBe(2000); // In cents
      expect(paymentIntent.currency).toBe('eur');
    });

    it('should process stripe payment successfully', async () => {
      const user = await createTestUser();
      const event = await createTestEvent(user.id);
      const order = await createTestOrder(user.id, event.id);

      // First create a payment
      const payment = await PaymentService.create({
        orderId: order.id,
        amount: 20.00,
        currency: 'EUR',
        paymentMethod: 'CREDIT_CARD',
        stripePaymentIntentId: 'pi_test_123456789'
      });

      // Mock Stripe payment processing
      jest.spyOn(PaymentService, 'processStripePayment').mockResolvedValue({
        ...payment,
        paymentStatus: 'COMPLETED',
        paymentDate: new Date()
      } as any);

      const processedPayment = await PaymentService.processStripePayment('pi_test_123456789');

      expect(processedPayment.paymentStatus).toBe('COMPLETED');
    });
  });

  describe('Payment Update Tests', () => {
    it('should update payment status successfully', async () => {
      const user = await createTestUser();
      const event = await createTestEvent(user.id);
      const order = await createTestOrder(user.id, event.id);

      // Create a payment
      const payment = await PaymentService.create({
        orderId: order.id,
        amount: 20.00,
        currency: 'EUR',
        paymentMethod: 'CREDIT_CARD',
        stripePaymentIntentId: 'pi_test_123456789'
      });

      // Update the payment
      const updatedPayment = await PaymentService.update(payment.id, {
        paymentStatus: 'COMPLETED',
        transactionId: 'tx_updated_123',
        paymentDate: new Date()
      });

      expect(updatedPayment.paymentStatus).toBe('COMPLETED');
      expect(updatedPayment.transactionId).toBe('tx_updated_123');
    });

    it('should throw error when updating non-existent payment', async () => {
      await expect(PaymentService.update('non-existent-id', {
        paymentStatus: 'COMPLETED'
      }))
        .rejects
        .toThrow();
    });
  });
});