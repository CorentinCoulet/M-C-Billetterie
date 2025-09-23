// Global Prisma mock for integration tests
import { jest } from '@jest/globals';

// Create a comprehensive mock for all Prisma models
const createMockModel = () => ({
  findUnique: jest.fn(),
  findMany: jest.fn(),
  findFirst: jest.fn(),
  create: jest.fn(),
  createMany: jest.fn(),
  update: jest.fn(),
  updateMany: jest.fn(),
  upsert: jest.fn(),
  delete: jest.fn(),
  deleteMany: jest.fn(),
  count: jest.fn(),
  aggregate: jest.fn(),
  groupBy: jest.fn(),
});

export const mockPrisma: any = {
  // Connection methods
  $connect: jest.fn(),
  $disconnect: jest.fn(),
  $queryRaw: jest.fn(),
  $executeRaw: jest.fn(),
  $transaction: jest.fn().mockImplementation((callback: any) => callback(mockPrisma)),

  // All models from schema
  user: createMockModel(),
  organizer: createMockModel(),
  event: createMockModel(),
  order: createMockModel(),
  ticket: createMockModel(),
  payment: createMockModel(),
  category: createMockModel(),
  venue: createMockModel(),
  review: createMockModel(),
  teamMember: createMockModel(),
  theme: createMockModel(),
  qRCode: createMockModel(),
  activityLog: createMockModel(),
  eventLog: createMockModel(),
  notification: createMockModel(),
  session: createMockModel(),
  blockedUser: createMockModel(),
  translation: createMockModel(),
  securityLog: createMockModel(),
  passwordHistory: createMockModel(),
  loginAttempt: createMockModel(),
  systemBackup: createMockModel(),
  auditLog: createMockModel(),
  userSession: createMockModel(),
  blockedIP: createMockModel(),
};

// Export default mock
export default mockPrisma;
