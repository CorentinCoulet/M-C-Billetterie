import { NextApiResponse } from 'next';
import { userController } from '../../../src/utils/test-controllers';
import { globalStorage } from '../../mocks/prisma.mock';
import {
  createAuthenticatedRequest,
  createMockRequest,
  expectError,
  expectForbidden,
  expectNotFound,
  expectSuccess,
  expectUnauthorized,
  expectValidationError,
  generateRandomEmail,
  hashTestPassword,
  Role
} from '../../utils/helpers';
import { setupTests, teardownTests, testPrisma } from '../../utils/setup';

describe('Users API', () => {
  beforeAll(async () => {
    await setupTests();
  });

  afterAll(async () => {
    await teardownTests();
  });

  beforeEach(async () => {
    await testPrisma.user.deleteMany();
    // Also clear the global storage directly
    globalStorage.user = [];
  });

  describe('GET /api/users', () => {
    it('should return all users for admin', async () => {
      // Create some test users directly in global storage
      const user1 = {
        id: 1,
        email: generateRandomEmail(),
        password: await hashTestPassword('Password123!'),
        name: 'Test User 1',
        role: 'USER' as Role,
        isVerified: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const user2 = {
        id: 2,
        email: generateRandomEmail(),
        password: await hashTestPassword('Password123!'),
        name: 'Test User 2',
        role: 'USER' as Role,
        isVerified: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Create admin user
      const adminUser = {
        id: 3,
        email: generateRandomEmail(),
        password: await hashTestPassword('Password123!'),
        name: 'Admin User',
        role: 'ADMIN' as Role,
        isVerified: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Add to global storage
      globalStorage.user = [user1, user2, adminUser];

      const { req, res } = createAuthenticatedRequest(adminUser as any);

      await userController.list(req as any, res as NextApiResponse);

      expectSuccess(res, 200);
      const users = res._getJSONData();
      expect(Array.isArray(users)).toBe(true);
      expect(users.length).toBeGreaterThanOrEqual(3); // At least the 3 users we created
      expect(users.some((u: any) => u.id === user1.id)).toBe(true);
      expect(users.some((u: any) => u.id === user2.id)).toBe(true);
      expect(users.some((u: any) => u.id === adminUser.id)).toBe(true);
    });

    it('should return forbidden for non-admin users', async () => {
      // Create regular user
      const regularUser = {
        id: 1,
        email: generateRandomEmail(),
        password: await hashTestPassword('Password123!'),
        name: 'Regular User',
        role: 'USER' as Role,
        isVerified: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      globalStorage.user = [regularUser];

      const { req, res } = createAuthenticatedRequest(regularUser as any);

      await userController.list(req as any, res as NextApiResponse);

      expectForbidden(res);
    });

    it('should return unauthorized for unauthenticated requests', async () => {
      const { req, res } = createMockRequest({
        method: 'GET'
      });

      await userController.list(req as any, res as NextApiResponse);

      expectUnauthorized(res);
    });
  });

  describe('GET /api/users/:id', () => {
    it('should return user by ID for the user themselves', async () => {
      // Create a user
      const user = {
        id: 1,
        email: generateRandomEmail(),
        password: await hashTestPassword('Password123!'),
        name: 'Test User',
        role: 'USER' as Role,
        isVerified: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      globalStorage.user = [user];

      const { req, res } = createAuthenticatedRequest(user as any, {
        method: 'GET',
        query: { id: user.id.toString() }
      });

      await userController.getById(req as any, res as NextApiResponse);

      expectSuccess(res, 200);
      expect(res._getJSONData()).toHaveProperty('id', user.id);
      expect(res._getJSONData()).toHaveProperty('email', user.email);
      expect(res._getJSONData()).not.toHaveProperty('password');
    });

    it('should return user by ID for admin', async () => {
      // Create a regular user
      const regularUser = {
        id: 1,
        email: generateRandomEmail(),
        password: await hashTestPassword('Password123!'),
        name: 'Regular User',
        role: 'USER' as Role,
        isVerified: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Create admin user
      const adminUser = {
        id: 2,
        email: generateRandomEmail(),
        password: await hashTestPassword('Password123!'),
        name: 'Admin User',
        role: 'ADMIN' as Role,
        isVerified: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      globalStorage.user = [regularUser, adminUser];

      const { req, res } = createAuthenticatedRequest(adminUser as any, {
        method: 'GET',
        query: { id: regularUser.id.toString() }
      });

      await userController.getById(req as any, res as NextApiResponse);

      expectSuccess(res, 200);
      expect(res._getJSONData()).toHaveProperty('id', regularUser.id);
      expect(res._getJSONData()).toHaveProperty('email', regularUser.email);
    });

    it('should return forbidden for other users', async () => {
      // Create two regular users
      const user1 = {
        id: 1,
        email: generateRandomEmail(),
        password: await hashTestPassword('Password123!'),
        name: 'User 1',
        role: 'USER' as Role,
        isVerified: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const user2 = {
        id: 2,
        email: generateRandomEmail(),
        password: await hashTestPassword('Password123!'),
        name: 'User 2',
        role: 'USER' as Role,
        isVerified: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      globalStorage.user = [user1, user2];

      const { req, res } = createAuthenticatedRequest(user1 as any, {
        method: 'GET',
        query: { id: user2.id.toString() }
      });

      await userController.getById(req as any, res as NextApiResponse);

      expectForbidden(res);
    });

    it('should return not found for non-existent user', async () => {
      // Create admin user
      const adminUser = {
        id: 1,
        email: generateRandomEmail(),
        password: await hashTestPassword('Password123!'),
        name: 'Admin User',
        role: 'ADMIN' as Role,
        isVerified: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      globalStorage.user = [adminUser];

      const { req, res } = createAuthenticatedRequest(adminUser as any, {
        method: 'GET',
        query: { id: '99999' } // Non-existent ID
      });

      await userController.getById(req as any, res as NextApiResponse);

      expectNotFound(res);
    });

    it('should return bad request for invalid ID', async () => {
      // Create a user
      const user = {
        id: 1,
        email: generateRandomEmail(),
        password: await hashTestPassword('Password123!'),
        name: 'Test User',
        role: 'USER' as Role,
        isVerified: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      globalStorage.user = [user];

      const { req, res } = createAuthenticatedRequest(user as any, {
        method: 'GET',
        query: { id: 'invalid-id' }
      });

      await userController.getById(req as any, res as NextApiResponse);

      expectError(res, 400);
      expect(res._getJSONData().message).toMatch(/invalid.*id/i);
    });
  });

  describe('PUT /api/users/:id', () => {
    it('should update user by ID for the user themselves', async () => {
      // Create a user
      const user = {
        id: 1,
        email: generateRandomEmail(),
        password: await hashTestPassword('Password123!'),
        name: 'Test User',
        role: 'USER' as Role,
        isVerified: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      globalStorage.user = [user];

      const newName = 'Updated Name';
      const { req, res } = createAuthenticatedRequest(user as any, {
        method: 'PUT',
        query: { id: user.id.toString() },
        body: { name: newName }
      });

      await userController.updateById(req as any, res as NextApiResponse);

      expectSuccess(res, 200);
      expect(res._getJSONData()).toHaveProperty('id', user.id);
      expect(res._getJSONData()).toHaveProperty('name', newName);
    });

    it('should update user by ID for admin', async () => {
      // Create a regular user
      const regularUser = {
        id: 1,
        email: generateRandomEmail(),
        password: await hashTestPassword('Password123!'),
        name: 'Regular User',
        role: 'USER' as Role,
        isVerified: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Create admin user
      const adminUser = {
        id: 2,
        email: generateRandomEmail(),
        password: await hashTestPassword('Password123!'),
        name: 'Admin User',
        role: 'ADMIN' as Role,
        isVerified: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      globalStorage.user = [regularUser, adminUser];

      const newName = 'Admin Updated Name';
      const { req, res } = createAuthenticatedRequest(adminUser as any, {
        method: 'PUT',
        query: { id: regularUser.id.toString() },
        body: { name: newName }
      });

      await userController.updateById(req as any, res as NextApiResponse);

      expectSuccess(res, 200);
      expect(res._getJSONData()).toHaveProperty('id', regularUser.id);
      expect(res._getJSONData()).toHaveProperty('name', newName);
    });

    it('should return forbidden for other users', async () => {
      // Create two regular users
      const user1 = {
        id: 1,
        email: generateRandomEmail(),
        password: await hashTestPassword('Password123!'),
        name: 'User 1',
        role: 'USER' as Role,
        isVerified: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const user2 = {
        id: 2,
        email: generateRandomEmail(),
        password: await hashTestPassword('Password123!'),
        name: 'User 2',
        role: 'USER' as Role,
        isVerified: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      globalStorage.user = [user1, user2];

      const { req, res } = createAuthenticatedRequest(user1 as any, {
        method: 'PUT',
        query: { id: user2.id.toString() },
        body: { name: 'Attempted Update' }
      });

      await userController.updateById(req as any, res as NextApiResponse);

      expectForbidden(res);
    });

    it('should return validation error for invalid input', async () => {
      // Create a user
      const user = {
        id: 1,
        email: generateRandomEmail(),
        password: await hashTestPassword('Password123!'),
        name: 'Test User',
        role: 'USER' as Role,
        isVerified: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      globalStorage.user = [user];

      const { req, res } = createAuthenticatedRequest(user as any, {
        method: 'PUT',
        query: { id: user.id.toString() },
        body: { email: 'invalid-email' }
      });

      await userController.updateById(req as any, res as NextApiResponse);

      expectValidationError(res, 'email');
    });
  });

  describe('DELETE /api/users/:id', () => {
    it('should delete user by ID for admin', async () => {
      // Create a regular user
      const regularUser = {
        id: 1,
        email: generateRandomEmail(),
        password: await hashTestPassword('Password123!'),
        name: 'Regular User',
        role: 'USER' as Role,
        isVerified: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Create admin user
      const adminUser = {
        id: 2,
        email: generateRandomEmail(),
        password: await hashTestPassword('Password123!'),
        name: 'Admin User',
        role: 'ADMIN' as Role,
        isVerified: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      globalStorage.user = [regularUser, adminUser];

      const { req, res } = createAuthenticatedRequest(adminUser as any, {
        method: 'DELETE',
        query: { id: regularUser.id.toString() }
      });

      await userController.deleteById(req as any, res as NextApiResponse);

      expectSuccess(res, 200);
      expect(res._getJSONData().message).toMatch(/deleted/i);

      // Verify user was deleted
      expect(globalStorage.user.find((u: any) => u.id === regularUser.id)).toBeUndefined();
    });

    it('should return forbidden for non-admin users', async () => {
      // Create two regular users
      const user1 = {
        id: 1,
        email: generateRandomEmail(),
        password: await hashTestPassword('Password123!'),
        name: 'User 1',
        role: 'USER' as Role,
        isVerified: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const user2 = {
        id: 2,
        email: generateRandomEmail(),
        password: await hashTestPassword('Password123!'),
        name: 'User 2',
        role: 'USER' as Role,
        isVerified: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      globalStorage.user = [user1, user2];

      const { req, res } = createAuthenticatedRequest(user1 as any, {
        method: 'DELETE',
        query: { id: user2.id.toString() }
      });

      await userController.deleteById(req as any, res as NextApiResponse);

      expectForbidden(res);

      // Verify user was not deleted
      expect(globalStorage.user.find((u: any) => u.id === user2.id)).toBeDefined();
    });
  });

  describe('GET /api/users/profile', () => {
    it('should return current user profile', async () => {
      // Create a user
      const user = {
        id: 1,
        email: generateRandomEmail(),
        password: await hashTestPassword('Password123!'),
        name: 'Test User',
        role: 'USER' as Role,
        isVerified: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      globalStorage.user = [user];

      const { req, res } = createAuthenticatedRequest(user as any);

      await userController.getProfile(req as any, res as NextApiResponse);

      expectSuccess(res, 200);
      expect(res._getJSONData()).toHaveProperty('id', user.id);
      expect(res._getJSONData()).toHaveProperty('email', user.email);
      expect(res._getJSONData()).not.toHaveProperty('password');
    });

    it('should return unauthorized for unauthenticated requests', async () => {
      const { req, res } = createMockRequest({
        method: 'GET'
      });

      await userController.getProfile(req as any, res as NextApiResponse);

      expectUnauthorized(res);
    });
  });

  describe('PUT /api/users/profile', () => {
    it('should update current user profile', async () => {
      // Create a user
      const user = {
        id: 1,
        email: generateRandomEmail(),
        password: await hashTestPassword('Password123!'),
        name: 'Test User',
        role: 'USER' as Role,
        isVerified: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      globalStorage.user = [user];

      const newName = 'Updated Profile Name';
      const { req, res } = createAuthenticatedRequest(user as any, {
        method: 'PUT',
        body: { name: newName }
      });

      await userController.updateProfile(req as any, res as NextApiResponse);

      expectSuccess(res, 200);
      expect(res._getJSONData()).toHaveProperty('id', user.id);
      expect(res._getJSONData()).toHaveProperty('name', newName);
    });

    it('should return validation error for invalid input', async () => {
      // Create a user
      const user = {
        id: 1,
        email: generateRandomEmail(),
        password: await hashTestPassword('Password123!'),
        name: 'Test User',
        role: 'USER' as Role,
        isVerified: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      globalStorage.user = [user];

      const { req, res } = createAuthenticatedRequest(user as any, {
        method: 'PUT',
        body: { email: 'invalid-email' }
      });

      await userController.updateProfile(req as any, res as NextApiResponse);

      expectValidationError(res, 'email');
    });

    it('should return unauthorized for unauthenticated requests', async () => {
      const { req, res } = createMockRequest({
        method: 'PUT',
        body: { name: 'Unauthorized Update' }
      });

      await userController.updateProfile(req as any, res as NextApiResponse);

      expectUnauthorized(res);
    });
  });

  describe('GET /api/users/stats', () => {
    it('should return user stats', async () => {
      // Create a user
      const user = {
        id: 1,
        email: generateRandomEmail(),
        password: await hashTestPassword('Password123!'),
        name: 'Test User',
        role: 'USER' as Role,
        isVerified: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      globalStorage.user = [user];

      const { req, res } = createAuthenticatedRequest(user as any);

      await userController.getStats(req as any, res as NextApiResponse);

      expectSuccess(res, 200);
      // The exact structure of stats would depend on the implementation
      // but we can at least verify it returns a successful response
    });

    it('should return unauthorized for unauthenticated requests', async () => {
      const { req, res } = createMockRequest({
        method: 'GET'
      });

      await userController.getStats(req as any, res as NextApiResponse);

      expectUnauthorized(res);
    });
  });
});
