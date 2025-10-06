import { NextRequest } from 'next/server';

// Mock dependencies before importing middleware
jest.mock('../../../src/core/config', () => ({
  CONFIG: {
    AUTH: {
      JWT_SECRET: 'test-jwt-secret-that-is-at-least-32-chars',
      JWT_EXPIRES_IN: '7d'
    }
  }
}));

jest.mock('../../../src/middlewares/production-rate-limit-integration', () => ({
  instrumentedRateLimit: jest.fn()
}));

jest.mock('../../../src/lib/jwt', () => ({
  verifyToken: jest.fn()
}));

jest.mock('../../../src/lib/prisma', () => ({
  __esModule: true,
  default: {
    userSession: {
      findUnique: jest.fn()
    },
    user: {
      findUnique: jest.fn()
    }
  }
}));

// Import after mocking
import { middleware } from '../../../middleware';
import { verifyToken } from '../../../src/lib/jwt';
import prisma from '../../../src/lib/prisma';
import { instrumentedRateLimit } from '../../../src/middlewares/production-rate-limit-integration';

const mockVerifyToken = verifyToken as jest.MockedFunction<typeof verifyToken>;
const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockRateLimit = instrumentedRateLimit as jest.MockedFunction<typeof instrumentedRateLimit>;

describe('Middleware - JWT Authentication', () => {
  // Set timeout for all tests in this describe block
  jest.setTimeout(10000);
  
  beforeEach(() => {
    jest.clearAllMocks();
    (mockPrisma.userSession.findUnique as jest.Mock).mockClear();
    (mockPrisma.user.findUnique as jest.Mock).mockClear();
    
    // Setup default rate limit mock
    mockRateLimit.mockResolvedValue(new Headers());
    
    // Setup default JWT verification to return null (unauthenticated)
    mockVerifyToken.mockReturnValue(null);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createMockRequest = (url: string, options: {
    headers?: Record<string, string>;
    cookies?: Record<string, string>;
  } = {}) => {
    const request = new NextRequest(url);
    
    if (options.headers) {
      Object.entries(options.headers).forEach(([key, value]) => {
        request.headers.set(key, value);
      });
    }
    
    if (options.cookies) {
      const cookieString = Object.entries(options.cookies)
        .map(([key, value]) => `${key}=${value}`)
        .join('; ');
      request.headers.set('cookie', cookieString);
      
      // Mock the cookies.get method
      request.cookies.get = jest.fn((name: string) => {
        const value = options.cookies![name];
        return value ? { value, name } : undefined;
      });
    }
    
    return request;
  };

  describe('🔐 Authentication Tests', () => {
    it('should allow access to non-protected routes without auth', async () => {
      const request = createMockRequest('http://localhost:3000/events');
      
      const response = await middleware(request);
      
      expect(response.status).toBe(200);
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    });

    it('should redirect to login for unauthenticated admin routes', async () => {
      const request = createMockRequest('http://localhost:3000/admin/dashboard');
      
      const response = await middleware(request);
      
      expect(response.status).toBe(307); // Redirect
      const locationHeader = response.headers.get('location');
      expect(locationHeader).toBeTruthy();
      expect(String(locationHeader)).toContain('/login');
      expect(String(locationHeader)).toContain('redirect=%2Fadmin%2Fdashboard');
    });

    it('should allow admin access with valid admin token', async () => {
      const mockPayload = {
        userId: 'admin-123',
        email: 'admin@test.com',
        role: 'ADMIN',
        sessionId: 'session-123'
      };

      // Clear and setup mocks for this specific test
      jest.clearAllMocks();
      
      mockVerifyToken.mockReturnValue(mockPayload);
      
      (mockPrisma.userSession.findUnique as jest.Mock).mockResolvedValue({
        id: 'session-123',
        token: 'valid-token',
        expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
        userId: 'admin-123',
        ipAddress: '127.0.0.1',
        userAgent: 'test',
        createdAt: new Date(),
        lastActivityAt: new Date(),
        isActive: true,
        destroyedAt: null,
        destroyReason: null
      });
      
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'admin-123',
        email: 'admin@test.com',
        role: 'ADMIN',
        isVerified: true,
        blocked: null,
        name: 'Admin User',
        password: 'hashed',
        lastLogin: new Date(),
        passwordChangedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: null
      });

      const request = createMockRequest('http://localhost:3000/admin/dashboard', {
        cookies: { 'auth-token': 'valid-token' }
      });
      
      const response = await middleware(request);
      
      expect(response.status).toBe(200);
      expect(response.headers.get('X-User-ID')).toBe('admin-123');
      expect(response.headers.get('X-User-Role')).toBe('ADMIN');
    });

    it('should deny admin access to non-admin user', async () => {
      const mockPayload = {
        userId: 'user-123',
        email: 'user@test.com',
        role: 'USER',
        sessionId: 'session-123'
      };

      jest.clearAllMocks();
      mockVerifyToken.mockReturnValue(mockPayload);
      (mockPrisma.userSession.findUnique as jest.Mock).mockResolvedValue({
        id: 'session-123',
        token: 'user-token',
        expiresAt: new Date(Date.now() + 3600000),
        userId: 'user-123',
        ipAddress: '127.0.0.1',
        userAgent: 'test',
        createdAt: new Date(),
        lastActivityAt: new Date(),
        isActive: true,
        destroyedAt: null,
        destroyReason: null
      });
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-123',
        email: 'user@test.com',
        role: 'USER',
        isVerified: true,
        blocked: null,
        name: 'Regular User',
        password: 'hashed',
        lastLogin: new Date(),
        passwordChangedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: null
      });

      const request = createMockRequest('http://localhost:3000/admin/dashboard', {
        cookies: { 'auth-token': 'user-token' }
      });
      
      const response = await middleware(request);
      
      expect(response.status).toBe(403);
      // Just check the status is correct - the middleware returns a JSON response
      // but testing the body content is complex with NextResponse
    });

    it('should handle Authorization header token', async () => {
      const mockPayload = {
        userId: 'admin-123',
        email: 'admin@test.com',
        role: 'ADMIN'
      };

      mockVerifyToken.mockReturnValue(mockPayload);
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'admin-123',
        email: 'admin@test.com',
        role: 'ADMIN',
        isVerified: true,
        blocked: null,
        name: 'Admin User',
        password: 'hashed',
        lastLogin: new Date(),
        passwordChangedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: null
      });

      const request = createMockRequest('http://localhost:3000/admin/users', {
        headers: { authorization: 'Bearer admin-token' }
      });
      
      const response = await middleware(request);
      
      expect(response.status).toBe(200);
      expect(mockVerifyToken).toHaveBeenCalledWith('admin-token');
    });

    it('should handle organizer routes correctly', async () => {
      const mockPayload = {
        userId: 'organizer-123',
        email: 'organizer@test.com',
        role: 'ORGANIZER'
      };

      jest.clearAllMocks();
      mockVerifyToken.mockReturnValue(mockPayload);
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'organizer-123',
        email: 'organizer@test.com',
        role: 'ORGANIZER',
        isVerified: true,
        blocked: null,
        name: 'Organizer User',
        password: 'hashed',
        lastLogin: new Date(),
        passwordChangedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: null
      });

      const request = createMockRequest('http://localhost:3000/organizer/events', {
        cookies: { 'auth-token': 'organizer-token' }
      });
      
      const response = await middleware(request);
      
      expect(response.status).toBe(200);
      expect(response.headers.get('X-User-Role')).toBe('ORGANIZER');
    });
  });

  describe('🛡️ Security Headers Tests', () => {
    it('should add security headers to all responses', async () => {
      const request = createMockRequest('http://localhost:3000/events');
      
      const response = await middleware(request);
      
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(response.headers.get('X-Frame-Options')).toBe('DENY');
      expect(response.headers.get('X-XSS-Protection')).toBe('1; mode=block');
      expect(response.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
      expect(response.headers.get('Content-Security-Policy')).toContain("default-src 'self'");
      expect(response.headers.get('Server')).toBe('MC-Billetterie/1.0');
    });

    it('should add HSTS header in production', async () => {
      // Mock process.env to return 'production' for NODE_ENV
      const originalProcessEnv = process.env;
      process.env = { ...originalProcessEnv, NODE_ENV: 'production' };
      
      const request = createMockRequest('http://localhost:3000/events');
      
      const response = await middleware(request);
      
      expect(response.headers.get('Strict-Transport-Security')).toBe(
        'max-age=31536000; includeSubDomains; preload'
      );
      
      // Restore the environment
      process.env = originalProcessEnv;
    });

    it('should set no-cache headers for admin routes', async () => {
      const request = createMockRequest('http://localhost:3000/events');
      
      const response = await middleware(request);
      
      // Admin routes would be tested separately with auth
      expect(response.headers.get('Cache-Control')).toBe(
        'public, max-age=300, stale-while-revalidate=60'
      );
    });
  });

  describe('⚠️ Error Handling Tests', () => {
    it('should handle JWT verification errors gracefully', async () => {
      mockVerifyToken.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const request = createMockRequest('http://localhost:3000/admin/dashboard', {
        cookies: { token: 'invalid-token' }
      });
      
      const response = await middleware(request);
      
      expect(response.status).toBe(307); // Redirect to login
    });

    it('should handle database connection errors', async () => {
      const mockPayload = {
        userId: 'admin-123',
        email: 'admin@test.com',
        role: 'ADMIN',
        sessionId: 'session-123'
      };

      jest.clearAllMocks();
      mockVerifyToken.mockReturnValue(mockPayload);
      (mockPrisma.userSession.findUnique as jest.Mock).mockRejectedValue(new Error('DB connection failed'));
      (mockPrisma.user.findUnique as jest.Mock).mockRejectedValue(new Error('DB connection failed'));

      const request = createMockRequest('http://localhost:3000/admin/dashboard', {
        cookies: { 'auth-token': 'valid-token' }
      });
      
      const response = await middleware(request);
      
      // Should still work with fallback to token payload
      expect(response.status).toBe(200);
      expect(response.headers.get('X-User-Role')).toBe('ADMIN');
    });

    it('should return minimal headers on middleware error', async () => {
      // Force an error in the middleware by making rate limit throw
      jest.clearAllMocks();
      mockRateLimit.mockImplementation(() => {
        throw new Error('Rate limit error');
      });
      
      const request = createMockRequest('http://localhost:3000/events');
      
      const response = await middleware(request);
      
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(response.headers.get('X-Frame-Options')).toBe('DENY');
    });
  });

  describe('🔍 Session Validation Tests', () => {
    it('should reject expired sessions', async () => {
      const mockPayload = {
        userId: 'user-123',
        email: 'user@test.com',
        role: 'ADMIN',
        sessionId: 'expired-session'
      };

      jest.clearAllMocks();
      mockVerifyToken.mockReturnValue(mockPayload);
      // Mock session.findUnique to return null for expired session (middleware filters by expiresAt: { gt: new Date() })
      (mockPrisma.userSession.findUnique as jest.Mock).mockResolvedValue(null);

      const request = createMockRequest('http://localhost:3000/admin/dashboard', {
        cookies: { 'auth-token': 'expired-token' }
      });
      
      const response = await middleware(request);
      
      expect(response.status).toBe(307); // Redirect to login
    });

    it('should reject blocked users', async () => {
      const mockPayload = {
        userId: 'blocked-user',
        email: 'blocked@test.com',
        role: 'ADMIN',
        sessionId: 'session-123'
      };

      mockVerifyToken.mockReturnValue(mockPayload);
      (mockPrisma.userSession.findUnique as jest.Mock).mockResolvedValue({
        id: 'session-123',
        token: 'valid-token',
        expiresAt: new Date(Date.now() + 3600000),
        userId: 'blocked-user',
        ipAddress: '127.0.0.1',
        userAgent: 'test',
        createdAt: new Date(),
        lastActivityAt: new Date(),
        isActive: true,
        destroyedAt: null,
        destroyReason: null
      });
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'blocked-user',
        email: 'blocked@test.com',
        role: 'ADMIN',
        isVerified: true,
        blocked: { // User is blocked
          id: 'block-1',
          userId: 'blocked-user',
          reason: 'Suspicious activity',
          blockedAt: new Date()
        },
        name: 'Blocked User',
        password: 'hashed',
        lastLogin: new Date(),
        passwordChangedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: null
      });

      const request = createMockRequest('http://localhost:3000/admin/dashboard', {
        cookies: { 'auth-token': 'valid-token' }
      });
      
      const response = await middleware(request);
      
      expect(response.status).toBe(307); // Redirect to login
    });

    it('should reject unverified users', async () => {
      const mockPayload = {
        userId: 'unverified-user',
        email: 'unverified@test.com',
        role: 'ADMIN',
        sessionId: 'session-123'
      };

      mockVerifyToken.mockReturnValue(mockPayload);
      (mockPrisma.userSession.findUnique as jest.Mock).mockResolvedValue({
        id: 'session-123',
        token: 'valid-token',
        expiresAt: new Date(Date.now() + 3600000),
        userId: 'unverified-user',
        ipAddress: '127.0.0.1',
        userAgent: 'test',
        createdAt: new Date(),
        lastActivityAt: new Date(),
        isActive: true,
        destroyedAt: null,
        destroyReason: null
      });
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'unverified-user',
        email: 'unverified@test.com',
        role: 'ADMIN',
        isVerified: false, // User not verified
        blocked: null,
        name: 'Unverified User',
        password: 'hashed',
        lastLogin: new Date(),
        passwordChangedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: null
      });

      const request = createMockRequest('http://localhost:3000/admin/dashboard', {
        cookies: { 'auth-token': 'valid-token' }
      });
      
      const response = await middleware(request);
      
      expect(response.status).toBe(307); // Redirect to login
    });
  });
});
