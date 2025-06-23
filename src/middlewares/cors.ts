import { NextApiRequest, NextApiResponse } from 'next';
import { NextHandler } from 'next-connect';
import Cors from 'cors';

/**
 * CORS middleware configuration
 * Handles Cross-Origin Resource Sharing settings
 */

// Default CORS options
const defaultOptions = {
  // Allow requests from these origins
  origin: process.env.CORS_ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  
  // Allow these HTTP methods
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  
  // Allow these headers in requests
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  
  // Expose these headers in responses
  exposedHeaders: ['Content-Length', 'X-Total-Count'],
  
  // Allow credentials (cookies, authorization headers)
  credentials: true,
  
  // Cache preflight requests for 1 hour (in seconds)
  maxAge: 3600,
  
  // Handle preflight requests
  preflightContinue: false,
  
  // Return 204 for preflight requests
  optionsSuccessStatus: 204
};

/**
 * Initialize CORS middleware with default options
 */
export const cors = Cors(defaultOptions);

/**
 * Apply CORS middleware to a request
 */
export function applyCors(req: NextApiRequest, res: NextApiResponse, next: NextHandler) {
  return new Promise<void>((resolve, reject) => {
    cors(req, res, (result: Error | null) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve();
    });
  })
    .then(() => next())
    .catch((error) => {
      console.error('CORS error:', error);
      return res.status(500).json({ message: 'CORS configuration error' });
    });
}

/**
 * Create a custom CORS middleware with specific options
 */
export function createCorsMiddleware(options = {}) {
  const corsMiddleware = Cors({
    ...defaultOptions,
    ...options
  });

  return (req: NextApiRequest, res: NextApiResponse, next: NextHandler) => {
    return new Promise<void>((resolve, reject) => {
      corsMiddleware(req, res, (result: Error | null) => {
        if (result instanceof Error) {
          return reject(result);
        }
        return resolve();
      });
    })
      .then(() => next())
      .catch((error) => {
        console.error('CORS error:', error);
        return res.status(500).json({ message: 'CORS configuration error' });
      });
  };
}

/**
 * Middleware for allowing specific origins only
 */
export function allowOrigins(origins: string[]) {
  return createCorsMiddleware({ origin: origins });
}

/**
 * Middleware for allowing specific HTTP methods only
 */
export function allowMethods(methods: string[]) {
  return createCorsMiddleware({ methods });
}

/**
 * Middleware for allowing credentials (cookies, auth headers)
 */
export function allowCredentials(allow = true) {
  return createCorsMiddleware({ credentials: allow });
}