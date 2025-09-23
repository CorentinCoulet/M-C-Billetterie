import { config } from 'dotenv';
import { join } from 'path';

// Load test environment variables
config({ path: join(process.cwd(), '.env.test') });

// Set environment variables
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-that-is-at-least-32-chars-long';

// Set NODE_ENV safely
if (!process.env.NODE_ENV) {
  Object.defineProperty(process.env, 'NODE_ENV', {
    value: 'test',
    writable: false,
    enumerable: true,
    configurable: true
  });
}

console.log('🧪 Simple Jest Test Setup - Environment configured');
