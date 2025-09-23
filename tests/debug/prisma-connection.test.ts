import { globalStorage } from '../mocks/prisma.mock';
import { testPrisma } from '../utils/setup';

describe('Debug: Prisma Connection', () => {
  it('should populate globalStorage when using testPrisma.create', async () => {
    console.log('=== DEBUG PRISMA CONNECTION ===');
    
    console.log('1. Initial state:');
    console.log('testPrisma exists:', !!testPrisma);
    console.log('testPrisma.user exists:', !!testPrisma.user);
    console.log('globalStorage exists:', !!globalStorage);
    console.log('Initial storage:', JSON.stringify(globalStorage, null, 2));

    console.log('\n2. Creating a user via testPrisma:');
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

    console.log('\n3. Storage after creation:');
    console.log('Storage:', JSON.stringify(globalStorage, null, 2));

    console.log('\n4. Finding users via testPrisma:');
    const users = await testPrisma.user.findMany({});
    console.log('Users found via testPrisma.findMany():', users);

    console.log('\n5. Direct storage access:');
    console.log('Direct globalStorage.user:', globalStorage.user);

    // Test expectations
    expect(globalStorage.user).toBeDefined();
    expect(globalStorage.user.length).toBeGreaterThan(0);
    expect(users.length).toBeGreaterThan(0);
    expect(users.length).toBe(globalStorage.user.length);
  });
});
