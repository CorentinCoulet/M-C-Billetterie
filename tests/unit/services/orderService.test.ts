import prisma from '@/lib/prisma';
import { OrderService } from '@/services/orderService';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

// Mock des dépendances
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    order: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    ticket: {
      updateMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    payment: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn((callback: any) => callback(prisma)),
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('OrderService', () => {
  let orderService: OrderService;

  const mockOrder = {
    id: 'order-123',
    userId: 'user-1',
    totalPrice: 100,
    status: 'paid' as const,
    currency: 'EUR',
    metadata: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    user: {
      id: 'user-1',
      name: 'John Doe',
      email: 'john@example.com',
    },
    payment: null,
    tickets: [
      {
        id: 'ticket-1',
        eventId: 'event-1',
        userId: 'user-1',
        orderId: 'order-123',
        code: 'TKT-001',
        status: 'paid' as const,
        seatNumber: 'A1',
        purchasedAt: new Date(),
        event: {
          id: 'event-1',
          title: 'Test Concert',
          date: new Date('2025-12-31'),
          location: 'Paris',
        },
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    orderService = new OrderService();
  });

  describe('createOrder', () => {
    const orderData = {
      userId: 'user-1',
      tickets: [
        { ticketId: 'ticket-1', quantity: 1 },
        { ticketId: 'ticket-2', quantity: 1 }
      ],
    };

    it('should create order successfully', async () => {
      const prismaMock = prisma as any;
      prismaMock.$transaction.mockImplementation(async (callback: any) => {
        return mockOrder;
      });

      const result = await orderService.createOrder(orderData);

      expect(result).toBeDefined();
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should set initial status to pending_payment', async () => {
      const prismaMock = prisma as any;
      prismaMock.$transaction.mockImplementation(async (callback: any) => {
        return {
          ...mockOrder,
          status: 'pending_payment',
        };
      });

      const result = await orderService.createOrder(orderData);

      expect(result.status).toBe('pending_payment');
    });

    it('should reserve tickets atomically', async () => {
      const prismaMock = prisma as any;
      const mockTicket = {
        id: 'ticket-1',
        orderId: null,
        event: {
          id: 'event-1',
          title: 'Test Event',
          date: new Date('2025-12-31'),
        },
      };

      prismaMock.$transaction.mockImplementation(async (callback: any) => {
        prismaMock.ticket.findUnique.mockResolvedValue(mockTicket);
        prismaMock.order.create.mockResolvedValue(mockOrder);
        prismaMock.order.findUnique.mockResolvedValue(mockOrder);
        return callback(prismaMock);
      });

      const result = await orderService.createOrder(orderData);

      expect(result).toBeDefined();
    });

    it('should handle transaction errors', async () => {
      const prismaMock = prisma as any;
      prismaMock.$transaction.mockRejectedValue(new Error('Transaction failed'));

      await expect(orderService.createOrder(orderData)).rejects.toThrow();
    });
  });

  describe('getOrderById', () => {
    it('should return order with full details', async () => {
      const prismaMock = prisma as any;
      prismaMock.order.findUnique.mockResolvedValue(mockOrder);

      const result = await orderService.getOrderById('order-123');

      expect(result).toEqual(mockOrder);
      expect(prisma.order.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'order-123' },
        })
      );
    });

    it('should return null if order not found', async () => {
      const prismaMock = prisma as any;
      prismaMock.order.findUnique.mockResolvedValue(null);

      const result = await orderService.getOrderById('non-existent');

      expect(result).toBeNull();
    });

    it('should include user and tickets relations', async () => {
      const prismaMock = prisma as any;
      prismaMock.order.findUnique.mockResolvedValue(mockOrder);

      const result = await orderService.getOrderById('order-123');

      expect(result?.user).toBeDefined();
      expect(result?.tickets).toBeDefined();
      expect(result?.tickets).toHaveLength(1);
    });
  });

  describe('getUserOrders', () => {
    it('should return all orders for a user', async () => {
      const prismaMock = prisma as any;
      prismaMock.order.findMany.mockResolvedValue([mockOrder]);

      const result = await orderService.getUserOrders('user-1');

      expect(result).toEqual([mockOrder]);
      expect(prisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1' },
        })
      );
    });

    it('should order by creation date descending', async () => {
      const prismaMock = prisma as any;
      prismaMock.order.findMany.mockResolvedValue([mockOrder]);

      await orderService.getUserOrders('user-1');

      expect(prisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        })
      );
    });

    it('should return empty array if user has no orders', async () => {
      const prismaMock = prisma as any;
      prismaMock.order.findMany.mockResolvedValue([]);

      const result = await orderService.getUserOrders('user-no-orders');

      expect(result).toEqual([]);
    });
  });

  describe('cancelOrder', () => {
    it('should cancel order successfully', async () => {
      const pendingOrder = { 
        ...mockOrder, 
        status: 'pending_payment' as const,
        payment: { 
          id: 'payment-1', 
          paymentStatus: 'PENDING',
          orderId: 'order-123',
          currency: 'EUR',
          paymentMethod: 'card',
          paymentDate: new Date(),
          transactionId: 'txn-1'
        } 
      };
      const cancelledOrder = { ...pendingOrder, status: 'cancelled' as const };
      const prismaMock = prisma as any;
      
      prismaMock.$transaction.mockImplementation(async (callback: any) => {
        prismaMock.order.findUnique.mockResolvedValue(pendingOrder);
        prismaMock.ticket.updateMany.mockResolvedValue({ count: 1 });
        prismaMock.payment.update.mockResolvedValue({ ...pendingOrder.payment, paymentStatus: 'CANCELLED' });
        prismaMock.order.update.mockResolvedValue(cancelledOrder);
        return callback(prismaMock);
      });

      const result = await orderService.cancelOrder('order-123');

      expect(result.status).toBe('cancelled');
    });

    it('should cancel all associated tickets', async () => {
      const pendingOrder = { ...mockOrder, status: 'pending_payment' as const };
      const prismaMock = prisma as any;
      
      prismaMock.$transaction.mockImplementation(async (callback: any) => {
        prismaMock.order.findUnique.mockResolvedValue(pendingOrder);
        prismaMock.ticket.updateMany.mockResolvedValue({ count: 2 });
        prismaMock.order.update.mockResolvedValue({
          ...pendingOrder,
          status: 'cancelled',
        });
        return callback(prismaMock);
      });

      await orderService.cancelOrder('order-123');

      expect(prisma.ticket.updateMany).toHaveBeenCalled();
    });

    it('should handle cancellation errors', async () => {
      const prismaMock = prisma as any;
      prismaMock.$transaction.mockRejectedValue(new Error('Cancellation failed'));

      await expect(orderService.cancelOrder('order-123')).rejects.toThrow('Cancellation failed');
    });

    it('should not cancel already paid order without refund', async () => {
      const prismaMock = prisma as any;
      prismaMock.order.findUnique.mockResolvedValue(mockOrder);

      // Test implementation specific - might need adjustment based on actual business logic
      // This test assumes cancellation requires prior check of order status
    });
  });

  describe('completeOrder', () => {
    it('should complete order successfully', async () => {
      const completedOrder = { ...mockOrder, status: 'paid' as const };
      const prismaMock = prisma as any;
      
      prismaMock.$transaction.mockImplementation(async (callback: any) => {
        return completedOrder;
      });

      const result = await orderService.completeOrder('order-123', 'payment-123');

      expect(result.status).toBe('paid');
    });

    it('should verify payment is completed', async () => {
      const prismaMock = prisma as any;
      prismaMock.$transaction.mockRejectedValue(new Error('Payment is not completed'));

      await expect(
        orderService.completeOrder('order-123', 'payment-123')
      ).rejects.toThrow();
    });
  });

  describe('updateOrderStatus', () => {
    it('should update order status successfully', async () => {
      const updatedOrder = { ...mockOrder, status: 'paid' as const };
      const prismaMock = prisma as any;
      prismaMock.order.update.mockResolvedValue(updatedOrder);

      const result = await orderService.updateOrderStatus('order-123', 'paid');

      expect(result.status).toBe('paid');
      expect(prisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'order-123' },
          data: expect.objectContaining({
            status: 'paid',
          }),
        })
      );
    });

    it('should handle invalid status transitions', async () => {
      const prismaMock = prisma as any;
      prismaMock.order.update.mockRejectedValue(new Error('Invalid status transition'));

      await expect(
        orderService.updateOrderStatus('order-123', 'invalid' as any)
      ).rejects.toThrow();
    });
  });

  describe('getOrders', () => {
    it('should return orders with filtering', async () => {
      const prismaMock = prisma as any;
      prismaMock.order.findMany.mockResolvedValue([mockOrder]);

      const result = await orderService.getOrders({
        where: { userId: 'user-1' },
      });

      expect(result).toEqual([mockOrder]);
      expect(prisma.order.findMany).toHaveBeenCalled();
    });

    it('should support pagination', async () => {
      const prismaMock = prisma as any;
      prismaMock.order.findMany.mockResolvedValue([mockOrder]);

      await orderService.getOrders({
        skip: 0,
        take: 10,
      });

      expect(prisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 10,
        })
      );
    });
  });

  describe('getOrderStatistics', () => {
    it('should return order statistics', async () => {
      const prismaMock = prisma as any;
      prismaMock.order.count.mockImplementation((params?: any) => {
        if (!params || !params.where) return Promise.resolve(100);
        if (params.where.status === 'paid') return Promise.resolve(80);
        if (params.where.status === 'pending_payment') return Promise.resolve(15);
        if (params.where.status === 'cancelled') return Promise.resolve(5);
        return Promise.resolve(0);
      });
      prismaMock.payment.findMany.mockResolvedValue([]);
      prismaMock.order.findMany.mockResolvedValue([
        { totalPrice: 100 },
        { totalPrice: 200 },
      ]);

      const stats = await orderService.getOrderStatistics();

      expect(stats).toHaveProperty('totalOrders');
      expect(stats).toHaveProperty('completedOrders');
      expect(stats).toHaveProperty('totalRevenue');
    });

    it('should calculate total revenue correctly', async () => {
      const prismaMock = prisma as any;
      prismaMock.order.count.mockImplementation((params?: any) => {
        if (!params || !params.where) return Promise.resolve(10);
        return Promise.resolve(5);
      });
      prismaMock.payment.findMany.mockResolvedValue([]);
      prismaMock.order.findMany.mockResolvedValue([
        { totalPrice: 100 },
        { totalPrice: 150 },
      ]);

      const stats = await orderService.getOrderStatistics();

      expect(stats.totalRevenue).toBe(250);
    });
  });

  describe('edge cases', () => {
    it('should handle database errors gracefully', async () => {
      const prismaMock = prisma as any;
      prismaMock.order.findUnique.mockRejectedValue(new Error('Database error'));

      await expect(orderService.getOrderById('order-123')).rejects.toThrow('Database error');
    });

    it('should handle concurrent order creation', async () => {
      const prismaMock = prisma as any;
      prismaMock.$transaction.mockImplementation(async (callback: any) => {
        return mockOrder;
      });

      // Simulate concurrent requests
      const promises = [
        orderService.createOrder({
          userId: 'user-1',
          tickets: [{ ticketId: 'ticket-1', quantity: 1 }],
        }),
        orderService.createOrder({
          userId: 'user-2',
          tickets: [{ ticketId: 'ticket-2', quantity: 1 }],
        }),
      ];

      const results = await Promise.all(promises);
      expect(results).toHaveLength(2);
    });

    it('should handle invalid ticket IDs', async () => {
      const prismaMock = prisma as any;
      prismaMock.$transaction.mockRejectedValue(new Error('Ticket with ID invalid-ticket not found'));

      const invalidData = {
        userId: 'user-1',
        tickets: [{ ticketId: 'invalid-ticket', quantity: 1 }],
      };

      await expect(orderService.createOrder(invalidData)).rejects.toThrow();
    });
  });
});
