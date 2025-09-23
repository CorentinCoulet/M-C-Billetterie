import { NextApiRequest, NextApiResponse } from 'next';
import { v4 as uuidv4 } from 'uuid';

// Define NextHandler type since we removed next-connect
type NextHandler = (error?: any) => void;

/**
 * Logging middleware
 * Logs incoming requests and their responses
 */

// Log levels
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

// Log entry structure
interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  method: string;
  url: string;
  ip: string;
  userId?: string;
  userAgent?: string;
  requestBody?: any;
  responseStatus?: number;
  responseTime?: number;
  message: string;
  error?: any;
}

// Default log formatter
const defaultFormatter = (entry: LogEntry): string => {
  return JSON.stringify(entry);
};

// Default log writer (console)
const defaultWriter = (entry: LogEntry, formattedEntry: string): void => {
  switch (entry.level) {
    case LogLevel.ERROR:
      console.error(formattedEntry);
      break;
    case LogLevel.WARN:
      console.warn(formattedEntry);
      break;
    case LogLevel.INFO:
      console.info(formattedEntry);
      break;
    case LogLevel.DEBUG:
    default:
      console.debug(formattedEntry);
      break;
  }
};

// Logging options
interface LoggingOptions {
  level?: LogLevel;
  formatter?: (entry: LogEntry) => string;
  writer?: (entry: LogEntry, formattedEntry: string) => void;
  logRequestBody?: boolean;
  excludePaths?: string[];
  sensitiveHeaders?: string[];
  sensitiveBodyFields?: string[];
}

/**
 * Create a request logger middleware
 */
export function createRequestLogger(options: LoggingOptions = {}) {
  const {
    level = LogLevel.INFO,
    formatter = defaultFormatter,
    writer = defaultWriter,
    logRequestBody = false,
    excludePaths = ['/api/health', '/api/metrics'],
    sensitiveHeaders = ['authorization', 'cookie'],
    sensitiveBodyFields = ['password', 'token', 'secret', 'creditCard']
  } = options;

  return (req: NextApiRequest, res: NextApiResponse, next: NextHandler) => {
    // Skip logging for excluded paths
    const url = req.url || '';
    if (excludePaths.some(path => url.includes(path))) {
      return next();
    }

    // Generate unique request ID
    const requestId = uuidv4();
    const startTime = Date.now();

    // Capture original response methods
    const originalEnd = res.end;
    const originalJson = res.json;
    const originalSend = res.send;

    // Create base log entry
    const baseEntry: Partial<LogEntry> = {
      id: requestId,
      timestamp: new Date().toISOString(),
      level,
      method: req.method || 'UNKNOWN',
      url,
      ip: req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || 'unknown',
      userAgent: req.headers['user-agent'],
      userId: (req as any).user?.id
    };

    // Log request
    if (level === LogLevel.DEBUG) {
      const requestEntry: LogEntry = {
        ...baseEntry,
        message: `Incoming request: ${req.method} ${url}`,
        level: LogLevel.DEBUG
      } as LogEntry;

      if (logRequestBody && req.body) {
        // Clone and sanitize request body
        const sanitizedBody = { ...req.body };
        sensitiveBodyFields.forEach(field => {
          if (sanitizedBody[field]) {
            sanitizedBody[field] = '***REDACTED***';
          }
        });
        requestEntry.requestBody = sanitizedBody;
      }

      const formattedEntry = formatter(requestEntry);
      writer(requestEntry, formattedEntry);
    }

    // Override response methods to capture response data
    res.end = function(this: NextApiResponse, ...args: any[]) {
      const responseTime = Date.now() - startTime;
      
      const responseEntry: LogEntry = {
        ...baseEntry,
        responseStatus: res.statusCode,
        responseTime,
        message: `Response sent: ${req.method} ${url} ${res.statusCode} (${responseTime}ms)`,
        level: res.statusCode >= 500 ? LogLevel.ERROR : 
               res.statusCode >= 400 ? LogLevel.WARN : 
               LogLevel.INFO
      } as LogEntry;

      const formattedEntry = formatter(responseEntry);
      writer(responseEntry, formattedEntry);
      
      return originalEnd.apply(this, args);
    };

    res.json = function(this: NextApiResponse, body: any) {
      return originalJson.call(this, body);
    };

    res.send = function(this: NextApiResponse, body: any) {
      return originalSend.call(this, body);
    };

    // Continue to next middleware
    return next();
  };
}

/**
 * Default request logger middleware
 */
export const requestLogger = createRequestLogger();

/**
 * Log an error
 */
export function logError(error: Error, req?: NextApiRequest, message?: string) {
  const entry: LogEntry = {
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    level: LogLevel.ERROR,
    method: req?.method || 'UNKNOWN',
    url: req?.url || 'UNKNOWN',
    ip: req?.headers['x-forwarded-for'] as string || req?.socket.remoteAddress || 'unknown',
    userId: (req as any)?.user?.id,
    message: message || `Error: ${error.message}`,
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack
    }
  };

  const formattedEntry = defaultFormatter(entry);
  defaultWriter(entry, formattedEntry);
}