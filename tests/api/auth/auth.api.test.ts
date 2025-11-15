import { NextApiRequest, NextApiResponse } from 'next';
import { authController } from '../../../src/utils/test-controllers';
import {
    createAuthenticatedRequest,
    createMockRequest,
    expectError,
    expectSuccess,
    expectUnauthorized,
    expectValidationError,
    generateRandomEmail,
    hashTestPassword
} from '../../utils/helpers';
import { setupTests, teardownTests, testPrisma } from '../../utils/setup';

describe('Auth API', () => {
  beforeAll(async () => {
    await setupTests();
  });

  afterAll(async () => {
    await teardownTests();
  });

  beforeEach(async () => {
    await testPrisma.user.deleteMany();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const email = generateRandomEmail();
      const { req, res } = createMockRequest({
        method: 'POST',
        body: {
          email,
          password: 'Password123!',
          name: 'Test User'
        }
      });

      await authController.register(req as NextApiRequest, res as NextApiResponse);

      expectSuccess(res, 201);
      expect(res._getJSONData()).toHaveProperty('id');
      expect(res._getJSONData()).toHaveProperty('email', email);
      expect(res._getJSONData()).not.toHaveProperty('password');
    });

    it('should return validation error for invalid email', async () => {
      const { req, res } = createMockRequest({
        method: 'POST',
        body: {
          email: 'invalid-email',
          password: 'Password123!',
          name: 'Test User'
        }
      });

      await authController.register(req as NextApiRequest, res as NextApiResponse);

      expectValidationError(res, 'email');
    });

    it('should return validation error for weak password', async () => {
      const { req, res } = createMockRequest({
        method: 'POST',
        body: {
          email: generateRandomEmail(),
          password: 'weak',
          name: 'Test User'
        }
      });

      await authController.register(req as NextApiRequest, res as NextApiResponse);

      expectValidationError(res, 'password');
    });

    it('should return error for duplicate email', async () => {
      const email = generateRandomEmail();
      
      // Create a user first
      await testPrisma.user.create({
        data: {
          email,
          password: await hashTestPassword('Password123!'),
          name: 'Existing User'
        }
      });

      // Try to register with the same email
      const { req, res } = createMockRequest({
        method: 'POST',
        body: {
          email,
          password: 'Password123!',
          name: 'Test User'
        }
      });

      await authController.register(req as NextApiRequest, res as NextApiResponse);

      expectError(res, 400);
      expect(res._getJSONData().message).toMatch(/email.*already exists/i);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login successfully with correct credentials', async () => {
      const email = generateRandomEmail();
      const password = 'Password123!';
      
      // Create a user first
      await testPrisma.user.create({
        data: {
          email,
          password: await hashTestPassword(password),
          name: 'Test User',
          isEmailVerified: true
        }
      });

      const { req, res } = createMockRequest({
        method: 'POST',
        body: {
          email,
          password
        }
      });

      await authController.login(req as NextApiRequest, res as NextApiResponse);

      expectSuccess(res, 200);
      expect(res._getJSONData()).toHaveProperty('user');
      expect(res._getJSONData().user).toHaveProperty('email', email);
      expect(res._getJSONData()).toHaveProperty('token');
      expect(res._getJSONData()).not.toHaveProperty('password');
    });

    it('should return error for incorrect password', async () => {
      const email = generateRandomEmail();
      
      // Create a user first
      await testPrisma.user.create({
        data: {
          email,
          password: await hashTestPassword('Password123!'),
          name: 'Test User',
          isEmailVerified: true
        }
      });

      const { req, res } = createMockRequest({
        method: 'POST',
        body: {
          email,
          password: 'WrongPassword123!'
        }
      });

      await authController.login(req as NextApiRequest, res as NextApiResponse);

      expectError(res, 401);
      expect(res._getJSONData().message).toMatch(/invalid credentials/i);
    });

    it('should return error for non-existent user', async () => {
      const { req, res } = createMockRequest({
        method: 'POST',
        body: {
          email: 'nonexistent@example.com',
          password: 'Password123!'
        }
      });

      await authController.login(req as NextApiRequest, res as NextApiResponse);

      expectError(res, 401);
      expect(res._getJSONData().message).toMatch(/invalid credentials/i);
    });

    it('should return error for unverified email', async () => {
      const email = generateRandomEmail();
      const password = 'Password123!';
      
      // Create a user with unverified email
      await testPrisma.user.create({
        data: {
          email,
          password: await hashTestPassword(password),
          name: 'Test User',
          isEmailVerified: false
        }
      });

      const { req, res } = createMockRequest({
        method: 'POST',
        body: {
          email,
          password
        }
      });

      await authController.login(req as NextApiRequest, res as NextApiResponse);

      expectError(res, 401);
      expect(res._getJSONData().message).toMatch(/email.*not verified/i);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout successfully', async () => {
      const { req, res } = createMockRequest({
        method: 'POST'
      });

      await authController.logout(req as NextApiRequest, res as NextApiResponse);

      expectSuccess(res, 200);
      expect(res._getJSONData().message).toMatch(/logged out/i);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return current user when authenticated', async () => {
      const email = generateRandomEmail();
      
      // Create a user first
      const user = await testPrisma.user.create({
        data: {
          email,
          password: await hashTestPassword('Password123!'),
          name: 'Test User',
          isEmailVerified: true
        }
      });

      const { req, res } = createAuthenticatedRequest(user);

      await authController.getCurrentUser(req as any, res as NextApiResponse);

      expectSuccess(res, 200);
      expect(res._getJSONData()).toHaveProperty('id', user.id);
      expect(res._getJSONData()).toHaveProperty('email', email);
      expect(res._getJSONData()).not.toHaveProperty('password');
    });

    it('should return unauthorized when not authenticated', async () => {
      const { req, res } = createMockRequest({
        method: 'GET'
      });

      await authController.getCurrentUser(req as any, res as NextApiResponse);

      expectUnauthorized(res);
    });
  });

  describe('POST /api/auth/change-password', () => {
    it('should change password successfully', async () => {
      const email = generateRandomEmail();
      const oldPassword = 'OldPassword123!';
      const newPassword = 'NewPassword123!';
      
      // Create a user first
      const user = await testPrisma.user.create({
        data: {
          email,
          password: await hashTestPassword(oldPassword),
          name: 'Test User',
          isEmailVerified: true
        }
      });

      const { req, res } = createAuthenticatedRequest(user, {
        method: 'POST',
        body: {
          currentPassword: oldPassword,
          newPassword
        }
      });

      await authController.changePassword(req as any, res as NextApiResponse);

      expectSuccess(res, 200);
      expect(res._getJSONData().message).toMatch(/password.*changed/i);
    });

    it('should return error for incorrect current password', async () => {
      const email = generateRandomEmail();
      
      // Create a user first
      const user = await testPrisma.user.create({
        data: {
          email,
          password: await hashTestPassword('Password123!'),
          name: 'Test User',
          isEmailVerified: true
        }
      });

      const { req, res } = createAuthenticatedRequest(user, {
        method: 'POST',
        body: {
          currentPassword: 'WrongPassword123!',
          newPassword: 'NewPassword123!'
        }
      });

      await authController.changePassword(req as any, res as NextApiResponse);

      expectError(res, 400);
      expect(res._getJSONData().message).toMatch(/current password.*incorrect/i);
    });

    it('should return unauthorized when not authenticated', async () => {
      const { req, res } = createMockRequest({
        method: 'POST',
        body: {
          currentPassword: 'Password123!',
          newPassword: 'NewPassword123!'
        }
      });

      await authController.changePassword(req as any, res as NextApiResponse);

      expectUnauthorized(res);
    });
  });

  // Additional tests for other auth endpoints would follow the same pattern
  // For brevity, I'm not including all of them in this example
});