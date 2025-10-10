/**
 * Type helpers for the logging system
 * Allows proper typing of logger arguments
 */

/**
 * Type for structured log data
 */
export type LogData = Record<string, unknown>;

/**
 * Type for log errors
 */
export type LogError = Error | unknown;

/**
 * Helper to safely cast errors
 */
export function asLogError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }
  return new Error(String(error));
}

/**
 * Helper to safely cast log data
 */
export function asLogData(data: Record<string, unknown>): LogData {
  return data;
}

/**
 * Helper to extract error message
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

/**
 * Helper to extract stack trace
 */
export function getErrorStack(error: unknown): string | undefined {
  if (error instanceof Error) {
    return error.stack;
  }
  return undefined;
}

/**
 * Type for secure log contexts
 */
export interface LogContext {
  userId?: string;
  ip?: string;
  path?: string;
  method?: string;
  statusCode?: number;
  duration?: number;
  [key: string]: unknown;
}

/**
 * Helper to create a secure log context
 */
export function createLogContext(context: Partial<LogContext>): LogContext {
  return {
    ...context,
    timestamp: new Date().toISOString()
  };
}
