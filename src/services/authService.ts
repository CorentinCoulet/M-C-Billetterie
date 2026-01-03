import { signToken, verifyToken } from '@/lib/jwt';
import { logger } from '@/lib/logger';
import prisma from '@/lib/prisma';
import { PASSWORD_POLICY } from '@/lib/security-config';
import bcrypt from 'bcryptjs';
import type { SignOptions } from 'jsonwebtoken';

// Keep a local expiresIn for session records if needed; JWT expiration is handled in signToken
const JWT_EXPIRES_IN: SignOptions['expiresIn'] = '24h';

export interface User {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
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
      logger.error({ error }, 'Clean expired sessions error');
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
          name: true,
          phone: true,
          address: true,
          city: true,
          postalCode: true,
          country: true,
          role: true
        }
      });

      if (!user) {
        return null;
      }

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        address: user.address,
        city: user.city,
        postalCode: user.postalCode,
        country: user.country,
        role: user.role || 'USER',
        sessionId: decoded.sessionId
      };
    } catch (error) {
      logger.error({ error }, 'Token validation error');
      return null;
    }
  }

  /**
   * Login user with email and password
   * Implements RGPD/CNIL rate limiting: blocks after MAX_LOGIN_ATTEMPTS failed attempts
   */
  async login(
    email: string, 
    password: string,
    metadata?: { ipAddress?: string; userAgent?: string }
  ): Promise<LoginResult | null> {
    try {
      // Validate input
      if (!email || !password) {
        return null;
      }

      const ipAddress = metadata?.ipAddress || 'unknown';
      const lockoutWindow = new Date(Date.now() - PASSWORD_POLICY.LOCKOUT_DURATION * 60 * 1000);

      // RGPD/CNIL: Check for too many failed login attempts (Article 32 - Security)
      const recentFailedAttempts = await prisma.loginAttempt.count({
        where: {
          email,
          success: false,
          timestamp: { gte: lockoutWindow }
        }
      });

      if (recentFailedAttempts >= PASSWORD_POLICY.MAX_LOGIN_ATTEMPTS) {
        const remainingLockoutMinutes = Math.ceil(PASSWORD_POLICY.LOCKOUT_DURATION - 
          (Date.now() - lockoutWindow.getTime()) / 60000);
        
        logger.warn({ email, ipAddress, attempts: recentFailedAttempts }, 
          'Account temporarily locked due to too many failed login attempts');
        
        // Return special error for locked account
        throw new Error(`ACCOUNT_LOCKED:${remainingLockoutMinutes}`);
      }

      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          address: true,
          city: true,
          postalCode: true,
          country: true,
          password: true,
          role: true
        }
      });

      if (!user || !user.password) {
        // Log failed attempt (user not found - don't reveal this to client)
        await this.logLoginAttempt(email, false, ipAddress, metadata?.userAgent);
        return null;
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        // Log failed attempt
        await this.logLoginAttempt(email, false, ipAddress, metadata?.userAgent, user.id);
        return null;
      }

      // Successful login - log it and clear failed attempts
      await this.logLoginAttempt(email, true, ipAddress, metadata?.userAgent, user.id);
      
      // Clear old failed attempts for this user after successful login
      await prisma.loginAttempt.deleteMany({
        where: {
          email,
          success: false
        }
      });

      // Generate session token
      const sessionToken = this.generateSessionToken();

      // Create session
      const session = await prisma.userSession.create({
        data: {
          userId: user.id,
          token: sessionToken,
          ipAddress,
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
          name: user.name,
          phone: user.phone,
          address: user.address,
          city: user.city,
          postalCode: user.postalCode,
          country: user.country,
          role: user.role || 'USER',
          sessionId: session.id
        },
        token
      };
    } catch (error) {
      // Re-throw account locked errors
      if (error instanceof Error && error.message.startsWith('ACCOUNT_LOCKED:')) {
        throw error;
      }
      logger.error({ error }, 'Login error');
      return null;
    }
  }

  /**
   * Log a login attempt for security auditing and rate limiting
   */
  private async logLoginAttempt(
    email: string, 
    success: boolean, 
    ipAddress: string, 
    userAgent?: string,
    userId?: string
  ): Promise<void> {
    try {
      await prisma.loginAttempt.create({
        data: {
          email,
          success,
          ipAddress,
          userAgent: userAgent || null,
          userId: userId || null
        }
      });
    } catch (error) {
      logger.error({ error, email }, 'Failed to log login attempt');
    }
  }

  /**
   * Register a new user
   */
  async register(email: string, password: string, name?: string, consentsMetadata?: {
    termsAcceptedAt?: string;
    privacyAcceptedAt?: string;
    ageVerifiedAt?: string;
    marketingConsent?: boolean;
    registrationIp?: string;
    registrationUserAgent?: string;
  }): Promise<LoginResult | null> {
    try {
      // Validate input
      if (!email || !password) {
        throw new Error('Email and password are required');
      }

      // Validation renforcée du mot de passe (12 caractères minimum)
      if (password.length < 12) {
        throw new Error('Le mot de passe doit contenir au moins 12 caractères');
      }

      // Vérification des critères de sécurité
      const hasUppercase = /[A-Z]/.test(password);
      const hasLowercase = /[a-z]/.test(password);
      const hasNumber = /\d/.test(password);
      const hasSpecial = /[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\;'/`~]/.test(password);

      if (!hasUppercase || !hasLowercase || !hasNumber || !hasSpecial) {
        throw new Error('Le mot de passe doit contenir au moins une majuscule, une minuscule, un chiffre et un caractère spécial');
      }

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email }
      });

      if (existingUser) {
        throw new Error('User already exists');
      }

      // Hash password with higher cost factor for better security
      const hashedPassword = await bcrypt.hash(password, 12);

      // Prepare metadata with consents
      const userMetadata = consentsMetadata ? {
        consents: {
          termsAcceptedAt: consentsMetadata.termsAcceptedAt || new Date().toISOString(),
          privacyAcceptedAt: consentsMetadata.privacyAcceptedAt || new Date().toISOString(),
          ageVerifiedAt: consentsMetadata.ageVerifiedAt || new Date().toISOString(),
          marketingConsent: consentsMetadata.marketingConsent || false,
        },
        registration: {
          ip: consentsMetadata.registrationIp || 'unknown',
          userAgent: consentsMetadata.registrationUserAgent || 'unknown',
          date: new Date().toISOString()
        }
      } : null;

      // Create user
      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          role: 'USER',
          passwordChangedAt: new Date(),
          ...(userMetadata && { metadata: userMetadata })
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
      logger.error({ error }, 'Registration error');
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
      logger.error({ error }, 'Logout error');
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
      logger.error({ error }, 'Token refresh error');
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
      logger.error({ error }, 'Get current user error');
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
      logger.error({ error }, 'Change password error');
      return false;
    }
  }
}

const authService = new AuthService();
export default authService;
