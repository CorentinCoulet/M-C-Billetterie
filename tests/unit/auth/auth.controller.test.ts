process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {},
}));

import authService from '@/services/authService';
import { createMocks } from 'node-mocks-http';
import authController from '../../../src/controllers/auth.controller';

jest.mock('@/services/authService');

const mockedAuthService = authService as jest.Mocked<typeof authService>;

function mockReqRes(options: Partial<import('node-mocks-http').RequestOptions> = {}) {
  const { req, res } = createMocks(options);
  return { req, res };
}

describe('AuthController', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('register', () => {
    it('should register a user and set a secure cookie', async () => {
      mockedAuthService.register.mockResolvedValue({
        user: { id: '1', email: 'test@example.com', role: 'USER' },
        token: 'token123',
      });
      const { req, res } = mockReqRes({
        method: 'POST',
        body: { email: 'test@example.com', password: 'secretpwd', name: 'Test' },
        headers: { 'user-agent': 'jest', 'x-forwarded-for': '127.0.0.1' },
      });

      await authController.register(req as any, res as any);

      expect(res._getStatusCode()).toBe(201);
      expect(res.getHeader('Set-Cookie')).toBeDefined();
      expect(JSON.parse(res._getData())).toHaveProperty('user');
      expect(JSON.parse(res._getData())).toHaveProperty('token');
    });

    it('should return 400 if input is invalid', async () => {
      const { req, res } = mockReqRes({
        method: 'POST',
        body: { email: 'bad', password: '1' },
      });

      await authController.register(req as any, res as any);

      expect(res._getStatusCode()).toBe(400);
      expect(JSON.parse(res._getData())).toHaveProperty('errors');
    });

    it('should return 400 if service throws', async () => {
      mockedAuthService.register.mockRejectedValue(new Error('User exists'));
      const { req, res } = mockReqRes({
        method: 'POST',
        body: { email: 'test@example.com', password: 'secretpwd', name: 'Test' },
      });

      await authController.register(req as any, res as any);

      expect(res._getStatusCode()).toBe(400);
      expect(JSON.parse(res._getData()).message).toBe('User exists');
    });
  });

  describe('login', () => {
    it('should login a user and set a secure cookie', async () => {
      mockedAuthService.login.mockResolvedValue({
        user: { id: '1', email: 'test@example.com', role: 'USER' },
        token: 'token123',
      });
      const { req, res } = mockReqRes({
        method: 'POST',
        body: { email: 'test@example.com', password: 'secretpwd' },
        headers: { 'user-agent': 'jest', 'x-forwarded-for': '127.0.0.1' },
      });

      await authController.login(req as any, res as any);

      expect(res._getStatusCode()).toBe(200);
      expect(res.getHeader('Set-Cookie')).toBeDefined();
      expect(JSON.parse(res._getData())).toHaveProperty('user');
      expect(JSON.parse(res._getData())).toHaveProperty('token');
    });

    it('should return 400 if input is invalid', async () => {
      const { req, res } = mockReqRes({
        method: 'POST',
        body: { email: 'bad', password: '1' },
      });

      await authController.login(req as any, res as any);

      expect(res._getStatusCode()).toBe(400);
      expect(JSON.parse(res._getData())).toHaveProperty('errors');
    });

    it('should return 401 if service throws', async () => {
      mockedAuthService.login.mockRejectedValue(new Error('Invalid credentials'));
      const { req, res } = mockReqRes({
        method: 'POST',
        body: { email: 'test@example.com', password: 'wrongpass' },
      });

      await authController.login(req as any, res as any);

      expect(res._getStatusCode()).toBe(401);
      expect(JSON.parse(res._getData()).message).toBe('Invalid credentials');
    });
  });

  describe('logout', () => {
    it('should clear the cookie and return 200', async () => {
      mockedAuthService.logout.mockResolvedValue(true);
      const { req, res } = mockReqRes({
        method: 'POST',
        cookies: { token: 'token123' },
      });

      await authController.logout(req as any, res as any);

      expect(res._getStatusCode()).toBe(200);
      expect(res.getHeader('Set-Cookie')).toBeDefined();
      expect(JSON.parse(res._getData()).message).toMatch(/logged out/i);
    });

    it('should handle errors gracefully', async () => {
      mockedAuthService.validateToken.mockRejectedValue(new Error('Logout error'));
      const { req, res } = mockReqRes({
        method: 'POST',
        cookies: { token: 'token123' },
      });

      await authController.logout(req as any, res as any);

      expect(res._getStatusCode()).toBe(500);
      expect(JSON.parse(res._getData()).message).toBe('Logout error');
    });
  });

  describe('getCurrentUser', () => {
    it('should return the current user if token is valid', async () => {
      mockedAuthService.validateToken.mockResolvedValue({
        id: '1',
        email: 'test@example.com',
        role: 'USER'
      });
      mockedAuthService.getCurrentUser.mockResolvedValue({
        id: '1',
        email: 'test@example.com',
        role: 'USER'
      });
      const { req, res } = mockReqRes({
        method: 'GET',
        cookies: { token: 'token123' },
      });

      await authController.getCurrentUser(req as any, res as any);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.user).toBeDefined();
      expect(data.user.password).toBeUndefined();
    });

    it('should return 401 if no token', async () => {
      const { req, res } = mockReqRes({ method: 'GET' });

      await authController.getCurrentUser(req as any, res as any);

      expect(res._getStatusCode()).toBe(401);
    });

    it('should return 401 if token is invalid', async () => {
      mockedAuthService.validateToken.mockResolvedValue(null);
      const { req, res } = mockReqRes({
        method: 'GET',
        cookies: { token: 'badtoken' },
      });

      await authController.getCurrentUser(req as any, res as any);

      expect(res._getStatusCode()).toBe(401);
    });
  });

  describe('changePassword', () => {
    it('should change password and clear cookie', async () => {
      mockedAuthService.validateToken.mockResolvedValue({ id: '1', email: 'test@example.com' });
      mockedAuthService.changePassword.mockResolvedValue(true);
      const { req, res } = mockReqRes({
        method: 'POST',
        cookies: { token: 'token123' },
        body: { oldPassword: 'oldpassword', newPassword: 'newpassword' },
      });

      await authController.changePassword(req as any, res as any);

      expect(res._getStatusCode()).toBe(200);
      expect(res.getHeader('Set-Cookie')).toBeDefined();
      expect(JSON.parse(res._getData()).message).toMatch(/password changed/i);
    });

    it('should return 401 if not authenticated', async () => {
      const { req, res } = mockReqRes({
        method: 'POST',
        body: { oldPassword: 'old', newPassword: 'new' },
      });

      await authController.changePassword(req as any, res as any);

      expect(res._getStatusCode()).toBe(401);
    });

    it('should return 400 if input is invalid', async () => {
      mockedAuthService.validateToken.mockResolvedValue({ id: '1', email: 'test@example.com' });
      const { req, res } = mockReqRes({
        method: 'POST',
        cookies: { token: 'token123' },
        body: { oldPassword: '', newPassword: '' },
      });

      await authController.changePassword(req as any, res as any);

      expect(res._getStatusCode()).toBe(400);
      expect(JSON.parse(res._getData())).toHaveProperty('errors');
    });

    it('should return 400 if service throws', async () => {
      mockedAuthService.validateToken.mockResolvedValue({ id: '1', email: 'test@example.com' });
      mockedAuthService.changePassword.mockRejectedValue(new Error('Wrong password'));
      const { req, res } = mockReqRes({
        method: 'POST',
        cookies: { token: 'token123' },
        body: { oldPassword: 'badpassword', newPassword: 'newpassword' },
      });

      await authController.changePassword(req as any, res as any);

      expect(res._getStatusCode()).toBe(400);
      expect(JSON.parse(res._getData()).message).toBe('Wrong password');
    });
  });
});