#!/usr/bin/env node
/**
 * Script to seed the test database
 * Usage: npm run seed:test
 */

// Load test environment variables
import { config } from 'dotenv';
config({ path: '.env.test' });

import { PrismaClient } from '../src/generated/prisma';
import { cleanTestData, seedTestData } from './utils/seed-test';

const prisma = new PrismaClient();

async function main() {
  const command = process.argv[2];

  // Check if DATABASE_URL is configured
  if (!process.env.DATABASE_URL) {
    console.error('❌ Error: DATABASE_URL environment variable is not set');
    console.log('');
    console.log('Please configure your database connection:');
    console.log('1. Copy .env.test file and configure DATABASE_URL');
    console.log('2. Or set DATABASE_URL environment variable');
    console.log('   Example: DATABASE_URL="postgresql://user:password@localhost:5432/billetterie_test"');
    process.exit(1);
  }

  console.log(`🔗 Using database: ${process.env.DATABASE_URL.replace(/:[^:@]*@/, ':***@')}`);

  try {
    // Test database connection
    await prisma.$connect();
    console.log('✅ Database connection successful');
  } catch (error) {
    console.error('❌ Database connection failed:', error instanceof Error ? error.message : error);
    console.log('');
    console.log('Please ensure:');
    console.log('1. PostgreSQL server is running');
    console.log('2. Database exists and credentials are correct');
    console.log('3. DATABASE_URL is properly configured');
    process.exit(1);
  }

  try {
    switch (command) {
      case 'seed':
        console.log('🌱 Seeding test database...');
        await seedTestData(prisma);
        console.log('✅ Test database seeded successfully!');
        break;

      case 'clean':
        console.log('🧹 Cleaning test database...');
        await cleanTestData(prisma);
        console.log('✅ Test database cleaned successfully!');
        break;

      case 'reset':
        console.log('🔄 Resetting test database...');
        await cleanTestData(prisma);
        await seedTestData(prisma);
        console.log('✅ Test database reset successfully!');
        break;

      default:
        console.log('Usage: npm run seed:test [seed|clean|reset]');
        console.log('  seed  - Add test data to the database');
        console.log('  clean - Remove all test data from the database');
        console.log('  reset - Clean and then seed the database');
        process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}
