// Ensure test environment is set before any imports
(process.env as any).NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-that-is-at-least-32-chars-long';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/billetterie_test_db';
process.env.ENCRYPTION_KEY = 'test-encryption-key-32-chars-min-for-testing-purposes';

// Import config after setting environment variables
import CONFIG from './src/core/config';

console.log('🔧 CONFIG keys:', Object.keys(CONFIG));
console.log('🔧 ENV:', CONFIG.ENV);
console.log('🔧 IS_TEST:', CONFIG.IS_TEST);

// Tests basiques
console.log('✅ Basic tests:');
console.log('- CONFIG defined:', CONFIG !== undefined);
console.log('- Has ENV property:', CONFIG.hasOwnProperty('ENV'));
console.log('- ENV value:', CONFIG.ENV);

console.log('✅ Auth tests:');
console.log('- Has AUTH:', CONFIG.hasOwnProperty('AUTH'));
if (CONFIG.AUTH) {
  console.log('- AUTH keys:', Object.keys(CONFIG.AUTH));
  console.log('- JWT_SECRET length:', CONFIG.AUTH.JWT_SECRET?.length);
}

console.log('✅ Security tests:');
console.log('- Has SECURITY:', CONFIG.hasOwnProperty('SECURITY'));
if (CONFIG.SECURITY) {
  console.log('- SECURITY keys:', Object.keys(CONFIG.SECURITY));
}

console.log('✅ Features tests:');
console.log('- Has FEATURES:', CONFIG.hasOwnProperty('FEATURES'));
if (CONFIG.FEATURES) {
  console.log('- FEATURES keys:', Object.keys(CONFIG.FEATURES));
  console.log('- AUTH enabled:', CONFIG.FEATURES.AUTH);
  console.log('- PAYMENTS enabled:', CONFIG.FEATURES.PAYMENTS);
  console.log('- EMAIL enabled:', CONFIG.FEATURES.EMAIL);
}
