/**
 * Auth Validator - Server-side authentication validation with database checks
 * Use this in your API routes to validate sessions and users
 */

import { verifyToken } from './jwt';
import prisma from './prisma';

interface JWTPayload {
  userId: string;
  role: string;
  sessionId?: string;
  iat?: number;
  exp?: number;
}

export interface ValidatedUser {
  id: string;
  email: string;
  role: string;
  isVerified: boolean;
  sessionId?: string;
}

export interface AuthValidationResult {
  isValid: boolean;
  user: ValidatedUser | null;
  error?: string;
}

/**
 * Validates authentication token and checks database for active session/user
 * @param token - JWT token from cookie or Authorization header
 * @returns Validation result with user data if valid
 */
export async function validateAuth(token: string | undefined): Promise<AuthValidationResult> {
  if (!token) {
    return { isValid: false, user: null, error: 'No token provided' };
  }

  try {
    // Verify JWT token
    const payload = verifyToken<JWTPayload>(token);
    
    if (!payload || !payload.userId) {
      return { isValid: false, user: null, error: 'Invalid token payload' };
    }

    // Validate session if sessionId is present
    if (payload.sessionId) {
      const session = await prisma.userSession.findUnique({
        where: {
          id: payload.sessionId,
          expiresAt: { gt: new Date() },
          isActive: true
        }
      });
      
      if (!session) {
        return { isValid: false, user: null, error: 'Session expired or not found' };
      }
    }

    // Fetch user from database
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        role: true,
        isVerified: true,
        blocked: true
      }
    });

    if (!user) {
      return { isValid: false, user: null, error: 'User not found' };
    }

    if (user.blocked) {
      return { isValid: false, user: null, error: 'User is blocked' };
    }

    if (!user.isVerified) {
      return { isValid: false, user: null, error: 'User email not verified' };
    }

    return {
      isValid: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
        sessionId: payload.sessionId
      }
    };
  } catch (error) {
    console.error('Auth validation error:', error);
    return { isValid: false, user: null, error: 'Authentication failed' };
  }
}

/**
 * Validates that user has required role
 * @param user - Validated user object
 * @param allowedRoles - Array of allowed roles
 * @returns true if user has one of the allowed roles
 */
export function hasRole(user: ValidatedUser | null, allowedRoles: string[]): boolean {
  if (!user) return false;
  return allowedRoles.includes(user.role);
}

/**
 * Extract token from Next.js request (from cookie or Authorization header)
 * @param req - Next.js request object with cookies and headers
 * @returns Token string or undefined
 */
export function extractToken(req: { cookies: any; headers: any }): string | undefined {
  // Try cookie first
  const cookieToken = req.cookies.get?.('auth-token')?.value || req.cookies['auth-token'];
  if (cookieToken) return cookieToken;

  // Try Authorization header
  const authHeader = req.headers.get?.('authorization') || req.headers['authorization'];
  if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return undefined;
}
