/**
 * Temporary file to resolve missing imports and provide mocks
 * TODO: Remove this file after complete refactoring is done
 */

// Type definitions for better type safety
interface NextConnectInstance {
  get: (handler: any) => NextConnectInstance;
  post: (handler: any) => NextConnectInstance;
  put: (handler: any) => NextConnectInstance;
  delete: (handler: any) => NextConnectInstance;
  use: (middleware: any) => NextConnectInstance;
  handler: () => any;
}

interface JoiSchemaBuilder {
  required: () => JoiSchemaBuilder;
  optional: () => JoiSchemaBuilder;
  email: () => JoiSchemaBuilder;
}

interface JoiObjectSchema {
  validate: (value: any) => { error: null | Error; value: any };
}

// Re-export missing services
// Try to import emailService from the correct path, fallback to mock if not available
let emailService: any;
try {
  emailService = require('../lib/mailer').default;
} catch (error) {
  console.warn('emailService not found, using mock implementation');
  emailService = {
    sendEmail: async (options: any) => {
      console.warn('Email service is mocked - no actual email sent');
      return Promise.resolve({ success: true, messageId: 'mock-id' });
    }
  };
}

export { emailService };

// Enhanced mock for next-connect with proper typing
export const nc = (): NextConnectInstance => ({
  get: (handler: any) => nc(),
  post: (handler: any) => nc(),
  put: (handler: any) => nc(),
  delete: (handler: any) => nc(),
  use: (middleware: any) => nc(),
  handler: () => (req: any, res: any) => res.status(501).json({ error: 'Not implemented' })
});

// Mock for express-rate-limit with proper function signature
export const rateLimit = (options?: any) => (req: any, res: any, next: any) => {
  console.warn('Rate limiting is mocked - no actual rate limiting applied');
  next();
};

// Mock for Swagger JSDoc
export const swaggerJSDoc = (options?: any): Record<string, any> => {
  console.warn('Swagger JSDoc is mocked - returning empty specification');
  return {
    openapi: '3.0.0',
    info: {
      title: 'Mocked API',
      version: '1.0.0'
    },
    paths: {}
  };
};

// Mock for Swagger UI Express
export const swaggerUi = {
  setup: (swaggerDocument?: any, options?: any) => (req: any, res: any) => {
    res.status(503).send('Swagger UI is mocked - not available');
  },
  serve: [(req: any, res: any, next: any) => next()]
};

// Enhanced mock for Joi validation library
export const Joi = {
  object: (schema?: any): JoiObjectSchema => ({
    validate: (value: any) => {
      console.warn('Joi validation is mocked - no actual validation performed');
      return { error: null, value };
    }
  }),
  string: (): JoiSchemaBuilder => ({
    required: () => Joi.string(),
    optional: () => Joi.string(),
    email: () => Joi.string()
  }),
  number: (): JoiSchemaBuilder => ({
    required: () => Joi.number(),
    optional: () => Joi.number(),
    email: () => Joi.number() // This doesn't make sense but keeping for compatibility
  }),
  boolean: (): JoiSchemaBuilder => ({
    required: () => Joi.boolean(),
    optional: () => Joi.boolean(),
    email: () => Joi.boolean() // This doesn't make sense but keeping for compatibility
  })
};

// Installation commands for missing modules
export const MISSING_MODULES = {
  'next-connect': 'npm install next-connect@0.13.0',
  'express-rate-limit': 'npm install express-rate-limit@6.7.0',
  'express-session': 'npm install express-session@1.17.3 @types/express-session@1.17.7',
  'swagger-jsdoc': 'npm install swagger-jsdoc@6.2.8',
  'swagger-ui-express': 'npm install swagger-ui-express@4.6.3 @types/swagger-ui-express@4.1.3',
  'joi': 'npm install joi@17.9.2'
} as const;

// Helper function to install all missing modules
export const installMissingModules = (): string[] => {
  return Object.values(MISSING_MODULES);
};

// Default export with all mocks and utilities
export default {
  nc,
  rateLimit,
  swaggerJSDoc,
  swaggerUi,
  Joi,
  emailService,
  MISSING_MODULES,
  installMissingModules
} as const;
