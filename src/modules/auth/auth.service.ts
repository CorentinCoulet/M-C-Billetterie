import prisma from '@/lib/prisma';
import { User } from "@prisma/client";
import bcrypt from 'bcryptjs';
import { signToken, verifyToken } from '../../lib/jwt';
import {
  AuthResponse,
  ChangePasswordDto,
  LoginUserDto,
  RegisterUserDto,
  ResetPasswordDto,
  ResetPasswordRequestDto,
  TokenPayload
} from './auth.types';

const SALT_ROUNDS = 10;
const SESSION_EXPIRY_DAYS = 7;

export class AuthService {
  /**
   * Register a new user
   */
  async register(userData: RegisterUserDto, ipAddress?: string, userAgent?: string): Promise<AuthResponse> {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: userData.email }
    });

    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(userData.password, SALT_ROUNDS);

    // Create the user
    const user = await prisma.user.create({
      data: {
        email: userData.email,
        name: userData.name,
        password: hashedPassword,
      },
    });

    // Generate JWT token (avec expiration explicite)
    const tokenPayload: TokenPayload = {
      userId: user.id,
      email: user.email,
    };
    const token = signToken(tokenPayload);

    // Create a session (avec IP et user-agent)
    await this.createSession(user.id, token, ipAddress, userAgent);

    // Return user data (excluding password) and token
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _password, ...userWithoutPassword } = user;
    return {
      user: userWithoutPassword,
      token,
    };
  }

  /**
   * Login a user
   */
  async login(credentials: LoginUserDto, ipAddress?: string, userAgent?: string): Promise<AuthResponse> {
    // Find the user
    const user = await prisma.user.findUnique({
      where: { email: credentials.email }
    });

    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Check if user is blocked
    const blockedUser = await prisma.blockedUser.findUnique({
      where: { userId: user.id }
    });

    if (blockedUser) {
      throw new Error('Your account has been blocked');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(credentials.password, user.password);
    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    // Generate JWT token (avec expiration explicite)
    const tokenPayload: TokenPayload = {
      userId: user.id,
      email: user.email,
    };
    const token = signToken(tokenPayload);

    // Create a session (avec IP et user-agent)
    await this.createSession(user.id, token, ipAddress, userAgent);

    // Return user data (excluding password) and token
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _password, ...userWithoutPassword } = user;
    return {
      user: userWithoutPassword,
      token,
    };
  }

  /**
   * Logout a user by invalidating their session
   */
  async logout(token: string): Promise<void> {
    await prisma.session.deleteMany({
      where: { token }
    });
  }

  /**
  /**
   * Validate a token and return the user
   */
  async validateToken(token: string): Promise<User | null> {
    try {
      // Verify the token
      const payload = verifyToken<TokenPayload>(token);
      // Check if session exists and is not expired
      const session = await prisma.session.findFirst({
        where: {
          token,
          userId: payload.userId,
          expiresAt: { gt: new Date() }
        }
      });

      if (!session) {
        return null;
      }

      // Get the user
      return await prisma.user.findUnique({
        where: { id: payload.userId }
      });
    } catch (error) {
      console.error('Token validation error:', error);
      return null;
    }
  }

  /**
   * Change user password
   */
  async changePassword(userId: string, data: ChangePasswordDto): Promise<void> {
    // Get the user
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Verify old password
    const isPasswordValid = await bcrypt.compare(data.oldPassword, user.password);
    if (!isPasswordValid) {
      throw new Error('Current password is incorrect');
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(data.newPassword, SALT_ROUNDS);

    // Update the password
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });

    // Invalidate all sessions
    await prisma.session.deleteMany({
      where: { userId }
    });
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(data: ResetPasswordRequestDto): Promise<void> {
    // Find the user
    const user = await prisma.user.findUnique({
      where: { email: data.email }
    });

    if (!user) {
      // Don't reveal that the email doesn't exist
      return;
    }

    // Generate a reset token (avec expiration explicite)
    const resetToken = signToken({ userId: user.id, email: user.email });

    // TODO: Send email with reset link
    console.log(`Password reset token for ${user.email}: ${resetToken}`);
  }

  /**
   * Reset password using token
   */
  async resetPassword(data: ResetPasswordDto): Promise<void> {
    try {
      // Verify the token
      const payload = verifyToken<TokenPayload>(data.token);

      // Find the user
      const user = await prisma.user.findUnique({
        where: { id: payload.userId }
      });

      if (!user) {
        throw new Error('Invalid or expired token');
      }

      // Hash the new password
      const hashedPassword = await bcrypt.hash(data.newPassword, SALT_ROUNDS);

      // Update the password
      await prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword }
      });

      // Invalidate all sessions
      await prisma.session.deleteMany({
        where: { userId: user.id }
      });
    } catch (error) {
      console.error('Error resetting password:', error);
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Create a new session
   */
  private async createSession(userId: string, token: string, ipAddress?: string, userAgent?: string): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + SESSION_EXPIRY_DAYS);

    await prisma.session.create({
      data: {
        userId,
        token,
        ipAddress,
        userAgent,
        expiresAt,
      }
    });
  }
}

const authService = new AuthService();
export default authService;