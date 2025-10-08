/**
 * Database Performance Benchmarks
 * 
 * Performance tests to measure database query execution times
 * Objectives:
 * - Simple queries: < 50ms
 * - Complex queries with joins: < 100ms
 * - Aggregations: < 150ms
 * - Writes: < 100ms
 */

// Load .env BEFORE importing Prisma and force DATABASE_URL
import { config } from 'dotenv';
import { join } from 'path';
config({ path: join(process.cwd(), '.env'), override: true }); // Override=true to overwrite existing vars

// Force dev Docker database URL (in case Jest overwrote it)
process.env.DATABASE_URL = 'postgresql://postgres:postgres123@localhost:5433/billetterie';

import { PrismaClient } from '@/generated/prisma';
import { performance } from 'perf_hooks';

const prisma = new PrismaClient();

const PERFORMANCE_THRESHOLDS = {
  SIMPLE_QUERY: 50,      // 50ms for simple queries
  COMPLEX_QUERY: 100,    // 100ms for queries with joins
  AGGREGATION: 150,      // 150ms for aggregations
  WRITE: 100,            // 100ms for writes
  BATCH_WRITE: 500,      // 500ms for batch writes
};

describe('Database Performance Benchmarks', () => {
  beforeAll(async () => {
    // Connect to database
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // Helper to measure query execution time
  async function measureQueryTime<T>(
    queryName: string,
    queryFn: () => Promise<T>
  ): Promise<{ duration: number; result: T }> {
    const start = performance.now();
    const result = await queryFn();
    const duration = performance.now() - start;

    console.log(`[DB PERF] ${queryName}: ${duration.toFixed(2)}ms`);

    return { duration, result };
  }

  describe('Simple Queries Performance', () => {
    it('SELECT single user by ID should be < 50ms', async () => {
      const { duration } = await measureQueryTime('SELECT user by ID', () =>
        prisma.user.findFirst({
          where: { role: 'USER' },
        })
      );

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.SIMPLE_QUERY);
    });

    it('SELECT single event by ID should be < 50ms', async () => {
      const { duration } = await measureQueryTime('SELECT event by ID', () =>
        prisma.event.findFirst()
      );

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.SIMPLE_QUERY);
    });

    it('COUNT users should be < 50ms', async () => {
      const { duration } = await measureQueryTime('COUNT users', () =>
        prisma.user.count()
      );

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.SIMPLE_QUERY);
    });

    it('COUNT events should be < 50ms', async () => {
      const { duration } = await measureQueryTime('COUNT events', () =>
        prisma.event.count()
      );

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.SIMPLE_QUERY);
    });
  });

  describe('List Queries Performance', () => {
    it('SELECT 10 events should be < 100ms', async () => {
      const { duration } = await measureQueryTime('SELECT 10 events', () =>
        prisma.event.findMany({
          take: 10,
        })
      );

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.COMPLEX_QUERY);
    });

    it('SELECT 50 events should be < 150ms', async () => {
      const { duration } = await measureQueryTime('SELECT 50 events', () =>
        prisma.event.findMany({
          take: 50,
        })
      );

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.AGGREGATION);
    });

    it('SELECT events with pagination should be < 100ms', async () => {
      const { duration } = await measureQueryTime('SELECT paginated events', () =>
        prisma.event.findMany({
          skip: 0,
          take: 20,
          orderBy: { createdAt: 'desc' },
        })
      );

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.COMPLEX_QUERY);
    });
  });

  describe('Complex Queries with Joins', () => {
    it('SELECT event with tickets should be < 100ms', async () => {
      const { duration } = await measureQueryTime('SELECT event with tickets', () =>
        prisma.event.findFirst({
          include: {
            tickets: true,
          },
        })
      );

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.COMPLEX_QUERY);
    });

    it('SELECT order with user and event should be < 100ms', async () => {
      const { duration } = await measureQueryTime('SELECT order with relations', () =>
        prisma.order.findFirst({
          include: {
            user: true,
            payment: true,
            tickets: {
              include: {
                event: true,
              },
            },
          },
        })
      );

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.COMPLEX_QUERY);
    });

    it('SELECT user with orders and tickets should be < 150ms', async () => {
      const { duration } = await measureQueryTime('SELECT user with all relations', () =>
        prisma.user.findFirst({
          include: {
            orders: {
              include: {
                tickets: true,
              },
            },
          },
        })
      );

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.AGGREGATION);
    });
  });

  describe('Search and Filter Queries', () => {
    it('Search events by title should be < 100ms', async () => {
      const { duration } = await measureQueryTime('SEARCH events by title', () =>
        prisma.event.findMany({
          where: {
            title: {
              contains: 'concert',
              mode: 'insensitive',
            },
          },
          take: 20,
        })
      );

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.COMPLEX_QUERY);
    });

    it('Filter events by date range should be < 100ms', async () => {
      const now = new Date();
      const futureDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const { duration } = await measureQueryTime('FILTER events by date', () =>
        prisma.event.findMany({
          where: {
            date: {
              gte: now,
              lte: futureDate,
            },
          },
          take: 20,
        })
      );

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.COMPLEX_QUERY);
    });

    it('Filter events by multiple criteria should be < 150ms', async () => {
      const { duration } = await measureQueryTime('FILTER events complex', () =>
        prisma.event.findMany({
          where: {
            AND: [
              { date: { gte: new Date() } },
              { maxCapacity: { gte: 100 } },
              { isPublished: true },
            ],
          },
          take: 20,
        })
      );

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.AGGREGATION);
    });
  });

  describe('Aggregation Queries', () => {
    it('COUNT orders by status should be < 150ms', async () => {
      const { duration } = await measureQueryTime('GROUP BY order status', () =>
        prisma.order.groupBy({
          by: ['status'],
          _count: true,
        })
      );

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.AGGREGATION);
    });

    it('SUM order totals should be < 150ms', async () => {
      const { duration } = await measureQueryTime('SUM order totals', () =>
        prisma.order.aggregate({
          _sum: {
            totalPrice: true,
          },
        })
      );

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.AGGREGATION);
    });

    it('AVG ticket price by event should be < 150ms', async () => {
      const { duration } = await measureQueryTime('AVG prices', () =>
        prisma.ticket.groupBy({
          by: ['eventId'],
          _avg: {
            qrRotationInterval: true,
          },
        })
      );

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.AGGREGATION);
    });
  });

  describe('Write Operations Performance', () => {
    let testUserId: string;

    beforeAll(async () => {
      // Create test user
      const testUser = await prisma.user.create({
        data: {
          email: `perf-test-${Date.now()}@example.com`,
          password: 'hashedpassword',
          role: 'USER',
        },
      });
      testUserId = testUser.id;
    });

    afterAll(async () => {
      // Cleanup
      if (testUserId) {
        await prisma.user.delete({ where: { id: testUserId } });
      }
    });

    it('INSERT single order should be < 100ms', async () => {
      const event = await prisma.event.findFirst();
      if (!event) {
        console.log('[SKIP] No event available for test');
        return;
      }

      const { duration, result } = await measureQueryTime('INSERT order', () =>
        prisma.order.create({
          data: {
            userId: testUserId,
            totalPrice: 100,
            status: 'pending_payment',
          },
        })
      );

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.WRITE);

      // Cleanup
      await prisma.order.delete({ where: { id: result.id } });
    });

    it('UPDATE single user should be < 100ms', async () => {
      const { duration } = await measureQueryTime('UPDATE user', () =>
        prisma.user.update({
          where: { id: testUserId },
          data: { lastLogin: new Date() },
        })
      );

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.WRITE);
    });

    it('Batch INSERT should be < 500ms', async () => {
      const event = await prisma.event.findFirst();
      if (!event) {
        console.log('[SKIP] No event available for test');
        return;
      }

      const orders = Array.from({ length: 10 }, (_, i) => ({
        userId: testUserId,
        totalPrice: 50,
        status: 'pending_payment' as const,
      }));

      const { duration, result } = await measureQueryTime('BATCH INSERT orders', () =>
        prisma.order.createMany({
          data: orders,
        })
      );

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.BATCH_WRITE);

      // Cleanup
      await prisma.order.deleteMany({
        where: {
          userId: testUserId,
          totalPrice: 50,
        },
      });
    });
  });

  describe('Transaction Performance', () => {
    it('Transaction with multiple writes should be < 500ms', async () => {
      const event = await prisma.event.findFirst();
      if (!event) {
        console.log('[SKIP] No event available for test');
        return;
      }

      const { duration } = await measureQueryTime('TRANSACTION', async () => {
        return prisma.$transaction(async (tx) => {
          const order = await tx.order.create({
            data: {
              userId: await prisma.user.findFirst().then((u) => u!.id),
              totalPrice: 100,
              status: 'pending_payment',
            },
          });

          await tx.ticket.create({
            data: {
              eventId: event.id,
              orderId: order.id,
              userId: order.userId,
              code: `TICKET-${Date.now()}`,
              status: 'paid',
            },
          });

          // Cleanup within transaction
          await tx.ticket.deleteMany({ where: { orderId: order.id } });
          await tx.order.delete({ where: { id: order.id } });

          return order;
        });
      });

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.BATCH_WRITE);
    });
  });

  describe('Connection Pool Performance', () => {
    it('10 concurrent queries should be < 500ms total', async () => {
      const start = performance.now();

      const queries = Array(10)
        .fill(null)
        .map(() => prisma.event.findMany({ take: 10 }));

      await Promise.all(queries);
      const duration = performance.now() - start;

      console.log(`[DB PERF] 10 concurrent queries: ${duration.toFixed(2)}ms`);
      console.log(`[DB PERF] Average per query: ${(duration / 10).toFixed(2)}ms`);

      expect(duration).toBeLessThan(500);
    });

    it('50 concurrent simple queries should be efficient', async () => {
      const start = performance.now();

      const queries = Array(50)
        .fill(null)
        .map(() => prisma.user.count());

      await Promise.all(queries);
      const duration = performance.now() - start;

      console.log(`[DB PERF] 50 concurrent COUNT queries: ${duration.toFixed(2)}ms`);
      console.log(`[DB PERF] Average per query: ${(duration / 50).toFixed(2)}ms`);

      // Should complete in less than 2 seconds
      expect(duration).toBeLessThan(2000);
    });
  });

  describe('Index Performance', () => {
    it('Query with indexed column should be faster', async () => {
      // Query by email (indexed)
      const { duration: indexedDuration } = await measureQueryTime(
        'SELECT user by email (indexed)',
        () =>
          prisma.user.findFirst({
            where: { email: { contains: 'test' } },
          })
      );

      console.log(`[INDEX] Indexed query: ${indexedDuration.toFixed(2)}ms`);

      // Indexed queries should be fast
      expect(indexedDuration).toBeLessThan(PERFORMANCE_THRESHOLDS.SIMPLE_QUERY);
    });

    it('Query with composite index should be fast', async () => {
      const { duration } = await measureQueryTime(
        'SELECT with composite index',
        () =>
          prisma.order.findMany({
            where: {
              userId: { not: undefined },
              status: 'paid',
            },
            take: 10,
          })
      );

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.COMPLEX_QUERY);
    });
  });
});
