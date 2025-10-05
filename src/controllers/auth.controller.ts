import { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import authService from '../services/authService';

// Validation schemas
const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, 'Old password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

// Helper function to set secure cookie
function setSecureCookie(res: NextApiResponse, token: string) {
  res.setHeader('Set-Cookie', [
    `token=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=86400`
  ]);
}

// Helper function to clear cookie
function clearCookie(res: NextApiResponse) {
  res.setHeader('Set-Cookie', [
    'token=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0'
  ]);
}

// Helper function to get token from request
function getTokenFromRequest(req: NextApiRequest): string | null {
  // Try cookies first
  if (req.cookies?.token) {
    return req.cookies.token;
  }
  
  // Try Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  return null;
}

/**
 * Register a new user
 */
export async function register(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Validate input
    const validation = registerSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        message: 'Validation error',
        errors: validation.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      });
    }

    const { email, password, name } = validation.data;

    // Register user
    const result = await authService.register(email, password, name);
    
    if (!result) {
      return res.status(400).json({ message: 'Registration failed' });
    }

    // Set secure cookie
    setSecureCookie(res, result.token);

    return res.status(201).json({
      message: 'User registered successfully',
      user: result.user,
      token: result.token
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    return res.status(400).json({ message: error.message || 'Registration failed' });
  }
}

/**
 * Login user
 */
export async function login(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Validate input
    const validation = loginSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        message: 'Validation error',
        errors: validation.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      });
    }

    const { email, password } = validation.data;

    // Login user
    const result = await authService.login(email, password);
    
    if (!result) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Set secure cookie
    setSecureCookie(res, result.token);

    return res.status(200).json({
      message: 'Login successful',
      user: result.user,
      token: result.token
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return res.status(401).json({ message: error.message || 'Invalid credentials' });
  }
}

/**
 * Logout user
 */
export async function logout(req: NextApiRequest, res: NextApiResponse) {
  try {
    const token = getTokenFromRequest(req);
    
    if (token) {
      // Validate token to get session ID
      const user = await authService.validateToken(token);
      
      if (user && user.sessionId) {
        // Logout from service
        const success = await authService.logout(user.sessionId);
        
        if (!success) {
          return res.status(500).json({ message: 'Logout failed' });
        }
      }
    }

    // Clear cookie
    clearCookie(res);

    return res.status(200).json({ message: 'Successfully logged out' });
  } catch (error: any) {
    console.error('Logout error:', error);
    return res.status(500).json({ message: error.message || 'Logout failed' });
  }
}

/**
 * Get current user
 */
export async function getCurrentUser(req: NextApiRequest, res: NextApiResponse) {
  try {
    const token = getTokenFromRequest(req);
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    // Validate token
    const user = await authService.validateToken(token);
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    // Get full user data
    const fullUser = await authService.getCurrentUser(user.id);
    
    if (!fullUser) {
      return res.status(401).json({ message: 'User not found' });
    }

    // Remove sensitive data
    const { ...safeUser } = fullUser;

    return res.status(200).json({ user: safeUser });
  } catch (error: any) {
    console.error('Get current user error:', error);
    return res.status(401).json({ message: 'Authentication failed' });
  }
}

/**
 * Change password
 */
export async function changePassword(req: NextApiRequest, res: NextApiResponse) {
  try {
    const token = getTokenFromRequest(req);
    
    if (!token) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    // Validate token
    const user = await authService.validateToken(token);
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    // Validate input
    const validation = changePasswordSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        message: 'Validation error',
        errors: validation.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      });
    }

    const { oldPassword, newPassword } = validation.data;

    // Change password
    const success = await authService.changePassword(user.id, oldPassword, newPassword);
    
    if (!success) {
      return res.status(400).json({ message: 'Password change failed' });
    }

    // Clear cookie to force re-login
    clearCookie(res);

    return res.status(200).json({ message: 'Password changed successfully' });
  } catch (error: any) {
    console.error('Change password error:', error);
    return res.status(400).json({ message: error.message || 'Password change failed' });
  }
}

export default {
  register,
  login,
  logout,
  getCurrentUser,
  changePassword,
};
