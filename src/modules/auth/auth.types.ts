import { User } from '@prisma/client';

export interface RegisterUserDto {
  email: string;
  password: string;
  name?: string;
}

export interface LoginUserDto {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: Omit<User, 'password'>;
  token: string;
}

export interface TokenPayload {
  userId: string;
  email: string;
}

export interface RefreshTokenDto {
  refreshToken: string;
}

export interface ChangePasswordDto {
  oldPassword: string;
  newPassword: string;
}

export interface ResetPasswordRequestDto {
  email: string;
}

export interface ResetPasswordDto {
  token: string;
  newPassword: string;
}

export interface SessionData {
  id: string;
  userId: string;
  token: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  expiresAt: Date;
}