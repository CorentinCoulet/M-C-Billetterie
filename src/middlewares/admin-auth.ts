import { safeLogger } from '@/lib/logger';
import { NextFunction, Request, Response } from 'express';

/**
 * Admin Authentication Middleware
 * Protects admin routes with simple API key authentication
 */

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: string;
    isAdmin: boolean;
  };
}

export const adminAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    // Check for API key in headers
    const apiKey = req.headers['x-admin-api-key'] as string;
    const authHeader = req.headers['authorization'];
    
    // Extract API key from Authorization header if present
    let providedKey = apiKey;
    if (!providedKey && authHeader && authHeader.startsWith('Bearer ')) {
      providedKey = authHeader.slice(7);
    }
    
    // Check for admin API key in environment
    const validAdminKey = process.env.ADMIN_API_KEY;
    
    if (!validAdminKey) {
      safeLogger.error('Admin Auth: ADMIN_API_KEY not configured');
      return res.status(500).json({
        success: false,
        error: 'Admin authentication not configured'
      });
    }
    
    if (!providedKey) {
      safeLogger.warn('Admin Auth: Missing API key', { 
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path
      });
      
      return res.status(401).json({
        success: false,
        error: 'Admin API key required',
        code: 'MISSING_API_KEY',
        hint: 'Provide API key in X-Admin-API-Key header or Authorization: Bearer <key>'
      });
    }
    
    if (providedKey !== validAdminKey) {
      safeLogger.warn('Admin Auth: Invalid API key attempt', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        providedKeyPrefix: providedKey.substring(0, 8) + '...'
      });      return res.status(403).json({
        success: false,
        error: 'Invalid admin API key',
        code: 'INVALID_API_KEY'
      });
    }
    
    // Set user context for admin
    req.user = {
      id: 'admin',
      role: 'administrator',
      isAdmin: true
    };
    
    safeLogger.info('Admin Auth: Successful authentication', {
      ip: req.ip,
      path: req.path,
      method: req.method
    });
    
    next();
  } catch (error: any) {
    safeLogger.error('Admin Auth: Authentication error', {
      error: error.message,
      ip: req.ip
    });    res.status(500).json({
      success: false,
      error: 'Authentication system error'
    });
  }
};

/**
 * Generate a secure admin API key
 */
export const generateAdminApiKey = (): string => {
  const crypto = require('crypto');
  return `admin_${crypto.randomBytes(32).toString('hex')}`;
};

/**
 * Middleware to log admin actions
 */
export const logAdminAction = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const originalSend = res.json;
  
  res.json = function(body: any) {
    // Log the admin action after response
    safeLogger.info('Admin Action', {
      user: req.user?.id || 'unknown',
      method: req.method,
      path: req.path,
      body: req.method === 'POST' || req.method === 'PUT' ? req.body : undefined,
      query: Object.keys(req.query).length > 0 ? req.query : undefined,
      response_status: res.statusCode,
      success: body?.success || false,
      timestamp: new Date().toISOString()
    });
    
    return originalSend.call(this, body);
  };
  
  next();
};
