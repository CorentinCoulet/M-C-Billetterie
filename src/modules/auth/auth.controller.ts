import { NextApiRequest, NextApiResponse } from 'next';
import authService from './auth.service';
import { 
  ChangePasswordDto, 
  LoginUserDto, 
  RegisterUserDto, 
  ResetPasswordDto, 
  ResetPasswordRequestDto 
} from './auth.types';

export class AuthController {
  /**
   * Register a new user
   */
  async register(req: NextApiRequest, res: NextApiResponse) {
    try {
      const userData: RegisterUserDto = req.body;
      
      // Validate input
      if (!userData.email || !userData.password) {
        return res.status(400).json({ message: 'Email and password are required' });
      }
      
      const result = await authService.register(userData);
      
      // Set cookie with token
      res.setHeader('Set-Cookie', `token=${result.token}; HttpOnly; Path=/; Max-Age=${60 * 60 * 24 * 7}; SameSite=Strict`);
      
      return res.status(201).json(result);
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  }

  /**
   * Login a user
   */
  async login(req: NextApiRequest, res: NextApiResponse) {
    try {
      const credentials: LoginUserDto = req.body;
      
      // Validate input
      if (!credentials.email || !credentials.password) {
        return res.status(400).json({ message: 'Email and password are required' });
      }
      
      const result = await authService.login(credentials);
      
      // Set cookie with token
      res.setHeader('Set-Cookie', `token=${result.token}; HttpOnly; Path=/; Max-Age=${60 * 60 * 24 * 7}; SameSite=Strict`);
      
      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(401).json({ message: error.message });
    }
  }

  /**
   * Logout a user
   */
  async logout(req: NextApiRequest, res: NextApiResponse) {
    try {
      const token = req.cookies.token;
      
      if (token) {
        await authService.logout(token);
      }
      
      // Clear the cookie
      res.setHeader('Set-Cookie', 'token=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict');
      
      return res.status(200).json({ message: 'Logged out successfully' });
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  }

  /**
   * Get current user
   */
  async getCurrentUser(req: NextApiRequest, res: NextApiResponse) {
    try {
      const token = req.cookies.token || req.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      
      const user = await authService.validateToken(token);
      
      if (!user) {
        return res.status(401).json({ message: 'Invalid or expired token' });
      }
      
      // Don't return the password
      const { password, ...userWithoutPassword } = user;
      
      return res.status(200).json({ user: userWithoutPassword });
    } catch (error: any) {
      return res.status(401).json({ message: error.message });
    }
  }

  /**
   * Change password
   */
  async changePassword(req: NextApiRequest, res: NextApiResponse) {
    try {
      const token = req.cookies.token || req.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      
      const user = await authService.validateToken(token);
      
      if (!user) {
        return res.status(401).json({ message: 'Invalid or expired token' });
      }
      
      const data: ChangePasswordDto = req.body;
      
      // Validate input
      if (!data.oldPassword || !data.newPassword) {
        return res.status(400).json({ message: 'Old password and new password are required' });
      }
      
      await authService.changePassword(user.id, data);
      
      // Clear the cookie since sessions are invalidated
      res.setHeader('Set-Cookie', 'token=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict');
      
      return res.status(200).json({ message: 'Password changed successfully' });
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(req: NextApiRequest, res: NextApiResponse) {
    try {
      const data: ResetPasswordRequestDto = req.body;
      
      // Validate input
      if (!data.email) {
        return res.status(400).json({ message: 'Email is required' });
      }
      
      await authService.requestPasswordReset(data);
      
      // Always return success to prevent email enumeration
      return res.status(200).json({ message: 'If your email exists in our system, you will receive a password reset link' });
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  }

  /**
   * Reset password
   */
  async resetPassword(req: NextApiRequest, res: NextApiResponse) {
    try {
      const data: ResetPasswordDto = req.body;
      
      // Validate input
      if (!data.token || !data.newPassword) {
        return res.status(400).json({ message: 'Token and new password are required' });
      }
      
      await authService.resetPassword(data);

      return res.status(200).json({ message: 'Password reset successfully' });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'An error occurred';
      return res.status(400).json({ message });
    }
  }
}

export default new AuthController();