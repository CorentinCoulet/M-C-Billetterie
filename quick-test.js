// Quick Database Connection Test with explicit URL
const { PrismaClient } = require('./src/generated/prisma');

async function quickTest() {
  // Override DATABASE_URL for testing
  process.env.DATABASE_URL = 'postgresql://postgres:postgres123@localhost:5432/billetterie';
  
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: 'postgresql://postgres:postgres123@localhost:5432/billetterie'
      }
    }
  });

  try {
    console.log('🔌 Testing with explicit URL...');
    await prisma.$connect();
    console.log('✅ Connection successful!');
    
    const result = await prisma.$queryRaw`SELECT 'Hello from PostgreSQL!' as message`;
    console.log('✅ Query result:', result[0].message);
    
    const userCount = await prisma.user.count();
    console.log('✅ User count:', userCount);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

quickTest();