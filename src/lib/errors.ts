import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

/**
 * Error codes catalog
 * Organized by domain for easy reference and debugging
 */
export const ErrorCodes = {
  // Authentication & Authorization (AUTH_xxx)
  AUTH_INVALID_CREDENTIALS: 'AUTH_001',
  AUTH_TOKEN_EXPIRED: 'AUTH_002',
  AUTH_UNAUTHORIZED: 'AUTH_003',
  AUTH_FORBIDDEN: 'AUTH_004',
  AUTH_TOKEN_MISSING: 'AUTH_005',
  AUTH_TOKEN_INVALID: 'AUTH_006',
  AUTH_EMAIL_NOT_VERIFIED: 'AUTH_007',
  AUTH_ACCOUNT_DISABLED: 'AUTH_008',
  
  // Tickets (TICKET_xxx)
  TICKET_NOT_FOUND: 'TICKET_001',
  TICKET_ALREADY_USED: 'TICKET_002',
  TICKET_QR_INVALID: 'TICKET_003',
  TICKET_EXPIRED: 'TICKET_004',
  TICKET_EVENT_PASSED: 'TICKET_005',
  
  // Events (EVENT_xxx)
  EVENT_NOT_FOUND: 'EVENT_001',
  EVENT_NOT_PUBLISHED: 'EVENT_002',
  EVENT_FULL: 'EVENT_003',
  EVENT_CANCELLED: 'EVENT_004',
  
  // Orders (ORDER_xxx)
  ORDER_NOT_FOUND: 'ORDER_001',
  ORDER_ALREADY_PAID: 'ORDER_002',
  ORDER_EXPIRED: 'ORDER_003',
  ORDER_CANCELLED: 'ORDER_004',
  
  // Payments (PAY_xxx)
  PAYMENT_FAILED: 'PAY_001',
  PAYMENT_STRIPE_ERROR: 'PAY_002',
  PAYMENT_REFUND_FAILED: 'PAY_003',
  PAYMENT_WEBHOOK_INVALID: 'PAY_004',
  
  // Users (USER_xxx)
  USER_NOT_FOUND: 'USER_001',
  USER_ALREADY_EXISTS: 'USER_002',
  
  // Validation (VAL_xxx)
  VALIDATION_ERROR: 'VAL_001',
  
  // Generic (GEN_xxx)
  NOT_FOUND: 'GEN_001',
  CONFLICT: 'GEN_002',
  RATE_LIMIT: 'GEN_003',
  INTERNAL_ERROR: 'GEN_500',
  DATABASE_ERROR: 'GEN_501',
} as const;

/**
 * Custom error classes for the application
 */

/**
 * Base application error with error code support
 */
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public code: string;
  public details?: unknown;

  constructor(
    message: string, 
    statusCode: number = 500, 
    code?: string,
    details?: unknown,
    isOperational: boolean = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.code = code || ErrorCodes.INTERNAL_ERROR;
    this.details = details;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 400 Bad Request - Invalid input
 */
export class ValidationError extends AppError {
  public errors: any[];

  constructor(message: string = 'Validation error', errors: any[] = []) {
    super(message, 400, ErrorCodes.VALIDATION_ERROR, { errors });
    this.errors = errors;
    this.name = 'ValidationError';
  }
}

/**
 * 401 Unauthorized - Authentication error
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required', code?: string) {
    super(message, 401, code || ErrorCodes.AUTH_UNAUTHORIZED);
    this.name = 'AuthenticationError';
  }
}

/**
 * 403 Forbidden - Authorization error
 */
export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403, ErrorCodes.AUTH_FORBIDDEN);
    this.name = 'AuthorizationError';
  }
}

/**
 * 404 Not Found - Resource not found
 */
export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource', id?: string) {
    super(
      `${resource}${id ? ` with ID ${id}` : ''} not found`, 
      404, 
      ErrorCodes.NOT_FOUND
    );
    this.name = 'NotFoundError';
  }
}

/**
 * 409 Conflict - Resource already exists
 */
export class ConflictError extends AppError {
  constructor(message: string = 'Resource already exists') {
    super(message, 409, ErrorCodes.CONFLICT);
    this.name = 'ConflictError';
  }
}

/**
 * 429 Too Many Requests - Rate limit exceeded
 */
export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 429, ErrorCodes.RATE_LIMIT);
    this.name = 'RateLimitError';
  }
}

/**
 * 500 Internal Server Error - Database error
 */
export class DatabaseError extends AppError {
  constructor(message: string = 'Database error', details?: unknown) {
    super(message, 500, ErrorCodes.DATABASE_ERROR, details, true);
    this.name = 'DatabaseError';
  }
}

/**
 * 500 Internal Server Error - External service error
 */
export class ExternalServiceError extends AppError {
  public service: string;
  public originalError: any;

  constructor(service: string, message: string = 'External service error', originalError?: any) {
    super(`${service}: ${message}`, 500, ErrorCodes.INTERNAL_ERROR, { service, originalError }, true);
    this.service = service;
    this.originalError = originalError;
    this.name = 'ExternalServiceError';
  }
}

/**
 * 402 Payment Required - Payment error
 */
export class PaymentError extends AppError {
  constructor(message: string = 'Payment error', errorCode?: string, details?: unknown) {
    super(message, 402, errorCode || ErrorCodes.PAYMENT_FAILED, details);
    this.name = 'PaymentError';
  }
}

/**
 * 400 Bad Request - Invalid operation
 */
export class InvalidOperationError extends AppError {
  constructor(message: string = 'Invalid operation') {
    super(message, 400, ErrorCodes.VALIDATION_ERROR);
    this.name = 'InvalidOperationError';
  }
}

/**
 * 503 Service Unavailable - Service unavailable
 */
export class ServiceUnavailableError extends AppError {
  constructor(message: string = 'Service temporarily unavailable') {
    super(message, 503, ErrorCodes.INTERNAL_ERROR);
    this.name = 'ServiceUnavailableError';
  }
}

/**
 * Centralized error handler for Next.js API routes
 * Converts any error into a consistent JSON response with logging
 */
export function handleApiError(error: unknown, context?: Record<string, unknown>): NextResponse {
  // Handle AppError instances
  if (error instanceof AppError) {
    logger.warn({ 
      code: error.code, 
      statusCode: error.statusCode,
      message: error.message,
      details: error.details,
      ...context 
    }, 'Application error');
    
    return NextResponse.json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      }
    }, { status: error.statusCode });
  }
  
  // Handle Prisma errors
  if (error && typeof error === 'object' && 'code' in error) {
    const prismaError = error as { code: string; meta?: Record<string, unknown> };
    
    // P2002: Unique constraint violation
    if (prismaError.code === 'P2002') {
      logger.warn({ error, ...context }, 'Prisma unique constraint violation');
      return NextResponse.json({
        success: false,
        error: {
          code: ErrorCodes.CONFLICT,
          message: 'Resource already exists',
          details: prismaError.meta,
        }
      }, { status: 409 });
    }
    
    // P2025: Record not found
    if (prismaError.code === 'P2025') {
      logger.warn({ error, ...context }, 'Prisma record not found');
      return NextResponse.json({
        success: false,
        error: {
          code: ErrorCodes.NOT_FOUND,
          message: 'Resource not found',
        }
      }, { status: 404 });
    }
    
    // Generic Prisma error
    logger.error({ error, ...context }, 'Prisma database error');
    return NextResponse.json({
      success: false,
      error: {
        code: ErrorCodes.DATABASE_ERROR,
        message: 'Database operation failed',
      }
    }, { status: 500 });
  }
  
  // Handle standard Error instances
  if (error instanceof Error) {
    logger.error({ 
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      ...context 
    }, 'Unhandled error');
    
    return NextResponse.json({
      success: false,
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: process.env.NODE_ENV === 'production' 
          ? 'Internal server error' 
          : error.message,
      }
    }, { status: 500 });
  }
  
  // Handle unknown errors
  logger.error({ error, ...context }, 'Unknown error type');
  return NextResponse.json({
    success: false,
    error: {
      code: ErrorCodes.INTERNAL_ERROR,
      message: 'Internal server error',
    }
  }, { status: 500 });
}

/**
 * Async wrapper for route handlers with automatic error handling
 * 
 * @example
 * export const GET = asyncHandler(async (req, context) => {
 *   const data = await someService.getData();
 *   return NextApiResponse.success(data);
 * });
 */
export function asyncHandler(
  handler: (request: any, context?: any) => Promise<NextResponse>
) {
  return async (request: any, context?: any) => {
    try {
      return await handler(request, context);
    } catch (error) {
      return handleApiError(error, { 
        method: request.method,
        url: request.url,
        userId: context?.user?.id,
      });
    }
  };
}

/**
 * Helper to create common errors quickly
 */
export const CommonErrors = {
  notFound: (resource: string, id?: string) => 
    new NotFoundError(resource, id),
    
  unauthorized: (message = 'Unauthorized access', code?: string) =>
    new AuthenticationError(message, code),
    
  forbidden: (message = 'Access forbidden') =>
    new AuthorizationError(message),
    
  badRequest: (message: string, details?: unknown) =>
    new ValidationError(message, details as any[]),
    
  conflict: (message: string) =>
    new ConflictError(message),
    
  internal: (message = 'Internal server error') =>
    new AppError(message, 500, ErrorCodes.INTERNAL_ERROR),
};

/**
 * Format error response for API (legacy compatibility)
 */
export function formatErrorResponse(error: any) {
  // If it's an operational error (expected error), return it with appropriate status
  if (error instanceof AppError && error.isOperational) {
    const response: any = {
      status: 'error',
      message: error.message,
    };

    // Add validation errors if available
    if (error instanceof ValidationError && error.errors.length > 0) {
      response.errors = error.errors;
    }

    // Add error code for payment errors
    if (error instanceof PaymentError) {
      response.code = error.code;
    }

    return {
      statusCode: error.statusCode,
      body: response,
    };
  }

  // For unexpected errors, log them and return a generic error
  console.error('Unexpected error:', error);

  return {
    statusCode: 500,
    body: {
      status: 'error',
      message: 'An unexpected error occurred',
    },
  };
}

/**
 * Handle API errors (legacy - for Pages API compatibility)
 * @deprecated Use handleApiError with NextResponse for App Router
 */
export function handleApiErrorLegacy(error: any, res: any) {
  const { statusCode, body } = formatErrorResponse(error);
  return res.status(statusCode).json(body);
}

export default {
  AppError,
  ErrorCodes,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  DatabaseError,
  ExternalServiceError,
  PaymentError,
  InvalidOperationError,
  ServiceUnavailableError,
  CommonErrors,
  formatErrorResponse,
  handleApiError,
  handleApiErrorLegacy,
  asyncHandler,
};