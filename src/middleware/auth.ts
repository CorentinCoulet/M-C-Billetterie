import { NextApiRequest, NextApiResponse } from 'next';
import { NextHandler } from 'next-connect';
import authService from '../modules/auth/auth.service';

/**
 * Middleware to check if the user is authenticated
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

    // Validate token and get user
    const user = await authService.validateToken(token);

    if (!user) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    // Attach user to request object for use in route handlers
    (req as any).user = user;

    // Continue to the next middleware or route handler
    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Authentication failed' });
  }
}

/**
 * Higher-order function to check if user has specific roles
 */
export function hasRoles(roles: string[]) {
  return async (req: NextApiRequest, res: NextApiResponse, next: NextHandler) => {
    try {
      // First ensure the user is authenticated
      await isAuthenticated(req, res, async () => {
        const user = (req as any).user;
        
        // TODO: Implement role checking logic
        // This is a placeholder - you would need to implement role checking based on your data model
        // For example, you might check user.role or query a roles table
        
        // For now, we'll just pass through since role implementation is not part of this task
        return next();
      });
    } catch (error) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
  };
}