import { NextApiRequest, NextApiResponse } from 'next';
import { logError } from './logging';
import { PrismaClientKnownRequestError, PrismaClientValidationError } from '@prisma/client/runtime/library';

// Define NextHandler type for Pages Router middleware compatibility
export type NextHandler = (error?: any) => void;

/**
 * Error handling middleware
 * Provides centralized error handling for the API
 */

// Custom error class for API errors
export class ApiError extends Error {
  statusCode: number;
  code?: string;
  details?: any;

  constructor(message: string, statusCode: number, code?: string, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

// Common API errors
export const ApiErrors = {
  BadRequest: (message = 'Bad request', code?: string, details?: any) => 
    new ApiError(message, 400, code || 'BAD_REQUEST', details),
  
  Unauthorized: (message = 'Unauthorized', code?: string, details?: any) => 
    new ApiError(message, 401, code || 'UNAUTHORIZED', details),
  
  Forbidden: (message = 'Forbidden', code?: string, details?: any) => 
    new ApiError(message, 403, code || 'FORBIDDEN', details),
  
  NotFound: (message = 'Resource not found', code?: string, details?: any) => 
    new ApiError(message, 404, code || 'NOT_FOUND', details),
  
  Conflict: (message = 'Resource conflict', code?: string, details?: any) => 
    new ApiError(message, 409, code || 'CONFLICT', details),
  
  TooManyRequests: (message = 'Too many requests', code?: string, details?: any) => 
    new ApiError(message, 429, code || 'TOO_MANY_REQUESTS', details),
  
  InternalServerError: (message = 'Internal server error', code?: string, details?: any) => 
    new ApiError(message, 500, code || 'INTERNAL_SERVER_ERROR', details),
};

/**
 * Format error response based on error type
 */
function formatErrorResponse(error: any) {
  // If it's already an ApiError, use its properties
  if (error instanceof ApiError) {
    return {
      message: error.message,
      code: error.code,
      details: error.details,
      statusCode: error.statusCode
    };
  }

  // Handle Prisma errors
  if (error instanceof PrismaClientKnownRequestError) {
    // Handle specific Prisma error codes
    switch (error.code) {
      case 'P2002': // Unique constraint failed
        return {
          message: 'A record with this data already exists',
          code: 'UNIQUE_CONSTRAINT_FAILED',
          details: error.meta,
          statusCode: 409
        };
      case 'P2025': // Record not found
        return {
          message: 'Record not found',
          code: 'RECORD_NOT_FOUND',
          details: error.meta,
          statusCode: 404
        };
      default:
        return {
          message: 'Database error',
          code: `PRISMA_${error.code}`,
          details: error.meta,
          statusCode: 500
        };
    }
  }

  if (error instanceof PrismaClientValidationError) {
    return {
      message: 'Invalid data provided',
      code: 'VALIDATION_ERROR',
      details: error.message,
      statusCode: 400
    };
  }

  // Handle validation errors (e.g., from Joi)
  if (error.name === 'ValidationError') {
    return {
      message: 'Validation error',
      code: 'VALIDATION_ERROR',
      details: error.details || error.message,
      statusCode: 400
    };
  }

  // Handle JWT errors
  if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
    return {
      message: error.message,
      code: error.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN',
      statusCode: 401
    };
  }

  // Default to internal server error for unhandled errors
  return {
    message: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : error.message || 'Unknown error',
    code: 'INTERNAL_SERVER_ERROR',
    statusCode: 500
  };
}

/**
 * Error handler middleware
 */
export function errorHandler(err: any, req: NextApiRequest, res: NextApiResponse, next: NextHandler) {
  // Log the error
  logError(err, req);

  // Format the error response
  const errorResponse = formatErrorResponse(err);

  // Send the error response
  return res.status(errorResponse.statusCode).json({
    error: {
      message: errorResponse.message,
      code: errorResponse.code,
      ...(process.env.NODE_ENV !== 'production' && errorResponse.details && { details: errorResponse.details }),
      ...(process.env.NODE_ENV !== 'production' && err.stack && { stack: err.stack.split('\n') })
    }
  });
}

/**
 * Not found handler - for routes that don't exist
 */
export function notFoundHandler(req: NextApiRequest, res: NextApiResponse) {
  const error = ApiErrors.NotFound(`Route not found: ${req.method} ${req.url}`);
  return errorHandler(error, req, res, () => {});
}

/**
 * Async error wrapper for route handlers
 */
export function asyncHandler(fn: (req: NextApiRequest, res: NextApiResponse, next: NextHandler) => Promise<any>) {
  return (req: NextApiRequest, res: NextApiResponse, next: NextHandler) => {
    Promise.resolve(fn(req, res, next)).catch(err => next(err));
  };
}