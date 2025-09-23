#!/usr/bin/env node

console.log('🧪 Testing Jest configuration...');

try {
  const jest = require('jest');
  console.log('✅ Jest module loaded successfully');
  
  const config = require('./jest.config.js');
  console.log('✅ Jest config loaded successfully');
  
  console.log('Environment variables:');
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('DATABASE_URL:', process.env.DATABASE_URL ? '[CONFIGURED]' : '[NOT SET]');
  console.log('JWT_SECRET:', process.env.JWT_SECRET ? '[CONFIGURED]' : '[NOT SET]');
  
  // Try to require some test utilities
  const path = require('path');
  const setupPath = path.join(__dirname, '..', 'tests', 'utils', 'setup.ts');
  console.log('Setup file path:', setupPath);
  
  console.log('🎯 Basic test completed successfully');
  
} catch (error) {
  console.error('❌ Error during Jest test:', error.message);
  console.error('Stack:', error.stack);
}
