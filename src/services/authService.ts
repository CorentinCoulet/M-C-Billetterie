import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { signToken, verifyToken } from '@/lib/jwt';
import type { SignOptions } from 'jsonwebtoken';

// Keep a local expiresIn for session records if needed; JWT expiration is handled in signToken
const JWT_EXPIRES_IN: SignOptions['expiresIn'] = '24h';

export interface User {
  id: string;
  email: string;
  role?: string;
  sessionId?: string;
}

export interface LoginResult {
  user: User;
  token: string;
}

export interface AuthError {
  code: string;
  message: string;
}

/**
 * Authentication Service
 * Handles user authentication, token validation, and session management
 */
export class AuthService {
  /**
   * Clean expired sessions from the database
   */
  async cleanExpiredSessions(): Promise<void> {
    try {
      await prisma.userSession.deleteMany({
        where: {
          expiresAt: {
            lt: new Date()
          }
        }
      });
    } catch (error) {
      console.error('Clean expired sessions error:', error);
    }
  }

  /**
   * Generate a random token for session storage
   */
  private generateSessionToken(): string {
    // Use crypto for better security
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const array = new Uint8Array(32);
      crypto.getRandomValues(array);
      return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }
    // Fallback for Node.js environments
    return Math.random().toString(36).substr(2) + Math.random().toString(36).substr(2);
  }

  /**
   * Validate a JWT token and return user information
   */
  async validateToken(token: string): Promise<User | null> {
    try {
      const decoded = verifyToken<any>(token);
      
      if (!decoded.userId || !decoded.sessionId) {
        return null;
      }

      // Get user from database
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          role: true
        }
      });

      if (!user) {
        return null;
      }

      return {
        id: user.id,
        email: user.email,
        role: user.role || 'USER',
        sessionId: decoded.sessionId
      };
    } catch (error) {
      console.error('Token validation error:', error);
      return null;
    }
  }

  /**
   * Login user with email and password
   */
  async login(email: string, password: string): Promise<LoginResult | null> {
    try {
      // Validate input
      if (!email || !password) {
        return null;
      }

      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          password: true,
          role: true
        }
      });

      if (!user || !user.password) {
        return null;
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return null;
      }

      // Generate session token
      const sessionToken = this.generateSessionToken();

      // Create session
      const session = await prisma.userSession.create({
        data: {
          userId: user.id,
          token: sessionToken,
          ipAddress: '',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
        }
      });

      // Create JWT token
      const payload = { userId: user.id, sessionId: session.id };
      // Use unified JWT signer to ensure same secret/alg across Edge and Node runtimes
      const token = signToken(payload);

      return {
        user: {
          id: user.id,
          email: user.email,
          role: user.role || 'USER',
          sessionId: session.id
        },
        token
      };
    } catch (error) {
      console.error('Login error:', error);
      return null;
    }
  }

  /**
   * Register a new user
   */
  async register(email: string, password: string, name?: string): Promise<LoginResult | null> {
    try {
      // Validate input
      if (!email || !password) {
        throw new Error('Email and password are required');
      }

      if (password.length < 8) {
        throw new Error('Password must be at least 8 characters long');
      }

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email }
      });

      if (existingUser) {
        throw new Error('User already exists');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          role: 'USER'
        },
        select: {
          id: true,
          email: true,
          role: true
        }
      });

      // Generate session token
      const sessionToken = this.generateSessionToken();

      // Create session
      const session = await prisma.userSession.create({
        data: {
          userId: user.id,
          token: sessionToken,
          ipAddress: '',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
        }
      });

      // Create JWT token
      const payload = { userId: user.id, sessionId: session.id };
      // Use unified JWT signer to ensure same secret/alg across Edge and Node runtimes
      const token = signToken(payload);

      return {
        user: {
          id: user.id,
          email: user.email,
          role: user.role || 'USER',
          sessionId: session.id
        },
        token
      };
    } catch (error) {
      console.error('Registration error:', error);
      return null;
    }
  }

  /**
   * Logout user by invalidating session
   */
  async logout(sessionId: string): Promise<boolean> {
    try {
      if (!sessionId) {
        return false;
      }

      await prisma.userSession.delete({
        where: { id: sessionId }
      });
      return true;
    } catch (error) {
      console.error('Logout error:', error);
      return false;
    }
  }

  /**
   * Refresh token
   */
  async refreshToken(token: string): Promise<string | null> {
    try {
      if (!token) {
        return null;
      }

      const user = await this.validateToken(token);
      if (!user || !user.sessionId) {
        return null;
      }

      // Check if session is still valid
      const session = await prisma.userSession.findUnique({
        where: { id: user.sessionId }
      });

      if (!session || session.expiresAt < new Date()) {
        return null;
      }

      // Create new token
      const payload = { userId: user.id, sessionId: user.sessionId };
      const options: SignOptions = { expiresIn: JWT_EXPIRES_IN };
      const newToken = jwt.sign(payload, JWT_SECRET!, options);

      return newToken;
    } catch (error) {
      console.error('Token refresh error:', error);
      return null;
    }
  }

  /**
   * Get current user by ID
   */
  async getCurrentUser(userId: string): Promise<User | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          role: true,
          name: true,
          isVerified: true
        }
      });

      if (!user) {
        return null;
      }

      return {
        id: user.id,
        email: user.email,
        role: user.role || 'USER'
      };
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  }

  /**
   * Change user password
   */
  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<boolean> {
    try {
      // Get user with current password
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          password: true
        }
      });

      if (!user || !user.password) {
        return false;
      }

      // Verify old password
      const isValidOldPassword = await bcrypt.compare(oldPassword, user.password);
      if (!isValidOldPassword) {
        return false;
      }

      // Validate new password
      if (newPassword.length < 8) {
        throw new Error('New password must be at least 8 characters long');
      }

      // Hash new password
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);

      // Update password
      await prisma.user.update({
        where: { id: userId },
        data: {
          password: hashedNewPassword,
          passwordChangedAt: new Date()
        }
      });

      return true;
    } catch (error) {
      console.error('Change password error:', error);
      return false;
    }
  }
}

const authService = new AuthService();
export default authService;
