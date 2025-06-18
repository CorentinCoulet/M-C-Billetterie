import {PrismaClient} from '@prisma/client';
import {execSync} from 'child_process';
import {randomBytes} from 'crypto';

const prisma = new PrismaClient();

const generateTestDatabaseUrl = () => {
    const testDbName = `test_billetterie_${randomBytes(8).toString('hex')}`;
    const baseUrl = process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/billetterie';
    return baseUrl.replace(/\/[^\/]+(\?|$)/, `/${testDbName}$1`);
};

let testDatabaseUrl: string;

export async function setupTestDatabase() {
    try {
        testDatabaseUrl = generateTestDatabaseUrl();
        process.env.DATABASE_URL = testDatabaseUrl;

        console.log('🔧 Setting up test database...');

        // Apply Prisma migrations
        execSync('npx prisma migrate deploy', {
            env: {...process.env, DATABASE_URL: testDatabaseUrl},
            stdio: 'pipe'
        });

        console.log('✅ Test database setup complete');

        await seedTestData();

    } catch (error) {
        console.error('❌ Failed to setup test database:', error);
        throw error;
    }
}

export async function cleanupTestDatabase() {
    try {
        console.log('🧹 Cleaning up test database...');

        await prisma.$transaction([
            prisma.session.deleteMany(),
            prisma.passwordResetToken.deleteMany(),
            prisma.ticket.deleteMany(),
            prisma.order.deleteMany(),

            prisma.event.deleteMany(),
            prisma.user.deleteMany(),
        ]);

        console.log('✅ Test database cleanup complete');

    } catch (error) {
        console.error('❌ Failed to cleanup test database:', error);
    }
}

export async function resetTestDatabase() {
    await cleanupTestDatabase();
    await seedTestData();
}

async function seedTestData() {
    try {
        await prisma.user.upsert({
            where: {email: 'admin@test.com'},
            update: {},
            create: {
                email: 'admin@test.com',
                password: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LwlAKt9LXaOXwjk5G', // hashed "password123"
                name: 'Test Admin',
                role: 'ADMIN',
                isEmailVerified: true,
            },
        });

        console.log('📊 Seeded test data');

    } catch (error) {
        console.log('⚠️ Warning: Could not seed test data:', (error as Error).message);
    }
}

export function getTestPrismaClient() {
    return new PrismaClient({
        datasources: {
            db: {
                url: testDatabaseUrl || process.env.DATABASE_URL,
            },
        },
    });
}

// Jest hooks
export async function setupTests() {
    await setupTestDatabase();
}

export async function teardownTests() {
    await cleanupTestDatabase();
    await prisma.$disconnect();
}

export {prisma as testPrisma};