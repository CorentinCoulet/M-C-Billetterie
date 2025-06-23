import { NextApiRequest, NextApiResponse } from 'next';
import { User } from '@prisma/client';
import { signToken, verifyToken } from './jwt';
import prisma from './prisma';

export interface TokenPayload {
  userId: string;
  email: string;
}

export interface AuthOptions {
  requireAuth?: boolean;
  requiredRoles?: ('USER' | 'ADMIN' | 'ORGANISATEUR')[];
}

/**
 * Middleware to handle authentication and authorization
 */
export async function authMiddleware(
  req: NextApiRequest,
  res: NextApiResponse,
  options: AuthOptions = { requireAuth: true }
) {
  const { requireAuth = true, requiredRoles = [] } = options;

  // Skip auth check if not required
  if (!requireAuth) {
    return { authenticated: false };
  }

  // Get token from Authorization header or cookies
  const authHeader = req.headers.authorization;
  const token = authHeader ? authHeader.split(' ')[1] : req.cookies?.token;

  if (!token) {
    res.status(401).json({ message: 'Authentication required' });
    return { authenticated: false, error: 'No token provided' };
  }

  try {
    // Verify the token
    const payload = verifyToken<TokenPayload>(token);

    // Check if session exists and is not expired
    const session = await prisma.session.findFirst({
      where: {
        token,
        userId: payload.userId,
        expiresAt: { gt: new Date() }
      }
    });

    if (!session) {
      res.status(401).json({ message: 'Invalid or expired session' });
      return { authenticated: false, error: 'Invalid session' };
    }

    // Get the user
    const user = await prisma.user.findUnique({
      where: { id: payload.userId }
    });

    if (!user) {
      res.status(401).json({ message: 'User not found' });
      return { authenticated: false, error: 'User not found' };
    }

    // Check if user is blocked
    const blockedUser = await prisma.blockedUser.findUnique({
      where: { userId: user.id }
    });

    if (blockedUser) {
      res.status(403).json({ message: 'Your account has been blocked' });
      return { authenticated: false, error: 'User blocked' };
    }

    // Check required roles if specified
    if (requiredRoles.length > 0 && !requiredRoles.includes(user.role as any)) {
      res.status(403).json({ message: 'Insufficient permissions' });
      return { authenticated: false, error: 'Insufficient permissions' };
    }

    // Update session last activity
    await prisma.session.update({
      where: { id: session.id },
      data: { lastActivity: new Date() }
    });

    // Authentication successful
    return { authenticated: true, user };
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ message: 'Invalid or expired token' });
    return { authenticated: false, error: 'Invalid token' };
  }
}

/**
 * Create a new session for a user
 */
export async function createSession(
  userId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<{ token: string; expiresAt: Date }> {
  // Generate JWT token
  const tokenPayload: TokenPayload = {
    userId,
    email: (await prisma.user.findUnique({ where: { id: userId } }))?.email || '',
  };
  
  const token = signToken(tokenPayload);
  
  // Set expiration date (7 days from now)
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  // Create session in database
  await prisma.session.create({
    data: {
      userId,
      token,
      ipAddress,
      userAgent,
      expiresAt,
    }
  });

  return { token, expiresAt };
}

/**
 * Invalidate a session (logout)
 */
export async function invalidateSession(token: string): Promise<void> {
  await prisma.session.deleteMany({
    where: { token }
  });
}

/**
 * Invalidate all sessions for a user
 */
export async function invalidateAllUserSessions(userId: string): Promise<void> {
  await prisma.session.deleteMany({
    where: { userId }
  });
}

/**
 * Get user from request
 */
export async function getUserFromRequest(req: NextApiRequest): Promise<User | null> {
  const authHeader = req.headers.authorization;
  const token = authHeader ? authHeader.split(' ')[1] : req.cookies?.token;

  if (!token) {
    return null;
  }

  try {
    const payload = verifyToken<TokenPayload>(token);
    
    const session = await prisma.session.findFirst({
      where: {
        token,
        userId: payload.userId,
        expiresAt: { gt: new Date() }
      }
    });

    if (!session) {
      return null;
    }

    return prisma.user.findUnique({
      where: { id: payload.userId }
    });
  } catch (error) {
    return null;
  }
}

/**
 * Higher-order function to protect API routes
 */
export function withAuth(handler: any, options: AuthOptions = { requireAuth: true }) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const authResult = await authMiddleware(req, res, options);
    
    if (!authResult.authenticated) {
      // If response has already been sent by the middleware, just return
      if (res.writableEnded) {
        return;
      }
      
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    // Add user to request object
    req.user = authResult.user;
    
    // Call the original handler
    return handler(req, res);
  };
}

/**
 * Check if a user has the required role
 */
export function hasRole(user: User, requiredRoles: ('USER' | 'ADMIN' | 'ORGANISATEUR')[]): boolean {
  return requiredRoles.includes(user.role as any);
}