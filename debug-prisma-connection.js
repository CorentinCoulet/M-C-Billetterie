const { testPrisma } = require('./tests/utils/setup');
const { globalStorage } = require('./tests/mocks/prisma.mock');

console.log('=== TESTING PRISMA CONNECTION ===');

async function testPrismaConnection() {
  console.log('1. Initial state:');
  console.log('testPrisma:', !!testPrisma);
  console.log('testPrisma.user:', !!testPrisma.user);
  console.log('globalStorage exists:', !!globalStorage);
  console.log('Initial storage:', JSON.stringify(globalStorage, null, 2));

  console.log('\n2. Creating a user via testPrisma:');
  try {
    const user = await testPrisma.user.create({
      data: {
        email: 'debug@example.com',
        password: 'test123',
        name: 'Debug User',
        role: 'USER',
        isVerified: true
      }
    });
    console.log('User created:', user);
  } catch (error) {
    console.error('Error creating user:', error);
  }

  console.log('\n3. Storage after creation:');
  console.log('Storage:', JSON.stringify(globalStorage, null, 2));

  console.log('\n4. Finding users via testPrisma:');
  try {
    const users = await testPrisma.user.findMany({});
    console.log('Users found via testPrisma.findMany():', users);
  } catch (error) {
    console.error('Error finding users:', error);
  }

  console.log('\n5. Direct storage access:');
  console.log('Direct globalStorage.user:', globalStorage.user);
}

testPrismaConnection().catch(console.error);
