/**
 * MFA Middleware
 * Enforces MFA for admin users and protected routes
 */

import { NextFunction, Request, Response } from 'express';
import { Session } from 'express-session';
import { AuditService } from '../lib/audit-service';
import { logger } from '../lib/logger';
import { mfaService } from '../lib/mfa-service';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
  session: Session & Partial<SessionData>;
}

interface SessionData {
  mfaVerified: boolean;
  mfaVerifiedAt: Date;
}

interface MFARequest extends AuthenticatedRequest {
  mfaVerified?: boolean;
}

/**
 * Middleware to check if MFA is required and verified
 */
export const requireMFA = async (
  req: MFARequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ 
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
      return;
    }

    const { id: userId } = req.user;
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';

    // Check if user requires MFA
    const requiresMFA = await mfaService.requiresMFA(userId);
    if (!requiresMFA) {
      // User doesn't need MFA, proceed
      next();
      return;
    }

    // Check if MFA is enabled
    const mfaEnabled = await mfaService.isMFAEnabled(userId);
    if (!mfaEnabled) {
      res.status(403).json({
        error: 'MFA must be enabled for your account',
        code: 'MFA_REQUIRED',
        setupRequired: true
      });

      await AuditService.logEvent({
        action: 'mfa.access_denied_not_enabled',
        resourceType: 'user',
        resourceId: userId,
        userEmail: req.user.email,
        ipAddress,
        userAgent: req.get('User-Agent'),
        details: { path: req.path, method: req.method },
        result: 'failure',
        riskLevel: 'high'
      });

      return;
    }

    // Check if MFA is verified for this session
    if (!req.session || !req.session.mfaVerified) {
      res.status(403).json({
        error: 'MFA verification required',
        code: 'MFA_VERIFICATION_REQUIRED'
      });

      await AuditService.logEvent({
        action: 'mfa.access_denied_not_verified',
        resourceType: 'user',
        resourceId: userId,
        userEmail: req.user.email,
        ipAddress,
        userAgent: req.get('User-Agent'),
        details: { path: req.path, method: req.method },
        result: 'failure',
        riskLevel: 'medium'
      });

      return;
    }

    // MFA verified, proceed
    next();

  } catch (error) {
    logger.error('MFA middleware error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      code: 'MFA_CHECK_FAILED'
    });
  }
};

/**
 * Middleware to verify MFA code
 */
export const verifyMFACode = async (
  req: MFARequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ 
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
      return;
    }

    const { code, backupCode } = req.body;
    const { id: userId, email } = req.user;
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';

    if (!code && !backupCode) {
      res.status(400).json({
        error: 'MFA code or backup code required',
        code: 'CODE_REQUIRED'
      });
      return;
    }

    let isValid = false;

    if (code) {
      // Verify TOTP code
      isValid = await mfaService.verifyTOTP(userId, code, ipAddress);
    } else if (backupCode) {
      // Verify backup code
      isValid = await mfaService.verifyBackupCode(userId, backupCode, ipAddress);
    }

    if (!isValid) {
      res.status(401).json({
        error: 'Invalid MFA code',
        code: 'INVALID_MFA_CODE'
      });
      return;
    }

    // Mark session as MFA verified
    if (req.session) {
      req.session.mfaVerified = true;
      req.session.mfaVerifiedAt = new Date();
    }

    req.mfaVerified = true;

    await AuditService.logEvent({
      action: 'mfa.verified_successfully',
      resourceType: 'user',
      resourceId: userId,
      userEmail: email,
      ipAddress,
      userAgent: req.get('User-Agent'),
      details: { 
        method: code ? 'totp' : 'backup_code',
        path: req.path 
      },
      result: 'success',
      riskLevel: 'medium'
    });

    next();

  } catch (error) {
    logger.error('MFA verification error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      code: 'MFA_VERIFICATION_FAILED'
    });
  }
};

/**
 * Middleware to check MFA session validity
 */
export const checkMFASession = (maxAge: number = 8 * 60 * 60 * 1000) => {
  return (req: MFARequest, res: Response, next: NextFunction): void => {
    if (!req.session || !req.session.mfaVerified) {
      next();
      return;
    }

    const mfaVerifiedAt = req.session.mfaVerifiedAt;
    if (!mfaVerifiedAt) {
      // Clear invalid MFA session
      req.session.mfaVerified = false;
      delete req.session.mfaVerifiedAt;
      next();
      return;
    }

    const now = new Date();
    const age = now.getTime() - new Date(mfaVerifiedAt).getTime();

    if (age > maxAge) {
      // MFA session expired
      req.session.mfaVerified = false;
      delete req.session.mfaVerifiedAt;

      if (req.user) {
        AuditService.logEvent({
          action: 'mfa.session_expired',
          resourceType: 'user',
          resourceId: req.user.id,
          userEmail: req.user.email,
          ipAddress: req.ip || 'unknown',
          userAgent: req.get('User-Agent'),
          details: { sessionAge: age },
          result: 'success',
          riskLevel: 'low'
        }).catch(err => logger.error('Failed to log MFA session expiry:', err));
      }
    }

    next();
  };
};

/**
 * Express session type augmentation
 */
declare module 'express-session' {
  interface SessionData {
    mfaVerified?: boolean;
    mfaVerifiedAt?: Date;
  }
}

export default {
  requireMFA,
  verifyMFACode,
  checkMFASession
};
