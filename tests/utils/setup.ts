import { config } from 'dotenv';
import { join } from 'path';
import { createMockPrisma, getSharedMockPrisma } from '../mocks/prisma.mock';

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

