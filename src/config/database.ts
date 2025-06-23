import { PrismaClient } from '@prisma/client';

/**
 * Database configuration using Prisma
 */

// Environment-specific configuration
const prismaConfig = {
  // Log queries in development mode
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'info', 'warn', 'error'] 
    : ['warn', 'error'],
  
  // Error formatting
  errorFormat: process.env.NODE_ENV === 'development' ? 'pretty' : 'minimal',
};

// Create Prisma client instance with configuration
const prisma = new PrismaClient(prismaConfig);

// Connection management
let isConnected = false;

/**
 * Connect to the database
 */
export async function connect() {
  if (isConnected) {
    return;
  }

  try {
    await prisma.$connect();
    isConnected = true;
    console.log('Database connected successfully');
  } catch (error) {
    console.error('Failed to connect to database:', error);
    throw error;
  }
}

/**
 * Disconnect from the database
 */
export async function disconnect() {
  if (!isConnected) {
    return;
  }

  try {
    await prisma.$disconnect();
    isConnected = false;
    console.log('Database disconnected successfully');
  } catch (error) {
    console.error('Failed to disconnect from database:', error);
    throw error;
  }
}

/**
 * Get connection status
 */
export function getConnectionStatus() {
  return isConnected;
}

/**
 * Execute a function within a transaction
 */
export async function transaction<T>(fn: (tx: PrismaClient) => Promise<T>): Promise<T> {
  return prisma.$transaction(async (tx) => {
    return fn(tx as unknown as PrismaClient);
  });
}

/**
 * Execute a function with automatic connection management
 */
export async function withConnection<T>(fn: () => Promise<T>): Promise<T> {
  try {
    await connect();
    return await fn();
  } finally {
    // In production, we might want to keep the connection open
    if (process.env.NODE_ENV !== 'production') {
      await disconnect();
    }
  }
}

// Export the Prisma client instance as default
export default prisma;

// Export database models for convenience
export const {
  user: User,
  event: Event,
  ticket: Ticket,
  order: Order,
  session: Session,
  venue: Venue,
  category: Category,
  ticketType: TicketType,
  payment: Payment,
} = prisma;