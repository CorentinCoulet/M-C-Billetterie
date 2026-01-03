import { PrismaClient } from "../generated/prisma";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

/**
 * Configuration Prisma 7.x
 * L'URL de la base de données doit être passée via datasourceUrl
 * car env("DATABASE_URL") dans schema.prisma n'est plus supporté.
 */
export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL,
    log: process.env.NODE_ENV === "development" 
      ? ["query", "info", "warn", "error"] 
      : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;