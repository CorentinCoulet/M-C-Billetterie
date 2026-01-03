import { logger } from '@/lib/logger';
import prisma from '@/lib/prisma';
import { NextApiRequest, NextApiResponse } from 'next';
import authService from '../services/authService';

// Define NextHandler type since we removed next-connect
type NextHandler = (error?: any) => void;

export interface AuthenticatedRequest extends NextApiRequest {
  user?: {
    id: string;
    email: string;
    role?: string;
    sessionId?: string;
  };
}

/**
 * Middleware to check if the user is authenticated and session is valid
 */
export async function isAuthenticated(
  req: NextApiRequest,
  res: NextApiResponse,
  next: NextHandler
) {
  try {
    // Get token from cookies or Authorization header
    const token = req.cookies.token || req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Validate token and get user payload (doit contenir sessionId)
    const user = await authService.validateToken(token);

    if (!user || !user.sessionId) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    // Vérifie la session en base (expiration, existence)
    const session = await prisma.userSession.findUnique({ where: { id: user.sessionId } });
    if (!session || session.expiresAt < new Date()) {
      return res.status(401).json({ message: 'Session expirée' });
    }

    // Attach user to request object for use in route handlers
    (req as AuthenticatedRequest).user = user;

    // Continue to the next middleware or route handler
    return next();
  } catch (error) {
    logger.error({ error }, 'Authentication error');
    return res.status(401).json({ message: 'Authentication failed' });
  }
}

/**
 * Higher-order function to check if user has specific roles
 */
export function hasRoles(roles: string[]) {
  return async (req: NextApiRequest, res: NextApiResponse, next: NextHandler) => {
    try {
      await isAuthenticated(req, res, async () => {
        const user = (req as AuthenticatedRequest).user;
        if (!user || !user.role || !roles.includes(user.role)) {
          return res.status(403).json({ message: 'Insufficient permissions' });
        }
        return next();
      });
    } catch (error) {
      logger.error({ error }, 'Authorization error');
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
  };
}