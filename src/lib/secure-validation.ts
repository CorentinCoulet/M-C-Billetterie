import DOMPurify from 'isomorphic-dompurify';
import { z } from 'zod';
import { safeLogger } from '../lib/logger';

/**
 * Advanced Input Validation and Sanitization
 * Prevents injection attacks and ensures data integrity
 */

// Custom validation errors
export class ValidationError extends Error {
  constructor(
    message: string,
    public field?: string,
    public value?: any,
    public code?: string
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Dangerous patterns that should be rejected
const DANGEROUS_PATTERNS = [
  // SQL Injection
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
  /(--|\/\*|\*\/|;|'|")/,
  /(\b(OR|AND)\s+\d+\s*=\s*\d+)/i,
  
  // XSS
  /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
  /<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi,
  /javascript:/gi,
  /vbscript:/gi,
  /data:text\/html/gi,
  /on\w+\s*=/gi,
  
  // Command Injection
  /(\||&|;|\$\(|\`)/,
  /(rm|del|format|shutdown|reboot|kill)/i,
  
  // Path Traversal
  /\.\.(\/|\\)/,
  /(\/etc\/passwd|\/etc\/shadow|\/windows\/system32)/i,
  
  // LDAP Injection
  /(\(|\)|\*|\\|\|)/,
  
  // XML/XXE
  /<!ENTITY/i,
  /<!DOCTYPE.*\[/i
];

// File type validation
const ALLOWED_FILE_TYPES = new Set([
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/csv',
  'application/json'
]);

const DANGEROUS_FILE_EXTENSIONS = new Set([
  '.exe', '.bat', '.cmd', '.scr', '.pif', '.com',
  '.vbs', '.js', '.jar', '.app', '.dmg', '.pkg',
  '.deb', '.rpm', '.sh', '.php', '.asp', '.jsp'
]);

/**
 * Enhanced string validation with security checks
 */
export const secureString = (options: {
  minLength?: number;
  maxLength?: number;
  allowHtml?: boolean;
  allowSpecialChars?: boolean;
  patterns?: RegExp[];
} = {}) => {
  return z.string()
    .min(options.minLength || 1)
    .max(options.maxLength || 10000)
    .refine((value) => {
      // Check for dangerous patterns
      const hasDangerousPattern = DANGEROUS_PATTERNS.some(pattern => pattern.test(value));
      if (hasDangerousPattern) {
        safeLogger.warn('Dangerous pattern detected in input', { 
          value: value.substring(0, 100),
          patterns: DANGEROUS_PATTERNS.filter(p => p.test(value)).map(p => p.toString())
        });
        return false;
      }
      return true;
    }, 'Input contains potentially dangerous content')
    .transform((value) => {
      // Sanitize HTML if not allowed
      if (!options.allowHtml && value.includes('<')) {
        value = DOMPurify.sanitize(value, { ALLOWED_TAGS: [] });
      }
      
      // Normalize whitespace
      value = value.replace(/\s+/g, ' ').trim();
      
      return value;
    });
};

/**
 * Email validation with enhanced security
 */
export const secureEmail = () => {
  return z.string()
    .email('Invalid email format')
    .max(254) // RFC 5321 limit
    .toLowerCase()
    .refine((email) => {
      // Check for suspicious patterns
      const suspiciousPatterns = [
        /\+.*\+/, // Multiple plus signs
        /\.{2,}/, // Consecutive dots
        /@.*@/, // Multiple @ signs
        /[<>()[\]\\,;:]/  // Dangerous characters
      ];
      
      return !suspiciousPatterns.some(pattern => pattern.test(email));
    }, 'Email contains invalid characters')
    .refine((email) => {
      // Check domain against common disposable email providers
      const disposableDomains = [
        '10minutemail.com', 'tempmail.org', 'guerrillamail.com',
        'mailinator.com', 'trashmail.com'
      ];
      
      const domain = email.split('@')[1];
      return !disposableDomains.includes(domain);
    }, 'Disposable email addresses are not allowed');
};

/**
 * Password validation with strength requirements
 */
export const securePassword = () => {
  return z.string()
    .min(12, 'Password must be at least 12 characters long')
    .max(128, 'Password is too long')
    .refine((password) => {
      // Must contain at least one of each: uppercase, lowercase, number, special char
      const hasUpper = /[A-Z]/.test(password);
      const hasLower = /[a-z]/.test(password);
      const hasNumber = /\d/.test(password);
      const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
      
      return hasUpper && hasLower && hasNumber && hasSpecial;
    }, 'Password must contain uppercase, lowercase, number, and special character')
    .refine((password) => {
      // Check for common weak passwords
      const weakPasswords = [
        'password', '123456', 'qwerty', 'admin', 'user',
        'password123', '123456789', 'welcome123', 'changeme'
      ];
      
      return !weakPasswords.some(weak => 
        password.toLowerCase().includes(weak.toLowerCase())
      );
    }, 'Password contains common weak patterns')
    .refine((password) => {
      // Check for keyboard patterns
      const keyboardPatterns = [
        'qwertyuiop', 'asdfghjkl', 'zxcvbnm',
        '1234567890', 'abcdefghij'
      ];
      
      return !keyboardPatterns.some(pattern =>
        password.toLowerCase().includes(pattern)
      );
    }, 'Password contains keyboard patterns');
};

/**
 * URL validation with security checks
 */
export const secureUrl = (options: { allowedProtocols?: string[] } = {}) => {
  const allowedProtocols = options.allowedProtocols || ['http', 'https'];
  
  return z.string()
    .url('Invalid URL format')
    .refine((url) => {
      const urlObj = new URL(url);
      return allowedProtocols.includes(urlObj.protocol.replace(':', ''));
    }, `Only ${options.allowedProtocols?.join(', ')} protocols allowed`)
    .refine((url) => {
      // Prevent SSRF attacks
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;
      
      // Block private IP ranges
      const privateRanges = [
        /^127\./, // 127.0.0.0/8
        /^10\./, // 10.0.0.0/8
        /^172\.(1[6-9]|2\d|3[01])\./, // 172.16.0.0/12
        /^192\.168\./, // 192.168.0.0/16
        /^169\.254\./, // 169.254.0.0/16 (link-local)
        /^localhost$/i,
        /^0\.0\.0\.0$/
      ];
      
      return !privateRanges.some(pattern => pattern.test(hostname));
    }, 'Private IP addresses and localhost are not allowed');
};

/**
 * File upload validation
 */
export const secureFile = (options: {
  maxSize?: number;
  allowedTypes?: string[];
  allowedExtensions?: string[];
} = {}) => {
  const maxSize = options.maxSize || 5 * 1024 * 1024; // 5MB default
  const allowedTypes = new Set(options.allowedTypes || Array.from(ALLOWED_FILE_TYPES));
  
  return z.object({
    name: z.string().max(255),
    size: z.number().max(maxSize, `File size must be less than ${maxSize} bytes`),
    type: z.string().refine((type) => allowedTypes.has(type), 'File type not allowed'),
    content: z.any()
  }).refine((file) => {
    // Check file extension
    const extension = file.name.toLowerCase().match(/\.[^.]*$/)?.[0];
    if (extension && DANGEROUS_FILE_EXTENSIONS.has(extension)) {
      return false;
    }
    return true;
  }, 'File extension not allowed')
  .refine((file) => {
    // Check for null bytes and other dangerous content in filename
    return !file.name.includes('\0') && !file.name.includes('../');
  }, 'Invalid characters in filename');
};

/**
 * SQL-safe identifier validation
 */
export const sqlIdentifier = () => {
  return z.string()
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, 'Invalid identifier format')
    .max(64, 'Identifier too long')
    .refine((value) => {
      // SQL reserved words
      const reservedWords = [
        'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'DROP', 'CREATE',
        'ALTER', 'TABLE', 'INDEX', 'VIEW', 'TRIGGER', 'PROCEDURE',
        'FUNCTION', 'DATABASE', 'SCHEMA', 'USER', 'ROLE', 'GRANT',
        'REVOKE', 'WHERE', 'ORDER', 'GROUP', 'HAVING', 'LIMIT'
      ];
      
      return !reservedWords.includes(value.toUpperCase());
    }, 'Identifier conflicts with reserved word');
};

/**
 * JSON validation with depth and size limits
 */
export const secureJson = (options: {
  maxDepth?: number;
  maxKeys?: number;
  maxStringLength?: number;
} = {}) => {
  const maxDepth = options.maxDepth || 10;
  const maxKeys = options.maxKeys || 1000;
  const maxStringLength = options.maxStringLength || 10000;
  
  function validateDepth(obj: any, currentDepth: number = 0): boolean {
    if (currentDepth > maxDepth) return false;
    
    if (typeof obj === 'object' && obj !== null) {
      if (Array.isArray(obj)) {
        return obj.every(item => validateDepth(item, currentDepth + 1));
      } else {
        const keys = Object.keys(obj);
        if (keys.length > maxKeys) return false;
        
        return keys.every(key => {
          if (typeof obj[key] === 'string' && obj[key].length > maxStringLength) {
            return false;
          }
          return validateDepth(obj[key], currentDepth + 1);
        });
      }
    }
    
    return true;
  }
  
  return z.any().refine(validateDepth, {
    message: `JSON exceeds depth limit (${maxDepth}) or size limits`
  });
};

/**
 * IP address validation
 */
export const ipAddress = () => {
  return z.string().refine((ip) => {
    // IPv4 regex
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    
    // IPv6 regex (simplified)
    const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$/;
    
    return ipv4Regex.test(ip) || ipv6Regex.test(ip);
  }, 'Invalid IP address format');
};

/**
 * Sanitize HTML content
 */
export function sanitizeHtml(content: string, allowedTags: string[] = []): string {
  return DOMPurify.sanitize(content, {
    ALLOWED_TAGS: allowedTags,
    ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class'],
    FORBID_TAGS: ['script', 'object', 'embed', 'form', 'input'],
    FORBID_ATTR: ['style', 'on*']
  });
}

/**
 * Rate limiting validation (to prevent spam)
 */
export function createRateLimitedValidator<T>(
  schema: z.ZodSchema<T>,
  identifier: string,
  maxAttempts: number = 5,
  windowMs: number = 60000
) {
  const attempts = new Map<string, { count: number; resetTime: number }>();
  
  return (data: unknown) => {
    const now = Date.now();
    const key = `${identifier}:${JSON.stringify(data).substring(0, 100)}`;
    
    let attemptData = attempts.get(key);
    if (!attemptData || now > attemptData.resetTime) {
      attemptData = { count: 0, resetTime: now + windowMs };
    }
    
    attemptData.count++;
    attempts.set(key, attemptData);
    
    if (attemptData.count > maxAttempts) {
      throw new ValidationError(
        'Too many validation attempts',
        undefined,
        undefined,
        'RATE_LIMIT_EXCEEDED'
      );
    }
    
    return schema.parse(data);
  };
}

export default {
  secureString,
  secureEmail,
  securePassword,
  secureUrl,
  secureFile,
  sqlIdentifier,
  secureJson,
  ipAddress,
  sanitizeHtml,
  createRateLimitedValidator,
  ValidationError
};
