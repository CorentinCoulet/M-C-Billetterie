import '@testing-library/jest-dom';
import { config } from 'dotenv';
import { join } from 'path';
import { TextDecoder, TextEncoder } from 'util';
import { createMockPrisma, getSharedMockPrisma } from '../mocks/prisma.mock';

// Polyfills for test environments
global.TextEncoder = TextEncoder as any;
global.TextDecoder = TextDecoder as any;

// Polyfill for fetch
if (typeof global.fetch === 'undefined') {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      status: 200,
      json: async () => ({}),
      text: async () => '',
      headers: new Map(),
    })
  ) as any;
}

// Polyfill for Response
if (typeof global.Response === 'undefined') {
  global.Response = class Response {
    body: any;
    status: number;
    statusText: string;
    headers: Map<string, string>;
    ok: boolean;

    constructor(body?: any, init?: { status?: number; statusText?: string; headers?: any }) {
      this.body = body;
      this.status = init?.status || 200;
      this.statusText = init?.statusText || 'OK';
      this.headers = new Map(Object.entries(init?.headers || {}));
      this.ok = this.status >= 200 && this.status < 300;
    }

    async json() {
      return typeof this.body === 'string' ? JSON.parse(this.body) : this.body;
    }

    async text() {
      return typeof this.body === 'string' ? this.body : JSON.stringify(this.body);
    }
  } as any;
}

// Polyfill for Request
if (typeof global.Request === 'undefined') {
  global.Request = class Request {
    url: string;
    method: string;
    headers: Map<string, string>;

    constructor(url: string, init?: { method?: string; headers?: any }) {
      this.url = url;
      this.method = init?.method || 'GET';
      this.headers = new Map(Object.entries(init?.headers || {}));
    }
  } as any;
}

// Polyfill for setImmediate
if (typeof global.setImmediate === 'undefined') {
  global.setImmediate = ((callback: (...args: any[]) => void, ...args: any[]) => {
    return setTimeout(callback, 0, ...args);
  }) as any;
}

// Load test environment variables
config({ path: join(process.cwd(), '.env.test') });

// Global Jest setup
export function setupTests() {
  // Reset all mocks before each test
  jest.clearAllMocks();
  
  // Reset mock storage
  const { resetMockPrismaStorage } = require('../mocks/prisma.mock');
  resetMockPrismaStorage();
  
  // Set default environment variables for tests
  // Note: NODE_ENV is read-only, so we use Object.defineProperty
  Object.defineProperty(process.env, 'NODE_ENV', {
    value: 'test',
    writable: true,
    configurable: true
  });
  
  process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-purposes-that-is-at-least-32-chars-long';
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/billetterie_test';
  process.env.REDIS_URL = 'redis://localhost:6379/1';
  process.env.STRIPE_SECRET_KEY = 'sk_test_fake_key_for_testing';
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_fake_webhook_secret';
  process.env.NEXTAUTH_SECRET = 'test-nextauth-secret-for-testing-purposes';
  process.env.NEXTAUTH_URL = 'http://localhost:3000';
}

export function teardownTests() {
  // Clean up after tests
  jest.clearAllMocks();
}

// Export mock factory function
export { createMockPrisma, getSharedMockPrisma };

// Create and export a default mock instance using the shared instance
export const mockPrisma = () => {
  const { getSharedMockPrisma } = require('../mocks/prisma.mock');
  return getSharedMockPrisma();
};

// Export testPrisma as a function to get the fresh instance
export const getTestPrisma = () => getSharedMockPrisma();

// For compatibility, also export as a getter
export const testPrisma = getSharedMockPrisma();

// Automatically run setup for all Jest tests
// This ensures environment variables and mocks are initialized before any test runs
setupTests();

