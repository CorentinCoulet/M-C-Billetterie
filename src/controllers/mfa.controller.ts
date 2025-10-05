import { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { mfaService } from '../lib/mfa-service';
import { isAuthenticated } from '../middlewares/auth';

// MFA middleware that enforces 2FA for admin users
export async function requireMFA(
  req: NextApiRequest,
  res: NextApiResponse,
  next: () => Promise<void>
) {
  try {
    // First check authentication
    await new Promise<void>((resolve, reject) => {
      isAuthenticated(req, res, (error?: Error) => {
        if (error) reject(error);
        else resolve();
      });
    });

    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Check if user requires MFA
    const requiresMFA = await mfaService.requiresMFA(user.id);
    if (!requiresMFA) {
      return next();
    }

    // Check if MFA is enabled for this user
    const mfaEnabled = await mfaService.isMFAEnabled(user.id);
    if (!mfaEnabled) {
      return res.status(403).json({ 
        message: 'MFA setup required for admin access',
        requireMFASetup: true 
      });
    }

    // Check if MFA was verified in this session
    const mfaVerified = req.session?.mfaVerified;
    if (!mfaVerified) {
      return res.status(403).json({ 
        message: 'MFA verification required',
        requireMFAVerification: true 
      });
    }

    return next();

  } catch (error) {
    console.error('MFA middleware error:', error);
    return res.status(500).json({ message: 'MFA verification failed' });
  }
}

// MFA verification endpoints
const setupMFASchema = z.object({
  totpCode: z.string().length(6).regex(/^\d{6}$/)
});

const verifyMFASchema = z.object({
  code: z.string().length(6).regex(/^\d{6}$/),
  type: z.enum(['totp', 'backup'])
});

export class MFAController {
  // Generate MFA setup QR code
  static async setupMFA(req: NextApiRequest, res: NextApiResponse) {
    try {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const ipAddress = req.headers['x-forwarded-for'] as string || req.connection.remoteAddress || '';
      const mfaData = await mfaService.generateTOTPSecret(user.id, user.email);

      return res.status(200).json({
        qrCodeUrl: mfaData.qrCodeUrl,
        backupCodes: mfaData.backupCodes,
        message: 'Scan the QR code with your authenticator app and verify with a TOTP code'
      });

    } catch (error) {
      console.error('MFA setup error:', error);
      return res.status(500).json({ message: 'Failed to setup MFA' });
    }
  }

  // Verify and enable MFA
  static async enableMFA(req: NextApiRequest, res: NextApiResponse) {
    try {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const parseResult = setupMFASchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          message: 'Invalid TOTP code format',
          errors: parseResult.error.errors 
        });
      }

      const { totpCode } = parseResult.data;
      const ipAddress = req.headers['x-forwarded-for'] as string || req.connection.remoteAddress || '';

      const success = await mfaService.enableMFA(user.id, totpCode, ipAddress);
      if (!success) {
        return res.status(400).json({ message: 'Invalid TOTP code' });
      }

      return res.status(200).json({ 
        message: 'MFA enabled successfully',
        enabled: true 
      });

    } catch (error) {
      console.error('MFA enable error:', error);
      return res.status(500).json({ message: 'Failed to enable MFA' });
    }
  }

  // Verify MFA code during login
  static async verifyMFA(req: NextApiRequest, res: NextApiResponse) {
    try {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const parseResult = verifyMFASchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          message: 'Invalid verification code format',
          errors: parseResult.error.errors 
        });
      }

      const { code, type } = parseResult.data;
      const ipAddress = req.headers['x-forwarded-for'] as string || req.connection.remoteAddress || '';

      let verified = false;
      if (type === 'totp') {
        verified = await mfaService.verifyTOTP(user.id, code, ipAddress);
      } else if (type === 'backup') {
        verified = await mfaService.verifyBackupCode(user.id, code, ipAddress);
      }

      if (!verified) {
        return res.status(400).json({ message: 'Invalid verification code' });
      }

      // Mark MFA as verified in session
      if (req.session) {
        req.session.mfaVerified = true;
        req.session.mfaVerifiedAt = new Date();
      }

      return res.status(200).json({ 
        message: 'MFA verification successful',
        verified: true 
      });

    } catch (error) {
      console.error('MFA verify error:', error);
      return res.status(500).json({ message: 'MFA verification failed' });
    }
  }

  // Get MFA status
  static async getMFAStatus(req: NextApiRequest, res: NextApiResponse) {
    try {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const status = await mfaService.getMFAStatus(user.id);
      const requiresMFA = await mfaService.requiresMFA(user.id);

      return res.status(200).json({
        ...status,
        required: requiresMFA,
        sessionVerified: req.session?.mfaVerified || false
      });

    } catch (error) {
      console.error('MFA status error:', error);
      return res.status(500).json({ message: 'Failed to get MFA status' });
    }
  }
}
