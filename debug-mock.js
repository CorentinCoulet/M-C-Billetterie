/**
 * Debug version of the Prisma mock for direct testing
 */

// Storage global partagé pour toutes les instances  
const globalStorage = {};
let globalIdCounters = {};

// Function to reset the global storage (useful for tests)
const resetMockPrismaStorage = () => {
  Object.keys(globalStorage).forEach(key => {
    globalStorage[key] = [];
  });
  globalIdCounters = {};
};

// Mock complet de Prisma qui évite les problèmes de hoisting
const createMockPrisma = () => {
  const createModel = (modelName) => {
    if (!globalStorage[modelName]) {
      globalStorage[modelName] = [];
    }

    return {
      create: async (args) => {
        if (!globalIdCounters[modelName]) globalIdCounters[modelName] = 1;
        const newRecord = { id: globalIdCounters[modelName]++, ...args?.data };
        globalStorage[modelName].push(newRecord);
        return newRecord;
      },
      findUnique: async (args) => {
        const record = globalStorage[modelName].find(item => {
          if (args?.where?.id) return item.id === args.where.id;
          const whereKeys = Object.keys(args?.where || {});
          return whereKeys.every(key => item[key] === args.where[key]);
        });
        return record || null;
      },
      findMany: async (args) => {
        console.log(`DEBUG MOCK findMany ${modelName}: called with args:`, args);
        console.log(`DEBUG MOCK findMany ${modelName}: current storage:`, globalStorage[modelName]);
        
        let records = [...globalStorage[modelName]];
        if (args?.where) {
          console.log(`DEBUG MOCK findMany ${modelName}: filtering with where:`, args.where);
          records = records.filter(item => {
            const whereKeys = Object.keys(args.where);
            const matches = whereKeys.every(key => item[key] === args.where[key]);
            console.log(`DEBUG MOCK findMany ${modelName}: item ${item.id} matches:`, matches, 'item:', item, 'where:', args.where);
            return matches;
          });
        }
        console.log(`DEBUG MOCK findMany ${modelName}: returning:`, records);
        return records;
      }
    };
  };

  const mockPrisma = {
    user: createModel('user'),
    event: createModel('event'),
    ticket: createModel('ticket'),
    organizer: createModel('organizer'),
  };

  return mockPrisma;
};

// Get the shared instance
let sharedMockPrisma = null;
const getSharedMockPrisma = () => {
  if (!sharedMockPrisma) {
    sharedMockPrisma = createMockPrisma();
  }
  return sharedMockPrisma;
};

module.exports = {
  globalStorage,
  resetMockPrismaStorage,
  getSharedMockPrisma,
  createMockPrisma
};
