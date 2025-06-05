process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {},
}));

import { createMocks } from 'node-mocks-http';
import authController from '../../src/modules/auth/auth.controller';
import authService from '../../src/modules/auth/auth.service';

jest.mock('../../src/modules/auth/auth.service');

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
        user: { id: '1', email: 'test@example.com', name: 'Test' },
        token: 'token123',
      });
      const { req, res } = mockReqRes({
        method: 'POST',
        body: { email: 'test@example.com', password: 'secret', name: 'Test' },
        headers: { 'user-agent': 'jest', 'x-forwarded-for': '127.0.0.1' },
      });

      await authController.register(req, res);

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

      await authController.register(req, res);

      expect(res._getStatusCode()).toBe(400);
      expect(JSON.parse(res._getData())).toHaveProperty('errors');
    });

    it('should return 400 if service throws', async () => {
      mockedAuthService.register.mockRejectedValue(new Error('User exists'));
      const { req, res } = mockReqRes({
        method: 'POST',
        body: { email: 'test@example.com', password: 'secret' },
      });

      await authController.register(req, res);

      expect(res._getStatusCode()).toBe(400);
      expect(JSON.parse(res._getData()).message).toBe('User exists');
    });
  });

  describe('login', () => {
    it('should login a user and set a secure cookie', async () => {
      mockedAuthService.login.mockResolvedValue({
        user: { id: '1', email: 'test@example.com', name: 'Test' },
        token: 'token123',
      });
      const { req, res } = mockReqRes({
        method: 'POST',
        body: { email: 'test@example.com', password: 'secret' },
        headers: { 'user-agent': 'jest', 'x-forwarded-for': '127.0.0.1' },
      });

      await authController.login(req, res);

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

      await authController.login(req, res);

      expect(res._getStatusCode()).toBe(400);
      expect(JSON.parse(res._getData())).toHaveProperty('errors');
    });

    it('should return 401 if service throws', async () => {
      mockedAuthService.login.mockRejectedValue(new Error('Invalid credentials'));
      const { req, res } = mockReqRes({
        method: 'POST',
        body: { email: 'test@example.com', password: 'wrongpass' },
      });

      await authController.login(req, res);

      expect(res._getStatusCode()).toBe(401);
      expect(JSON.parse(res._getData()).message).toBe('Invalid credentials');
    });
  });

  describe('logout', () => {
    it('should clear the cookie and return 200', async () => {
      mockedAuthService.logout.mockResolvedValue();
      const { req, res } = mockReqRes({
        method: 'POST',
        cookies: { token: 'token123' },
      });

      await authController.logout(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(res.getHeader('Set-Cookie')).toBeDefined();
      expect(JSON.parse(res._getData()).message).toMatch(/logged out/i);
    });

    it('should handle errors gracefully', async () => {
      mockedAuthService.logout.mockRejectedValue(new Error('Logout error'));
      const { req, res } = mockReqRes({
        method: 'POST',
        cookies: { token: 'token123' },
      });

      await authController.logout(req, res);

      expect(res._getStatusCode()).toBe(500);
      expect(JSON.parse(res._getData()).message).toBe('Logout error');
    });
  });

  describe('getCurrentUser', () => {
    it('should return the current user if token is valid', async () => {
      mockedAuthService.validateToken.mockResolvedValue({
        id: '1',
        email: 'test@example.com',
        name: 'Test',
        password: 'shouldnotappear'
      });
      const { req, res } = mockReqRes({
        method: 'GET',
        cookies: { token: 'token123' },
      });

      await authController.getCurrentUser(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.user).toBeDefined();
      expect(data.user.password).toBeUndefined();
    });

    it('should return 401 if no token', async () => {
      const { req, res } = mockReqRes({ method: 'GET' });

      await authController.getCurrentUser(req, res);

      expect(res._getStatusCode()).toBe(401);
    });

    it('should return 401 if token is invalid', async () => {
      mockedAuthService.validateToken.mockResolvedValue(null);
      const { req, res } = mockReqRes({
        method: 'GET',
        cookies: { token: 'badtoken' },
      });

      await authController.getCurrentUser(req, res);

      expect(res._getStatusCode()).toBe(401);
    });
  });

  describe('changePassword', () => {
    it('should change password and clear cookie', async () => {
      mockedAuthService.validateToken.mockResolvedValue({ id: '1', email: 'test@example.com' });
      mockedAuthService.changePassword.mockResolvedValue();
      const { req, res } = mockReqRes({
        method: 'POST',
        cookies: { token: 'token123' },
        body: { oldPassword: 'oldpass', newPassword: 'newpass' },
      });

      await authController.changePassword(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(res.getHeader('Set-Cookie')).toBeDefined();
      expect(JSON.parse(res._getData()).message).toMatch(/password changed/i);
    });

    it('should return 401 if not authenticated', async () => {
      const { req, res } = mockReqRes({
        method: 'POST',
        body: { oldPassword: 'old', newPassword: 'new' },
      });

      await authController.changePassword(req, res);

      expect(res._getStatusCode()).toBe(401);
    });

    it('should return 400 if input is invalid', async () => {
      mockedAuthService.validateToken.mockResolvedValue({ id: '1', email: 'test@example.com' });
      const { req, res } = mockReqRes({
        method: 'POST',
        cookies: { token: 'token123' },
        body: { oldPassword: '', newPassword: '' },
      });

      await authController.changePassword(req, res);

      expect(res._getStatusCode()).toBe(400);
      expect(JSON.parse(res._getData())).toHaveProperty('errors');
    });

    it('should return 400 if service throws', async () => {
      mockedAuthService.validateToken.mockResolvedValue({ id: '1', email: 'test@example.com' });
      mockedAuthService.changePassword.mockRejectedValue(new Error('Wrong password'));
      const { req, res } = mockReqRes({
        method: 'POST',
        cookies: { token: 'token123' },
        body: { oldPassword: 'badpass', newPassword: 'newpass' },
      });

      await authController.changePassword(req, res);

      expect(res._getStatusCode()).toBe(400);
      expect(JSON.parse(res._getData()).message).toBe('Wrong password');
    });
  });

  describe('requestPasswordReset', () => {
    it('should request password reset', async () => {
      mockedAuthService.requestPasswordReset.mockResolvedValue();
      const { req, res } = mockReqRes({
        method: 'POST',
        body: { email: 'test@example.com' },
      });

      await authController.requestPasswordReset(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(JSON.parse(res._getData()).message).toMatch(/password reset link/i);
    });

    it('should return 400 if input is invalid', async () => {
      const { req, res } = mockReqRes({
        method: 'POST',
        body: { email: 'bad' },
      });

      await authController.requestPasswordReset(req, res);

      expect(res._getStatusCode()).toBe(400);
      expect(JSON.parse(res._getData())).toHaveProperty('errors');
    });

    it('should handle errors gracefully', async () => {
      mockedAuthService.requestPasswordReset.mockRejectedValue(new Error('Reset error'));
      const { req, res } = mockReqRes({
        method: 'POST',
        body: { email: 'test@example.com' },
      });

      await authController.requestPasswordReset(req, res);

      expect(res._getStatusCode()).toBe(500);
      expect(JSON.parse(res._getData()).message).toBe('Reset error');
    });
  });

  describe('resetPassword', () => {
    it('should reset password', async () => {
      mockedAuthService.resetPassword.mockResolvedValue();
      const { req, res } = mockReqRes({
        method: 'POST',
        body: { token: 'toktoktoktok', newPassword: 'newpass' },
      });

      await authController.resetPassword(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(JSON.parse(res._getData()).message).toMatch(/password reset/i);
    });

    it('should return 400 if input is invalid', async () => {
      const { req, res } = mockReqRes({
        method: 'POST',
        body: { token: '', newPassword: '' },
      });

      await authController.resetPassword(req, res);

      expect(res._getStatusCode()).toBe(400);
      expect(JSON.parse(res._getData())).toHaveProperty('errors');
    });

    it('should return 400 if service throws', async () => {
      mockedAuthService.resetPassword.mockRejectedValue(new Error('Reset error'));
      const { req, res } = mockReqRes({
        method: 'POST',
        body: { token: 'toktoktoktok', newPassword: 'newpass' },
      });

      await authController.resetPassword(req, res);

      expect(res._getStatusCode()).toBe(400);
      expect(JSON.parse(res._getData()).message).toBe('Reset error');
    });
  });
});