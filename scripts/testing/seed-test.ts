/**
 * Script to seed the test database
 * Usage: yarn db:seed (seed), yarn db:clean (clean), yarn db:reset (reset)
 */

// Load test environment variables
import { config } from 'dotenv';
config({ path: '.env.test' });

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/**
 * Clean all test data from the database
 */
async function cleanTestData(prismaClient: PrismaClient) {
  console.log('🗑️  Deleting existing test data...');
  
  // Delete in order to respect foreign key constraints
  await prismaClient.ticket.deleteMany({});
  await prismaClient.event.deleteMany({});
  await prismaClient.user.deleteMany({});
  
  console.log('✨ Test data cleaned');
}

/**
 * Seed test data into the database
 */
async function seedTestData(prismaClient: PrismaClient) {
  console.log('🌱 Creating test data...');
  
  // Create test users
  const hashedPassword = await bcrypt.hash('Test1234!', 10);
  
  const adminUser = await prismaClient.user.create({
    data: {
      email: 'admin@test.com',
      name: 'Admin Test',
      password: hashedPassword,
      role: 'ADMIN',
      emailVerified: new Date(),
    },
  });

  const regularUser = await prismaClient.user.create({
    data: {
      email: 'user@test.com',
      name: 'User Test',
      password: hashedPassword,
      role: 'USER',
      emailVerified: new Date(),
    },
  });

  console.log('✅ Created test users');

  // Create test events
  const event1 = await prismaClient.event.create({
    data: {
      title: 'Test Concert',
      description: 'A test concert event',
      date: new Date('2025-12-01'),
      location: 'Test Venue',
      price: 50.0,
      availableTickets: 100,
      totalTickets: 100,
      category: 'CONCERT',
      imageUrl: '/images/test-event.jpg',
    },
  });

  const event2 = await prismaClient.event.create({
    data: {
      title: 'Test Conference',
      description: 'A test conference event',
      date: new Date('2025-12-15'),
      location: 'Test Conference Center',
      price: 75.0,
      availableTickets: 50,
      totalTickets: 50,
      category: 'CONFERENCE',
      imageUrl: '/images/test-conference.jpg',
    },
  });

  console.log('✅ Created test events');

  // Create test tickets
  await prismaClient.ticket.create({
    data: {
      userId: regularUser.id,
      eventId: event1.id,
      quantity: 2,
      totalPrice: 100.0,
      status: 'CONFIRMED',
    },
  });

  console.log('✅ Created test tickets');
  console.log(`
📊 Summary:
  - Users: 2 (1 admin, 1 regular user)
  - Events: 2
  - Tickets: 1

🔐 Test credentials:
  Admin: admin@test.com / Test1234!
  User: user@test.com / Test1234!
  `);
}

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
        console.log('Usage: yarn db:seed [seed|clean|reset]');
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

// Run main function
main();
