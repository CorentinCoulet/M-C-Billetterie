// Storage global partagé pour toutes les instances
const globalStorage: Record<string, any[]> = {};
let globalIdCounters: Record<string, number> = {};

// Singleton instance
let sharedMockPrisma: any = null;

// Function to generate UUID-like IDs
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Export the global storage for debugging
export { globalStorage };

// Function to reset the global storage (useful for tests)
export const resetMockPrismaStorage = () => {
  Object.keys(globalStorage).forEach(key => {
    globalStorage[key] = [];
  });
  globalIdCounters = {};
};

// Function to get the shared instance
export const getSharedMockPrisma = () => {
  if (!sharedMockPrisma) {
    sharedMockPrisma = createMockPrisma();
  }
  return sharedMockPrisma;
};

// Mock complet de Prisma qui évite les problèmes de hoisting
export const createMockPrisma = () => {
  const createModel = (modelName: string) => {
    if (!globalStorage[modelName]) {
      globalStorage[modelName] = [];
    }

    return {
      create: jest.fn().mockImplementation((args: any) => {
        const newRecord = { 
          id: generateUUID(), 
          createdAt: new Date(),
          updatedAt: new Date(),
          ...args?.data 
        };
        globalStorage[modelName].push(newRecord);
        return Promise.resolve(newRecord);
      }),
      findUnique: jest.fn().mockImplementation((args: any) => {
        const record = globalStorage[modelName].find(item => {
          if (args?.where?.id) {
            return item.id === args.where.id;
          }
          const whereKeys = Object.keys(args?.where || {});
          return whereKeys.every(key => item[key] === args.where[key]);
        });
        
        // If include is specified, we return the record as-is since we're mocking
        // In a real scenario, this would populate the relations
        if (record && args?.include) {
          return Promise.resolve({
            ...record,
            // Mock the includes with empty objects/arrays to avoid null access
            order: args.include.order ? { 
              id: 'mock-order-id',
              user: args.include.order.user ? { id: 'mock-user-id' } : undefined,
              tickets: args.include.order.tickets ? [] : undefined
            } : undefined
          });
        }
        
        return Promise.resolve(record || null);
      }),
      findFirst: jest.fn().mockImplementation((args: any) => {
        const record = globalStorage[modelName].find(item => {
          if (!args?.where) return true;
          const whereKeys = Object.keys(args.where);
          return whereKeys.every(key => item[key] === args.where[key]);
        });
        return Promise.resolve(record || null);
      }),
      findMany: jest.fn().mockImplementation((args: any) => {
        let records = [...globalStorage[modelName]];
        if (args?.where) {
          records = records.filter(item => {
            const whereKeys = Object.keys(args.where);
            return whereKeys.every(key => item[key] === args.where[key]);
          });
        }
        return Promise.resolve(records);
      }),
      update: jest.fn().mockImplementation((args: any) => {
        const index = globalStorage[modelName].findIndex(item => {
          if (args?.where?.id) return item.id === args.where.id;
          const whereKeys = Object.keys(args?.where || {});
          return whereKeys.every(key => item[key] === args.where[key]);
        });
        if (index !== -1) {
          globalStorage[modelName][index] = { 
            ...globalStorage[modelName][index], 
            ...args?.data,
            updatedAt: new Date()
          };
          return Promise.resolve(globalStorage[modelName][index]);
        }
        // Throw error if record not found (like real Prisma does)
        return Promise.reject(new Error(`Record to update not found.`));
      }),
      delete: jest.fn().mockImplementation((args: any) => {
        const index = globalStorage[modelName].findIndex(item => {
          if (args?.where?.id) return item.id === args.where.id;
          const whereKeys = Object.keys(args?.where || {});
          return whereKeys.every(key => item[key] === args.where[key]);
        });
        if (index !== -1) {
          const deleted = globalStorage[modelName].splice(index, 1)[0];
          return Promise.resolve(deleted);
        }
        return Promise.resolve(null);
      }),
      deleteMany: jest.fn().mockImplementation((args: any) => {
        const initialLength = globalStorage[modelName].length;
        if (!args?.where) {
          globalStorage[modelName] = [];
        } else {
          globalStorage[modelName] = globalStorage[modelName].filter(item => {
            const whereKeys = Object.keys(args.where);
            return !whereKeys.every(key => item[key] === args.where[key]);
          });
        }
        return Promise.resolve({ count: initialLength - globalStorage[modelName].length });
      }),
      upsert: jest.fn().mockImplementation((args: any) => {
        const existing = globalStorage[modelName].find(item => {
          const whereKeys = Object.keys(args?.where || {});
          return whereKeys.every(key => item[key] === args.where[key]);
        });
        if (existing) {
          Object.assign(existing, args?.update);
          return Promise.resolve(existing);
        } else {
          const newRecord = { 
            id: generateUUID(), 
            createdAt: new Date(),
            updatedAt: new Date(),
            ...args?.create 
          };
          globalStorage[modelName].push(newRecord);
          return Promise.resolve(newRecord);
        }
      }),
      count: jest.fn().mockImplementation((args: any) => {
        let count = globalStorage[modelName].length;
        if (args?.where) {
          count = globalStorage[modelName].filter(item => {
            const whereKeys = Object.keys(args.where);
            return whereKeys.every(key => item[key] === args.where[key]);
          }).length;
        }
        return Promise.resolve(count);
      }),
      aggregate: jest.fn().mockResolvedValue({
        _sum: { totalPrice: 0 },
        _count: { id: 0 },
        _avg: { totalPrice: 0 },
        _max: { totalPrice: 0 },
        _min: { totalPrice: 0 }
      }),
      groupBy: jest.fn().mockResolvedValue([]),
    };
  };
  const mockPrisma = {
    user: createModel('user'),
    event: createModel('event'),
    ticket: createModel('ticket'),
    order: createModel('order'),
    payment: createModel('payment'),
    paymentCharge: createModel('paymentCharge'),
    auditLog: createModel('auditLog'),
    securityLog: createModel('securityLog'),
    organizer: createModel('organizer'),
    venue: createModel('venue'),
    category: createModel('category'),
    blockedUser: createModel('blockedUser'),
    userSession: createModel('userSession'),
    session: createModel('session'),
    loginAttempt: createModel('loginAttempt'),
    teamMember: createModel('teamMember'),
    eventCreated: createModel('eventCreated'),
    $transaction: jest.fn(),
    $disconnect: jest.fn(),
    $connect: jest.fn(),
    $executeRaw: jest.fn(),
    $queryRaw: jest.fn(),
    $executeRawUnsafe: jest.fn(),
    $queryRawUnsafe: jest.fn(),
  };

  // Set default return values
  Object.keys(mockPrisma).forEach(key => {
    const modelOrMethod = (mockPrisma as any)[key];
    if (typeof modelOrMethod === 'object' && modelOrMethod !== null) {
      Object.keys(modelOrMethod).forEach(method => {
        if (jest.isMockFunction(modelOrMethod[method])) {
          switch (method) {
            // case 'findMany':
            //   modelOrMethod[method].mockResolvedValue([]);
            //   break;
            case 'count':
              modelOrMethod[method].mockResolvedValue(0);
              break;
            case 'deleteMany':
              modelOrMethod[method].mockResolvedValue({ count: 0 });
              break;
            case 'findUnique':
            case 'findFirst':
              modelOrMethod[method].mockResolvedValue(null);
              break;
            // case 'create':
            // case 'update':
            // case 'upsert':
            //   modelOrMethod[method].mockImplementation((args: any) => 
            //     Promise.resolve({ id: 1, ...args?.data })
            //   );
            //   break;
            case 'delete':
              modelOrMethod[method].mockResolvedValue({ id: 1 });
              break;
            case 'aggregate':
              modelOrMethod[method].mockResolvedValue({
                _sum: { totalPrice: 0 },
                _count: { id: 0 },
                _avg: { totalPrice: 0 },
                _max: { totalPrice: 0 },
                _min: { totalPrice: 0 }
              });
              break;
            case 'groupBy':
              modelOrMethod[method].mockResolvedValue([]);
              break;
            default:
              if (method !== 'create' && method !== 'update' && method !== 'upsert' && method !== 'findMany') {
                modelOrMethod[method].mockResolvedValue({});
              }
              break;
          }
        }
      });
    }
  });

  // Special cases
  mockPrisma.$transaction.mockImplementation((fn) => typeof fn === 'function' ? fn(mockPrisma) : Promise.resolve(fn));
  mockPrisma.$disconnect.mockResolvedValue(undefined);
  mockPrisma.$connect.mockResolvedValue(undefined);

  return mockPrisma;
};

// Export global mock instance
export const mockPrisma = createMockPrisma();

// Export for use in jest.mock()
export default mockPrisma;
