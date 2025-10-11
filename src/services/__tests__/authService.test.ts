import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AuthService } from '../authService';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    userSession: {
      create: jest.fn(),
      deleteMany: jest.fn(),
      findFirst: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

describe('AuthService', () => {
  let authService: AuthService;
  
  // Test data
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    password: 'hashedPassword123',
    role: 'USER',
    name: 'Test User',
  };

  const mockToken = 'mock.jwt.token';
  const mockSessionId = 'session-123';

  beforeEach(() => {
    authService = new AuthService();
    jest.clearAllMocks();
    
    // Default JWT_SECRET for tests
    process.env.JWT_SECRET = 'test-secret-key-minimum-32-characters-long';
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('validateToken', () => {
    it('should validate token and return user info', async () => {
      // Arrange
      const decodedToken = {
        userId: mockUser.id,
        sessionId: mockSessionId,
      };

      (jwt.verify as jest.Mock).mockReturnValue(decodedToken);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      // Act
      const result = await authService.validateToken(mockToken);

      // Assert
      expect(jwt.verify).toHaveBeenCalledWith(mockToken, expect.any(String));
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        select: {
          id: true,
          email: true,
          role: true,
        },
      });
      expect(result).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
        sessionId: mockSessionId,
      });
    });

    it('should return null if token is invalid', async () => {
      // Arrange
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      // Act
      const result = await authService.validateToken('invalid-token');

      // Assert
      expect(result).toBeNull();
    });

    it('should return null if user not found in database', async () => {
      // Arrange
      const decodedToken = {
        userId: 'non-existent-user',
        sessionId: mockSessionId,
      };

      (jwt.verify as jest.Mock).mockReturnValue(decodedToken);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      // Act
      const result = await authService.validateToken(mockToken);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null if token missing userId or sessionId', async () => {
      // Arrange
      const decodedToken = {
        userId: mockUser.id,
        // sessionId missing
      };

      (jwt.verify as jest.Mock).mockReturnValue(decodedToken);

      // Act
      const result = await authService.validateToken(mockToken);

      // Assert
      expect(result).toBeNull();
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('cleanExpiredSessions', () => {
    it('should delete expired sessions', async () => {
      // Arrange
      const now = new Date();
      (prisma.userSession.deleteMany as jest.Mock).mockResolvedValue({ count: 5 });

      // Act
      await authService.cleanExpiredSessions();

      // Assert
      expect(prisma.userSession.deleteMany).toHaveBeenCalledWith({
        where: {
          expiresAt: {
            lt: expect.any(Date),
          },
        },
      });
    });

    it('should handle errors gracefully', async () => {
      // Arrange
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      (prisma.userSession.deleteMany as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      // Act
      await authService.cleanExpiredSessions();

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('login', () => {
    const loginData = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should login user with valid credentials', async () => {
      // Arrange
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (jwt.sign as jest.Mock).mockReturnValue(mockToken);
      (prisma.userSession.create as jest.Mock).mockResolvedValue({
        id: mockSessionId,
      });

      // Act
      const result = await authService.login(loginData.email, loginData.password);

      // Assert
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: loginData.email },
        select: {
          id: true,
          email: true,
          password: true,
          role: true,
        },
      });
      expect(bcrypt.compare).toHaveBeenCalledWith(
        loginData.password,
        mockUser.password
      );
      expect(result).not.toBeNull();
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('token');
      expect(result!.user.email).toBe(mockUser.email);
    });

    it('should return null if user not found', async () => {
      // Arrange
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      // Act
      const result = await authService.login(loginData.email, loginData.password);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null if password is incorrect', async () => {
      // Arrange
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      // Act
      const result = await authService.login(loginData.email, 'wrongPassword');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('register', () => {
    const registerData = {
      email: 'newuser@example.com',
      password: 'password123',
      name: 'New User',
    };

    it('should register a new user', async () => {
      // Arrange
      const hashedPassword = 'hashedPassword123';
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      (prisma.user.create as jest.Mock).mockResolvedValue({
        ...registerData,
        id: 'new-user-123',
        password: hashedPassword,
        role: 'USER',
      });
      (jwt.sign as jest.Mock).mockReturnValue(mockToken);
      (prisma.userSession.create as jest.Mock).mockResolvedValue({
        id: mockSessionId,
      });

      // Act
      const result = await authService.register(
        registerData.email,
        registerData.password,
        registerData.name
      );

      // Assert
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: registerData.email },
      });
      expect(bcrypt.hash).toHaveBeenCalled();
      expect(prisma.user.create).toHaveBeenCalled();
      expect(result).not.toBeNull();
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('token');
    });

    it('should return null if user already exists', async () => {
      // Arrange
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      // Act
      const result = await authService.register(
        registerData.email,
        registerData.password,
        registerData.name
      );

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('logout', () => {
    it('should logout user and delete session', async () => {
      // Arrange
      (prisma.userSession.delete as jest.Mock).mockResolvedValue({
        id: mockSessionId,
      });

      // Act
      const result = await authService.logout(mockSessionId);

      // Assert
      expect(prisma.userSession.delete).toHaveBeenCalledWith({
        where: { id: mockSessionId },
      });
      expect(result).toBe(true);
    });

    it('should return false on error', async () => {
      // Arrange
      (prisma.userSession.delete as jest.Mock).mockRejectedValue(
        new Error('Session not found')
      );

      // Act
      const result = await authService.logout(mockSessionId);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('changePassword', () => {
    const oldPassword = 'oldPassword123';
    const newPassword = 'newPassword123';

    it('should change user password', async () => {
      // Arrange
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('newHashedPassword');
      (prisma.user.update as jest.Mock).mockResolvedValue({
        ...mockUser,
        password: 'newHashedPassword',
      });

      // Act
      await authService.changePassword(mockUser.id, oldPassword, newPassword);

      // Assert
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        select: {
          id: true,
          password: true,
        },
      });
      expect(bcrypt.compare).toHaveBeenCalledWith(oldPassword, mockUser.password);
      expect(bcrypt.hash).toHaveBeenCalledWith(newPassword, 10);
      expect(prisma.user.update).toHaveBeenCalled();
    });

    it('should return false if old password is incorrect', async () => {
      // Arrange
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      // Act
      const result = await authService.changePassword(
        mockUser.id,
        'wrongPassword',
        newPassword
      );

      // Assert
      expect(result).toBe(false);
    });

    it('should return false if user not found', async () => {
      // Arrange
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      // Act
      const result = await authService.changePassword(
        'non-existent',
        oldPassword,
        newPassword
      );

      // Assert
      expect(result).toBe(false);
    });
  });
});
