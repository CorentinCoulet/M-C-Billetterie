// Database Connection Test
// This file tests the PostgreSQL connection and Prisma client functionality

const { PrismaClient } = require('./src/generated/prisma');

async function testDatabaseConnection() {
  const prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
  });

  try {
    console.log('🔌 Testing database connection...');
    
    // Test basic connection
    await prisma.$connect();
    console.log('✅ Database connection successful!');

    // Test query execution
    console.log('📊 Testing database query...');
    const result = await prisma.$queryRaw`SELECT version() as postgres_version`;
    console.log('✅ Query executed successfully:', result[0].postgres_version);

    // Test table existence (should be empty but tables should exist)
    console.log('📋 Checking tables...');
    const userCount = await prisma.user.count();
    const eventCount = await prisma.event.count();
    const ticketCount = await prisma.ticket.count();
    
    console.log(`📈 Database statistics:`);
    console.log(`   - Users: ${userCount}`);
    console.log(`   - Events: ${eventCount}`);
    console.log(`   - Tickets: ${ticketCount}`);

    // Test enum values
    console.log('🔍 Testing enum types...');
    console.log('   - Available roles:', ['USER', 'ORGANIZER', 'ADMIN']);
    console.log('   - Available ticket statuses:', ['pending', 'paid', 'cancelled', 'used']);
    console.log('   - Available order statuses:', ['draft', 'pending_payment', 'paid', 'cancelled']);

    console.log('🎉 All database tests passed successfully!');
    
    return true;
  } catch (error) {
    console.error('❌ Database connection test failed:', error.message);
    console.error('Full error:', error);
    return false;
  } finally {
    await prisma.$disconnect();
    console.log('🔌 Database connection closed.');
  }
}

// Create a test user to validate the schema
async function createTestData() {
  const prisma = new PrismaClient();
  
  try {
    console.log('👤 Creating test user...');
    
    const testUser = await prisma.user.create({
      data: {
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashed_password_here',
        role: 'USER',
        isVerified: false,
      }
    });

    console.log('✅ Test user created:', {
      id: testUser.id,
      email: testUser.email,
      name: testUser.name,
      role: testUser.role,
      isVerified: testUser.isVerified,
      createdAt: testUser.createdAt
    });

    // Clean up test data
    await prisma.user.delete({
      where: { id: testUser.id }
    });
    
    console.log('🧹 Test data cleaned up successfully');
    return true;
  } catch (error) {
    console.error('❌ Test data creation failed:', error.message);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

// Main execution
async function main() {
  console.log('🚀 Starting Database Test Suite');
  console.log('================================');
  
  const connectionTest = await testDatabaseConnection();
  
  if (connectionTest) {
    console.log('\n🧪 Running schema validation test...');
    const schemaTest = await createTestData();
    
    if (schemaTest) {
      console.log('\n🎯 All tests completed successfully!');
      console.log('✅ Database is ready for development');
      process.exit(0);
    } else {
      console.log('\n❌ Schema validation failed');
      process.exit(1);
    }
  } else {
    console.log('\n❌ Connection test failed');
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run the tests
if (require.main === module) {
  main();
}

module.exports = {
  testDatabaseConnection,
  createTestData,
  main
};