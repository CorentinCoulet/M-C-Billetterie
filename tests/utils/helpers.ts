import {createMocks, RequestMethod} from 'node-mocks-http';
import {NextApiRequest, NextApiResponse} from 'next';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import {PrismaClient} from '@prisma/client';

export type Role = 'USER' | 'ADMIN' | 'ORGANISATEUR';

export interface User {
    id: number;
    email: string;
    password?: string;
    name: string | null;
    role: Role;
    isEmailVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
}

interface MockResponseData {
    message?: string;
    errors?: Array<{
        path?: string[];
        field?: string;
        message: string;
    }>;
    [key: string]: unknown;
}

interface CookieOptions {
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: string;
    maxAge?: number;
}

// ========================================
// HELPERS TO CREATE MOCK REQUESTS
// ========================================

export interface MockRequestOptions {
    method?: RequestMethod;
    body?: Record<string, unknown>;
    query?: Record<string, string | string[]>;
    cookies?: Record<string, string>;
    headers?: Record<string, string>;
    user?: Partial<User>;
}

export function createMockRequest(options: MockRequestOptions = {}) {
    const {
        method = 'GET',
        body = {},
        query = {},
        cookies = {},
        headers = {},
    } = options;

    return createMocks<NextApiRequest, NextApiResponse>({
        method,
        body,
        query,
        cookies,
        headers: {
            'x-forwarded-for': '127.0.0.1',
            'user-agent': 'Mozilla/5.0 Test Browser',
            ...headers,
        },
    });
}

export function createAuthenticatedRequest(
    user: Partial<User>,
    options: MockRequestOptions = {}
) {
    const token = generateTestToken(user);

    return createMockRequest({
        ...options,
        cookies: {
            token,
            ...options.cookies,
        },
    });
}

// ========================================
// AUTHENTICATION HELPERS
// ========================================

export function generateTestToken(user: Partial<User>): string {
    const payload = {
        userId: user.id || 1,
        email: user.email || 'test@example.com',
        role: user.role || 'USER',
    };

    return jwt.sign(payload, process.env.JWT_SECRET || 'test-secret', {
        expiresIn: '1h',
    });
}

export async function hashTestPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, 12);
}

export function createTestUser(overrides: Partial<User> = {}): Partial<User> {
    return {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        role: 'USER' as Role,
        isEmailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...overrides,
    };
}

// ========================================
// RESPONSE VERIFICATION HELPERS
// ========================================

export function expectSuccess(res: MockResponse, statusCode: number = 200): MockResponseData {
    expect(res._getStatusCode()).toBe(statusCode);
    return JSON.parse(res._getData()) as MockResponseData;
}

export function expectError(
    res: MockResponse,
    statusCode: number,
    messagePattern?: string | RegExp
): MockResponseData {
    expect(res._getStatusCode()).toBe(statusCode);
    const data = JSON.parse(res._getData()) as MockResponseData;
    expect(data).toHaveProperty('message');

    if (messagePattern) {
        if (typeof messagePattern === 'string') {
            expect(data.message).toBe(messagePattern);
        } else {
            expect(data.message).toMatch(messagePattern);
        }
    }

    return data;
}

export function expectValidationError(res: MockResponse, field?: string): MockResponseData {
    const data = expectError(res, 400, /invalid|validation/i);

    if (field && data.errors) {
        const fieldError = data.errors.find((error) =>
            error.path?.includes(field) || error.field === field
        );
        expect(fieldError).toBeDefined();
    }

    return data;
}

export function expectUnauthorized(res: MockResponse, message?: string): MockResponseData {
    return expectError(res, 401, message || /not authenticated|unauthorized|invalid token/i);
}

export function expectForbidden(res: MockResponse): MockResponseData {
    return expectError(res, 403, /forbidden|access denied|insufficient permissions/i);
}

export function expectNotFound(res: MockResponse): MockResponseData {
    return expectError(res, 404, /not found/i);
}

// ========================================
// COOKIE VERIFICATION HELPERS
// ========================================

export function expectCookieSet(
    res: MockResponse,
    cookieName: string,
    options: CookieOptions = {}
): string {
    const headers = res._getHeaders();
    const cookies = headers['set-cookie'];
    expect(cookies).toBeDefined();

    const cookie = Array.isArray(cookies)
        ? cookies.find(c => c.startsWith(`${cookieName}=`))
        : cookies;

    expect(cookie).toBeDefined();

    if (options.httpOnly !== false) {
        expect(cookie).toContain('HttpOnly');
    }

    if (options.secure) {
        expect(cookie).toContain('Secure');
    }

    if (options.sameSite) {
        expect(cookie).toContain(`SameSite=${options.sameSite}`);
    }

    return cookie as string;
}

export function expectCookieCleared(res: MockResponse, cookieName: string): string {
    const headers = res._getHeaders();
    const cookies = headers['set-cookie'];
    expect(cookies).toBeDefined();

    const cookie = Array.isArray(cookies)
        ? cookies.find(c => c.startsWith(`${cookieName}=`))
        : cookies;

    expect(cookie).toBeDefined();
    expect(cookie).toContain(`${cookieName}=;`);
    expect(cookie).toContain('Max-Age=0');

    return cookie as string;
}

// ========================================
// TEST DATA HELPERS
// ========================================

export function waitFor(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export function generateRandomEmail(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2);
    return `test-${timestamp}-${random}@example.com`;
}

export function generateRandomString(length: number = 8): string {
    return Math.random().toString(36).substring(2, 2 + length);
}

// ========================================
// INTEGRATION TEST HELPERS
// ========================================

export async function createTestUserInDb(
    prisma: PrismaClient,
    userData: Partial<User> = {}
): Promise<User> {
    const defaultPassword = await hashTestPassword('password123');

    return await prisma.user.create({
        data: {
            email: generateRandomEmail(),
            password: defaultPassword,
            name: 'Test User',
            role: 'USER',
            isEmailVerified: true,
            ...userData,
        },
    });
}

export async function loginTestUser(
    prisma: PrismaClient,
    userData: Partial<User> = {}
): Promise<{ user: User; token: string }> {
    const user = await createTestUserInDb(prisma, userData);
    const token = generateTestToken(user);

    // Create session in database
    await prisma.session.create({
        data: {
            token,
            userId: user.id,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
            ipAddress: '127.0.0.1',
            userAgent: 'Mozilla/5.0 Test Browser',
        },
    });

    return {user, token};
}

// ========================================
// EXTERNAL SERVICES MOCK HELPERS
// ========================================

export const mockStripe = {
    paymentIntents: {
        create: jest.fn().mockResolvedValue({
            id: 'pi_test_123',
            client_secret: 'pi_test_123_secret',
            status: 'requires_payment_method',
        }),
        retrieve: jest.fn().mockResolvedValue({
            id: 'pi_test_123',
            status: 'succeeded',
            amount: 2000,
        }),
    },
};

export const mockNodemailer = {
    createTransporter: jest.fn().mockReturnValue({
        sendMail: jest.fn().mockResolvedValue({
            messageId: 'test-message-id',
            accepted: ['test@example.com'],
            rejected: [],
        }),
    }),
};

// ========================================
// USEFUL TYPES FOR TESTS
// ========================================

export interface TestContext {
    prisma: PrismaClient;
    user?: User;
    token?: string;
    cleanup: () => Promise<void>;
}

export type MockResponse = ReturnType<typeof createMocks>['res'];
export type MockRequest = ReturnType<typeof createMocks>['req'];