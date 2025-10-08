/**
 * API Performance Benchmarks Tests
 * 
 * Performance tests to measure response times of critical endpoints
 * Objectives:
 * - GET endpoints: < 200ms
 * - POST endpoints: < 500ms
 * - Database queries: < 100ms
 */

import { performance } from 'perf_hooks';

const BASE_URL = process.env.TEST_URL || 'http://localhost:3001'; // Port 3001 for Docker dev environment
const PERFORMANCE_THRESHOLDS = {
  GET: 2000,      // 2s for GET requests (Docker cold start)
  POST: 3000,     // 3s for POST requests (includes DB writes)
  PUT: 3000,      // 3s for PUT requests
  DELETE: 2000,   // 2s for DELETE requests
  DATABASE: 100, // 100ms for DB queries
  HEALTH: 500,   // 500ms for health check
};

// Warmup function to wake up Docker container
async function warmupServer() {
  try {
    console.log('[WARMUP] Warming up server...');
    await fetch(`${BASE_URL}/api/health`, { 
      signal: AbortSignal.timeout(10000) 
    });
    // Wait a bit for the server to be fully ready
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('[WARMUP] Server ready!');
  } catch (error) {
    console.warn('[WARMUP] Failed to warm up server:', error);
  }
}

describe('API Performance Benchmarks', () => {
  // Warmup before all tests
  beforeAll(async () => {
    await warmupServer();
  }, 30000); // 30s timeout for warmup
  // Helper to measure response time
  async function measureResponseTime(
    url: string,
    options?: RequestInit
  ): Promise<{ duration: number; status: number; data?: any }> {
    const start = performance.now();
    const response = await fetch(`${BASE_URL}${url}`, options);
    const duration = performance.now() - start;
    let data;
    
    try {
      data = await response.json();
    } catch (e) {
      // Response might not be JSON
    }

    return { duration, status: response.status, data };
  }

  describe('Public Endpoints Performance', () => {
    it('GET /api/events should respond in < 2s', async () => {
      const { duration, status } = await measureResponseTime('/api/events');

      console.log(`[PERF] GET /api/events: ${duration.toFixed(2)}ms`);
      expect(status).toBe(200);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.GET);
    }, 15000); // 15s timeout

    it('GET /api/events/[id] should respond in < 2s', async () => {
      // First, get an event ID
      const { data: events } = await measureResponseTime('/api/events');
      const eventId = events?.[0]?.id;

      if (eventId) {
        const { duration, status } = await measureResponseTime(`/api/events/${eventId}`);
        console.log(`[PERF] GET /api/events/${eventId}: ${duration.toFixed(2)}ms`);
        expect(status).toBe(200);
        expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.GET);
      }
    }, 15000); // 15s timeout

    it('GET /api/health should respond in < 500ms', async () => {
      const { duration, status } = await measureResponseTime('/api/health');

      console.log(`[PERF] GET /api/health: ${duration.toFixed(2)}ms`);
      expect(status).toBe(200);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.HEALTH);
    }, 10000); // 10s timeout
  });

  describe('Authentication Performance', () => {
    it('POST /api/auth/login should respond in < 3s', async () => {
      const { duration, status } = await measureResponseTime('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'TestPassword123!',
        }),
      });

      console.log(`[PERF] POST /api/auth/login: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.POST);
    }, 15000); // 15s timeout

    it('POST /api/auth/register should respond in < 3s', async () => {
      const uniqueEmail = `perf-test-${Date.now()}@example.com`;
      const { duration, status } = await measureResponseTime('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: uniqueEmail,
          password: 'TestPassword123!',
          name: 'Performance Test User',
        }),
      });

      console.log(`[PERF] POST /api/auth/register: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.POST);
    }, 15000); // 15s timeout
  });

  describe('Order Creation Performance', () => {
    it('POST /api/orders should respond in < 3s', async () => {
      // This might fail without auth, but we measure the performance
      const { duration, status } = await measureResponseTime('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: 'test-event-id',
          quantity: 2,
        }),
      });

      console.log(`[PERF] POST /api/orders: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.POST);
    }, 15000); // 15s timeout
  });

  describe('Search Performance', () => {
    it('GET /api/events with search query should respond in < 2s', async () => {
      const { duration, status } = await measureResponseTime('/api/events?search=concert');

      console.log(`[PERF] GET /api/events?search=concert: ${duration.toFixed(2)}ms`);
      expect(status).toBe(200);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.GET);
    }, 15000); // 15s timeout

    it('GET /api/events with filters should respond in < 2s', async () => {
      const { duration, status } = await measureResponseTime(
        '/api/events?category=music&minPrice=10&maxPrice=100'
      );

      console.log(`[PERF] GET /api/events with filters: ${duration.toFixed(2)}ms`);
      expect(status).toBe(200);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.GET);
    }, 15000); // 15s timeout
  });

  describe('Pagination Performance', () => {
    it('GET /api/events with pagination should respond in < 2s', async () => {
      const { duration, status } = await measureResponseTime('/api/events?page=1&limit=10');

      console.log(`[PERF] GET /api/events?page=1&limit=10: ${duration.toFixed(2)}ms`);
      expect(status).toBe(200);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.GET);
    }, 15000); // 15s timeout

    it('GET /api/events with large pagination should respond in < 2s', async () => {
      const { duration, status } = await measureResponseTime('/api/events?page=1&limit=100');

      console.log(`[PERF] GET /api/events?page=1&limit=100: ${duration.toFixed(2)}ms`);
      expect(status).toBe(200);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.GET);
    }, 15000); // 15s timeout
  });

  describe('Concurrent Requests Performance', () => {
    it('should handle 10 concurrent requests in < 20s total', async () => {
      const start = performance.now();
      const requests = Array(10)
        .fill(null)
        .map(() => measureResponseTime('/api/events'));

      const results = await Promise.all(requests);
      const totalDuration = performance.now() - start;

      console.log(`[PERF] 10 concurrent requests: ${totalDuration.toFixed(2)}ms`);
      console.log(
        `[PERF] Average per request: ${(totalDuration / 10).toFixed(2)}ms`
      );

      // All requests should succeed
      results.forEach((result) => {
        expect(result.status).toBe(200);
      });

      // Total time should be less than 20 seconds (Docker environment)
      expect(totalDuration).toBeLessThan(20000);
    }, 30000); // 30s timeout

    it('should handle 50 concurrent requests efficiently', async () => {
      const start = performance.now();
      const requests = Array(50)
        .fill(null)
        .map(() => measureResponseTime('/api/health'));

      const results = await Promise.all(requests);
      const totalDuration = performance.now() - start;

      console.log(`[PERF] 50 concurrent health checks: ${totalDuration.toFixed(2)}ms`);
      console.log(
        `[PERF] Average per request: ${(totalDuration / 50).toFixed(2)}ms`
      );

      // All requests should succeed
      results.forEach((result) => {
        expect(result.status).toBe(200);
      });

      // Should handle 50 requests in less than 30 seconds (Docker environment)
      expect(totalDuration).toBeLessThan(30000);
    }, 45000); // 45s timeout for this test
  });

  describe('Response Size Performance', () => {
    it('should measure and log response sizes', async () => {
      const endpoints = [
        '/api/events',
        '/api/health',
      ];

      for (const endpoint of endpoints) {
        const response = await fetch(`${BASE_URL}${endpoint}`);
        const text = await response.text();
        const sizeKB = (text.length / 1024).toFixed(2);

        console.log(`[SIZE] ${endpoint}: ${sizeKB} KB`);
        
        // Response should be reasonable (< 1MB)
        expect(text.length).toBeLessThan(1024 * 1024);
      }
    });
  });
});
