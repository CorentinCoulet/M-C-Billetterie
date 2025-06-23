import { PrismaClient } from "@prisma/client";

// Prevent multiple instances of Prisma Client in development
const globalForPrisma = global as unknown as { prisma: PrismaClient };

/**
 * Prisma client instance with logging configuration
 */
export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === "development" 
      ? ["query", "info", "warn", "error"] 
      : ["error"],
  });

// In development, attach prisma to the global object
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

/**
 * Execute a database operation with automatic retries
 * Useful for handling transient database connection issues
 */
export async function executeWithRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 500
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      // Only retry on connection errors or deadlocks
      const isRetryableError = 
        error.code === 'P1001' || // Connection error
        error.code === 'P1002' || // Connection timed out
        error.code === 'P1008' || // Operations timed out
        error.code === 'P1017' || // Server closed the connection
        error.code === 'P2034';   // Transaction deadlock
      
      if (!isRetryableError) {
        throw error;
      }
      
      console.warn(
        `Database operation failed (attempt ${attempt}/${maxRetries}): ${error.message}. Retrying in ${delayMs}ms...`
      );
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
    }
  }
  
  throw lastError;
}

/**
 * Execute a database transaction with automatic retries
 */
export async function executeTransactionWithRetry<T>(
  transactionFn: (tx: PrismaClient) => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 500
): Promise<T> {
  return executeWithRetry(
    () => prisma.$transaction(transactionFn as any),
    maxRetries,
    delayMs
  );
}

/**
 * Check database connection
 */
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    // Simple query to check if database is accessible
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database connection check failed:', error);
    return false;
  }
}

export default prisma;