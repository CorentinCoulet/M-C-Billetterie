// Simple debug test to see if our mock is working
const { globalStorage, getSharedMockPrisma } = require('./debug-mock.js');

async function debug() {
  console.log('=== DEBUGGING MOCK PRISMA ===');
  
  // Get the mock
  const mockPrisma = getSharedMockPrisma();
  console.log('Mock Prisma:', !!mockPrisma);
  console.log('Mock Prisma.user:', !!mockPrisma.user);
  console.log('Mock Prisma.user.create:', !!mockPrisma.user.create);
  
  // Check initial storage
  console.log('Initial storage:', globalStorage);
  
  // Try to create a user
  try {
    console.log('Creating user...');
    const user = await mockPrisma.user.create({
      data: {
        email: 'test@example.com',
        password: 'hashedPassword',
        name: 'Test User',
        role: 'USER',
        isVerified: true
      }
    });
    
    console.log('Created user:', user);
    console.log('Storage after user creation:', globalStorage);
    
    // Try to find the user
    const foundUser = await mockPrisma.user.findUnique({
      where: { id: user.id }
    });
    console.log('Found user:', foundUser);
    
  } catch (error) {
    console.error('Error creating user:', error);
  }
}

debug().catch(console.error);
