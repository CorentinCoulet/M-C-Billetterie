import { serialize } from 'cookie';
import { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import authService from './auth.service';
import { LoginUserDto, RegisterUserDto } from './auth.types';

const isProd = process.env.NODE_ENV === 'production';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().optional(),
});
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});
const changePasswordSchema = z.object({
  oldPassword: z.string().min(6),
  newPassword: z.string().min(6),
});
const resetPasswordRequestSchema = z.object({
  email: z.string().email(),
});
const resetPasswordSchema = z.object({
  token: z.string().min(10),
  newPassword: z.string().min(6),
});

export class AuthController {
   async register(req: NextApiRequest, res: NextApiResponse) {
    try {
      const parse = registerSchema.safeParse(req.body);
      if (!parse.success) {
        return res.status(400).json({ message: 'Invalid input', errors: parse.error.errors });
      }
      const userData: RegisterUserDto = parse.data;
      const result = await authService.register(
        userData,
        (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || '',
        req.headers['user-agent']
      );
      res.setHeader('Set-Cookie', serialize('token', result.token, {
        httpOnly: true,
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
        sameSite: 'strict',
        secure: isProd,
      }));
      return res.status(201).json(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'An error occurred';
      if (message.toLowerCase().includes('user exists')) {
        return res.status(400).json({ message: 'User exists' });
      }
      return res.status(500).json({ message });
    }
  }

  async login(req: NextApiRequest, res: NextApiResponse) {
    try {
      const parse = loginSchema.safeParse(req.body);
      if (!parse.success) {
        return res.status(400).json({ message: 'Invalid input', errors: parse.error.errors });
      }
      const credentials: LoginUserDto = parse.data;
      const result = await authService.login(
        credentials,
        (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || '',
        req.headers['user-agent']
      );
      res.setHeader('Set-Cookie', serialize('token', result.token, {
        httpOnly: true,
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
        sameSite: 'strict',
        secure: isProd,
      }));
      return res.status(200).json(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'An error occurred';
      if (message.toLowerCase().includes('invalid')||
          message.toLowerCase().includes('credentials')) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      return res.status(400).json({ message });
    }
  }

  async logout(req: NextApiRequest, res: NextApiResponse) {
    try {
      const token = req.cookies.token;
      if (token) {
        await authService.logout(token);
      }
      res.setHeader('Set-Cookie', serialize('token', '', {
        httpOnly: true,
        path: '/',
        maxAge: 0,
        sameSite: 'strict',
        secure: isProd,
      }));
      return res.status(200).json({ message: 'Logged out successfully' });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'An error occurred';
      return res.status(500).json({ message });
    }
  }

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
      // Exclude password from user object
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...userWithoutPassword } = user;
      return res.status(200).json({ user: userWithoutPassword });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'An error occurred';
      return res.status(401).json({ message });
    }
  }

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
      const parse = changePasswordSchema.safeParse(req.body);
      if (!parse.success) {
        return res.status(400).json({ message: 'Invalid input', errors: parse.error.errors });
      }
      await authService.changePassword(user.id, parse.data);
      res.setHeader('Set-Cookie', serialize('token', '', {
        httpOnly: true,
        path: '/',
        maxAge: 0,
        sameSite: 'strict',
        secure: isProd,
      }));
      return res.status(200).json({ message: 'Password changed successfully' });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'An error occurred';
      if (message.toLowerCase().includes('wrong password') ||
          message.toLowerCase().includes('current password is incorrect')) {
        return res.status(400).json({ message: 'Wrong password' });
      }
      return res.status(400).json({ message });
    }
  }

  async requestPasswordReset(req: NextApiRequest, res: NextApiResponse) {
    try {
      const parse = resetPasswordRequestSchema.safeParse(req.body);
      if (!parse.success) {
        return res.status(400).json({ message: 'Invalid input', errors: parse.error.errors });
      }
      await authService.requestPasswordReset(parse.data);
      return res.status(200).json({ message: 'If your email exists in our system, you will receive a password reset link' });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'An error occurred';
      return res.status(500).json({ message });
    }
  }

  async resetPassword(req: NextApiRequest, res: NextApiResponse) {
    try {
      const parse = resetPasswordSchema.safeParse(req.body);
      if (!parse.success) {
        return res.status(400).json({ message: 'Invalid input', errors: parse.error.errors });
      }
      await authService.resetPassword(parse.data);
      return res.status(200).json({ message: 'Password reset successfully' });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'An error occurred';
      return res.status(400).json({ message });
    }
  }
}

const authController = new AuthController();
export default authController;