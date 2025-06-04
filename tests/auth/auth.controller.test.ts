import { createMocks } from 'node-mocks-http';
import authController from '../../src/modules/auth/auth.controller';

jest.mock("../../src/modules/auth/auth.service", () => ({
  __esModule: true,
  default: {
    register: jest.fn(),
    login: jest.fn(),
    logout: jest.fn(),
    validateToken: jest.fn(),
    changePassword: jest.fn(),
    requestPasswordReset: jest.fn(),
    resetPassword: jest.fn(),
  }
}));

import mockedAuthService from '../../src/modules/auth/auth.service';

function createTypedMocks(options) {
  const { req, res } = createMocks(options);
  return { req, res };
}

describe('AuthController', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('register', () => {
    it('should register user and set cookie', async () => {
      mockedAuthService.register.mockResolvedValue({
        user: { id: '1', email: 'test@example.com' },
        token: 'token123',
      });
      const { req, res } = createTypedMocks({
        method: 'POST',
        body: { email: 'test@example.com', password: 'secret' },
      });

      await authController.register(req, res);

      expect(res._getStatusCode()).toBe(201);
      expect(JSON.parse(res._getData())).toEqual({
        user: { id: '1', email: 'test@example.com' },
        token: 'token123',
      });
      expect(res.getHeader('Set-Cookie')).toBeDefined();
      expect(mockedAuthService.register).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'secret',
      });
    });

    it('should return 400 when fields missing', async () => {
      const { req, res } = createTypedMocks({
        method: 'POST',
        body: { email: '' },
      });

      await authController.register(req, res);

      expect(res._getStatusCode()).toBe(400);
    });
  });

  describe('login', () => {
    it('should login user and set cookie', async () => {
      mockedAuthService.login.mockResolvedValue({
        user: { id: '1', email: 'test@example.com' },
        token: 'token123',
      });
      const { req, res } = createTypedMocks({
        method: 'POST',
        body: { email: 'test@example.com', password: 'secret' },
      });

      await authController.login(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(res.getHeader('Set-Cookie')).toBeDefined();
      expect(mockedAuthService.login).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'secret',
      });
    });

    it('should return 401 on error', async () => {
      mockedAuthService.login.mockRejectedValue(new Error('Invalid'));
      const { req, res } = createTypedMocks({
        method: 'POST',
        body: { email: 'wrong@example.com', password: 'bad' },
      });

      await authController.login(req, res);

      expect(res._getStatusCode()).toBe(401);
    });
  });

  describe('logout', () => {
    it('should logout user and clear cookie', async () => {
      mockedAuthService.logout.mockResolvedValue();
      const { req, res } = createTypedMocks({ method: 'POST', cookies: { token: 't' } });

      await authController.logout(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(res.getHeader('Set-Cookie')).toBeDefined();
      expect(mockedAuthService.logout).toHaveBeenCalledWith('t');
    });
  });

  describe('getCurrentUser', () => {
    it('should return user when token valid', async () => {
      mockedAuthService.validateToken.mockResolvedValue({ id: '1', email: 'a', password: 'p' });
      const { req, res } = createTypedMocks({ method: 'GET', cookies: { token: 'tok' } });

      await authController.getCurrentUser(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(JSON.parse(res._getData())).toEqual({ user: { id: '1', email: 'a' } });
    });

    it('should return 401 when no token', async () => {
      const { req, res } = createTypedMocks({ method: 'GET' });

      await authController.getCurrentUser(req, res);

      expect(res._getStatusCode()).toBe(401);
    });
  });

  describe('changePassword', () => {
    it('should change password for authenticated user', async () => {
      mockedAuthService.validateToken.mockResolvedValue({ id: '1', email: 'a' });
      mockedAuthService.changePassword.mockResolvedValue();
      const { req, res } = createTypedMocks({
        method: 'POST',
        cookies: { token: 'tok' },
        body: { oldPassword: 'old', newPassword: 'new' },
      });

      await authController.changePassword(req, res);

      expect(mockedAuthService.changePassword).toHaveBeenCalledWith('1', {
        oldPassword: 'old',
        newPassword: 'new',
      });
      expect(res._getStatusCode()).toBe(200);
      expect(res.getHeader('Set-Cookie')).toBeDefined();
    });

    it('should return 401 when no token', async () => {
      const { req, res } = createTypedMocks({ method: 'POST', body: { oldPassword: 'a', newPassword: 'b' } });

      await authController.changePassword(req, res);

      expect(res._getStatusCode()).toBe(401);
    });
  });

  describe('requestPasswordReset', () => {
    it('should request reset', async () => {
      mockedAuthService.requestPasswordReset.mockResolvedValue();
      const { req, res } = createTypedMocks({ method: 'POST', body: { email: 'a@b.c' } });

      await authController.requestPasswordReset(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(mockedAuthService.requestPasswordReset).toHaveBeenCalledWith({ email: 'a@b.c' });
    });

    it('should return 400 when email missing', async () => {
      const { req, res } = createTypedMocks({ method: 'POST', body: {} });

      await authController.requestPasswordReset(req, res);

      expect(res._getStatusCode()).toBe(400);
    });
  });

  describe('resetPassword', () => {
    it('should reset password', async () => {
      mockedAuthService.resetPassword.mockResolvedValue();
      const { req, res } = createTypedMocks({ method: 'POST', body: { token: 't', newPassword: 'n' } });

      await authController.resetPassword(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(mockedAuthService.resetPassword).toHaveBeenCalledWith({ token: 't', newPassword: 'n' });
    });

    it('should return 400 when fields missing', async () => {
      const { req, res } = createTypedMocks({ method: 'POST', body: { token: '' } });

      await authController.resetPassword(req, res);

      expect(res._getStatusCode()).toBe(400);
    });
  });
});