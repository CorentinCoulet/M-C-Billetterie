import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

/**
 * Authentication configuration
 */

// JWT configuration
export const JWT_CONFIG = {
  // Secret key for signing tokens (use environment variable in production)
  SECRET: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
  
  // Token expiration times
  EXPIRES_IN: {
    ACCESS: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    REFRESH: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    RESET_PASSWORD: '1h',
    VERIFY_EMAIL: '24h'
  },
  
  // Issuer for the JWT
  ISSUER: process.env.JWT_ISSUER || 'mc-society-api',
  
  // Audience for the JWT
  AUDIENCE: process.env.JWT_AUDIENCE || 'mc-society-client',
  
  // Cookie options
  COOKIE: {
    // Cookie name
    NAME: 'token',
    
    // Cookie options
    OPTIONS: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/'
    }
  }
};

// Password hashing configuration
export const PASSWORD_CONFIG = {
  // Salt rounds for bcrypt
  SALT_ROUNDS: 10,
  
  // Minimum password length
  MIN_LENGTH: 8,
  
  // Password strength regex (at least one uppercase, one lowercase, one number, one special character)
  STRENGTH_REGEX: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  
  // Password strength message
  STRENGTH_MESSAGE: 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character'
};

// Session configuration
export const SESSION_CONFIG = {
  // Session expiration time (in milliseconds)
  EXPIRES_IN: 7 * 24 * 60 * 60 * 1000, // 7 days
};

/**
 * Generate a JWT token
 */
export function generateToken(payload: any, expiresIn: string = JWT_CONFIG.EXPIRES_IN.ACCESS): string {
  return jwt.sign(payload, JWT_CONFIG.SECRET, {
    expiresIn,
    issuer: JWT_CONFIG.ISSUER,
    audience: JWT_CONFIG.AUDIENCE
  });
}

/**
 * Verify a JWT token
 */
export function verifyToken(token: string): any {
  try {
    return jwt.verify(token, JWT_CONFIG.SECRET, {
      issuer: JWT_CONFIG.ISSUER,
      audience: JWT_CONFIG.AUDIENCE
    });
  } catch (error) {
    throw error;
  }
}

/**
 * Hash a password
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(PASSWORD_CONFIG.SALT_ROUNDS);
  return bcrypt.hash(password, salt);
}

/**
 * Compare a password with a hash
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate a random token
 */
export function generateRandomToken(): string {
  return uuidv4();
}

/**
 * Validate password strength
 */
export function validatePasswordStrength(password: string): boolean {
  if (!password || password.length < PASSWORD_CONFIG.MIN_LENGTH) {
    return false;
  }
  
  return PASSWORD_CONFIG.STRENGTH_REGEX.test(password);
}

/**
 * Generate a session ID
 */
export function generateSessionId(): string {
  return uuidv4();
}

/**
 * Calculate session expiration date
 */
export function calculateSessionExpiration(): Date {
  return new Date(Date.now() + SESSION_CONFIG.EXPIRES_IN);
}

export default {
  JWT_CONFIG,
  PASSWORD_CONFIG,
  SESSION_CONFIG,
  generateToken,
  verifyToken,
  hashPassword,
  comparePassword,
  generateRandomToken,
  validatePasswordStrength,
  generateSessionId,
  calculateSessionExpiration
};