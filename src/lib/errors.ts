/**
 * Custom error classes for the application
 */

/**
 * Base application error
 */
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
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
    super(message, 400);
    this.errors = errors;
    this.name = 'ValidationError';
  }
}

/**
 * 401 Unauthorized - Authentication error
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401);
    this.name = 'AuthenticationError';
  }
}

/**
 * 403 Forbidden - Authorization error
 */
export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403);
    this.name = 'AuthorizationError';
  }
}

/**
 * 404 Not Found - Resource not found
 */
export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404);
    this.name = 'NotFoundError';
  }
}

/**
 * 409 Conflict - Resource already exists
 */
export class ConflictError extends AppError {
  constructor(message: string = 'Resource already exists') {
    super(message, 409);
    this.name = 'ConflictError';
  }
}

/**
 * 429 Too Many Requests - Rate limit exceeded
 */
export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 429);
    this.name = 'RateLimitError';
  }
}

/**
 * 500 Internal Server Error - Database error
 */
export class DatabaseError extends AppError {
  constructor(message: string = 'Database error') {
    super(message, 500, true);
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
    super(`${service}: ${message}`, 500, true);
    this.service = service;
    this.originalError = originalError;
    this.name = 'ExternalServiceError';
  }
}

/**
 * 402 Payment Required - Payment error
 */
export class PaymentError extends AppError {
  public code: string;

  constructor(message: string = 'Payment error', code: string = 'payment_failed') {
    super(message, 402);
    this.code = code;
    this.name = 'PaymentError';
  }
}

/**
 * 400 Bad Request - Invalid operation
 */
export class InvalidOperationError extends AppError {
  constructor(message: string = 'Invalid operation') {
    super(message, 400);
    this.name = 'InvalidOperationError';
  }
}

/**
 * 503 Service Unavailable - Service unavailable
 */
export class ServiceUnavailableError extends AppError {
  constructor(message: string = 'Service temporarily unavailable') {
    super(message, 503);
    this.name = 'ServiceUnavailableError';
  }
}

/**
 * Format error response for API
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
 * Handle API errors
 */
export function handleApiError(error: any, res: any) {
  const { statusCode, body } = formatErrorResponse(error);
  return res.status(statusCode).json(body);
}

export default {
  AppError,
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
  formatErrorResponse,
  handleApiError,
};