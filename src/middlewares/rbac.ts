import { NextApiRequest, NextApiResponse } from 'next';
import { NextHandler } from 'next-connect';
import { AuthenticatedRequest } from './auth';

/**
 * Role-Based Access Control (RBAC) middleware
 * Provides fine-grained access control based on user roles and permissions
 */

// Define available roles and their hierarchy
export const ROLES = {
  VISITOR: 'visitor',
  USER: 'user',
  ORGANIZER: 'organizer',
  ADMIN: 'admin'
};

// Define role hierarchy (higher roles include permissions of lower roles)
const ROLE_HIERARCHY = {
  [ROLES.VISITOR]: [],
  [ROLES.USER]: [ROLES.VISITOR],
  [ROLES.ORGANIZER]: [ROLES.USER, ROLES.VISITOR],
  [ROLES.ADMIN]: [ROLES.ORGANIZER, ROLES.USER, ROLES.VISITOR]
};

// Define permissions for each resource
export const PERMISSIONS = {
  EVENTS: {
    READ: 'events:read',
    CREATE: 'events:create',
    UPDATE: 'events:update',
    DELETE: 'events:delete'
  },
  TICKETS: {
    READ: 'tickets:read',
    CREATE: 'tickets:create',
    UPDATE: 'tickets:update',
    DELETE: 'tickets:delete'
  },
  ORDERS: {
    READ: 'orders:read',
    CREATE: 'orders:create',
    UPDATE: 'orders:update',
    DELETE: 'orders:delete'
  },
  USERS: {
    READ: 'users:read',
    CREATE: 'users:create',
    UPDATE: 'users:update',
    DELETE: 'users:delete'
  }
};

// Define role-permission mappings
const ROLE_PERMISSIONS = {
  [ROLES.VISITOR]: [
    PERMISSIONS.EVENTS.READ,
    PERMISSIONS.TICKETS.READ
  ],
  [ROLES.USER]: [
    PERMISSIONS.ORDERS.CREATE,
    PERMISSIONS.ORDERS.READ
  ],
  [ROLES.ORGANIZER]: [
    PERMISSIONS.EVENTS.CREATE,
    PERMISSIONS.EVENTS.UPDATE,
    PERMISSIONS.TICKETS.CREATE,
    PERMISSIONS.TICKETS.UPDATE,
    PERMISSIONS.ORDERS.READ
  ],
  [ROLES.ADMIN]: [
    PERMISSIONS.EVENTS.DELETE,
    PERMISSIONS.TICKETS.DELETE,
    PERMISSIONS.ORDERS.DELETE,
    PERMISSIONS.USERS.READ,
    PERMISSIONS.USERS.CREATE,
    PERMISSIONS.USERS.UPDATE,
    PERMISSIONS.USERS.DELETE
  ]
};

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: string, permission: string): boolean {
  if (!role || !permission) return false;
  
  // Get all roles in the hierarchy
  const roles = [role, ...(ROLE_HIERARCHY[role] || [])];
  
  // Check if any role has the required permission
  return roles.some(r => 
    ROLE_PERMISSIONS[r] && ROLE_PERMISSIONS[r].includes(permission)
  );
}

/**
 * Middleware to check if user has required permission
 */
export function requirePermission(permission: string) {
  return (req: NextApiRequest, res: NextApiResponse, next: NextHandler) => {
    const user = (req as AuthenticatedRequest).user;
    
    if (!user || !user.role) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    if (!hasPermission(user.role, permission)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    
    return next();
  };
}

/**
 * Middleware to check if user has any of the required permissions
 */
export function requireAnyPermission(permissions: string[]) {
  return (req: NextApiRequest, res: NextApiResponse, next: NextHandler) => {
    const user = (req as AuthenticatedRequest).user;
    
    if (!user || !user.role) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    if (!permissions.some(permission => hasPermission(user.role, permission))) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    
    return next();
  };
}

/**
 * Middleware to check if user has all of the required permissions
 */
export function requireAllPermissions(permissions: string[]) {
  return (req: NextApiRequest, res: NextApiResponse, next: NextHandler) => {
    const user = (req as AuthenticatedRequest).user;
    
    if (!user || !user.role) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    if (!permissions.every(permission => hasPermission(user.role, permission))) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    
    return next();
  };
}