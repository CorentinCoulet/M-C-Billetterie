/**
 * MFA Middleware
 * Enforces MFA for admin users and protected routes
 * Note: This middleware needs to be adapted for Next.js API routes
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { AuditService } from '../lib/audit-service';
import { safeLogger } from '../lib/logger';
import { mfaService } from '../lib/mfa-service';

// Helper to get IP from Next.js request
function getIpAddress(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0];
  }
  return req.socket?.remoteAddress || 'unknown';
}

interface SessionData {
  mfaVerified?: boolean;
  mfaVerifiedAt?: Date;
}

interface MFARequest extends NextApiRequest {
  user?: {
    id: string;
    email: string;
    role: string;
  };
  session?: SessionData;
  mfaVerified?: boolean;
}

type NextApiMiddleware = (
  req: MFARequest,
  res: NextApiResponse,
  next: () => void
) => Promise<void>;

/**
 * Middleware to check if MFA is required and verified
 */
export const requireMFA = async (
  req: MFARequest,
  res: NextApiResponse,
  next: () => void
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
    const ipAddress = getIpAddress(req);

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
        userAgent: req.headers['user-agent'] || 'unknown',
        details: { path: req.url, method: req.method },
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
        userAgent: req.headers['user-agent'] || 'unknown',
        details: { path: req.url, method: req.method },
        result: 'failure',
        riskLevel: 'medium'
      });

      return;
    }

    // MFA verified, proceed
    next();

  } catch (error) {
    safeLogger.error('MFA middleware error:', error);
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
  res: NextApiResponse,
  next: () => void
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
    const ipAddress = getIpAddress(req);

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
      userAgent: req.headers['user-agent'] || 'unknown',
      details: { 
        method: code ? 'totp' : 'backup_code',
        path: req.url 
      },
      result: 'success',
      riskLevel: 'medium'
    });

    next();

  } catch (error) {
    safeLogger.error('MFA verification error:', error);
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
  return (req: MFARequest, res: NextApiResponse, next: () => void): void => {
    if (!req.session || !req.session.mfaVerified) {
      next();
      return;
    }

    const mfaVerifiedAt = req.session.mfaVerifiedAt;
    if (!mfaVerifiedAt) {
      // Clear invalid MFA session
      req.session.mfaVerified = false;
      if (req.session.mfaVerifiedAt) {
        req.session.mfaVerifiedAt = undefined;
      }
      next();
      return;
    }

    const now = new Date();
    const age = now.getTime() - new Date(mfaVerifiedAt).getTime();

    if (age > maxAge) {
      // MFA session expired
      req.session.mfaVerified = false;
      if (req.session.mfaVerifiedAt) {
        req.session.mfaVerifiedAt = undefined;
      }

      if (req.user) {
        const ipAddress = getIpAddress(req);
        AuditService.logEvent({
          action: 'mfa.session_expired',
          resourceType: 'user',
          resourceId: req.user.id,
          userEmail: req.user.email,
          ipAddress,
          userAgent: req.headers['user-agent'] || 'unknown',
          details: { sessionAge: age },
          result: 'success',
          riskLevel: 'low'
        }).catch(err => safeLogger.error('Failed to log MFA session expiry:', err));
      }
    }

    next();
  };
};

/**
 * Session type augmentation
 * Note: This would need to be adapted based on your session implementation
 * (e.g., iron-session, next-auth, etc.)
 */

export default {
  requireMFA,
  verifyMFACode,
  checkMFASession
};
