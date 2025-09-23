import { NextRequest, NextResponse } from 'next/server';
import { ZodError, ZodSchema } from 'zod';

/**
 * Helpers for Next.js API Routes to simplify common operations
 */

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errors?: any;
}

/**
 * Unified response helper for Next.js API Routes
 */
export class NextApiResponse {
  static success<T>(data?: T, message?: string, status = 200): NextResponse {
    const response: APIResponse<T> = {
      success: true,
      data,
      message,
    };
    
    return NextResponse.json(response, { status });
  }

  static error(message: string, status = 500, errors?: any): NextResponse {
    const response: APIResponse = {
      success: false,
      error: message,
      errors,
    };
    
    return NextResponse.json(response, { status });
  }

  static unauthorized(message = 'Unauthorized'): NextResponse {
    return this.error(message, 401);
  }

  static forbidden(message = 'Forbidden'): NextResponse {
    return this.error(message, 403);
  }

  static badRequest(message = 'Bad Request', errors?: any): NextResponse {
    return this.error(message, 400, errors);
  }

  static notFound(message = 'Not Found'): NextResponse {
    return this.error(message, 404);
  }

  static validationError(error: ZodError): NextResponse {
    return this.badRequest('Validation failed', error.flatten());
  }
}

/**
 * Middleware-like function to handle authentication
 */
export async function withAuth(
  request: NextRequest,
  handler: (req: NextRequest, user: any) => Promise<NextResponse>
) {
  try {
    // Extract token from Authorization header or cookies
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '') || 
                  request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextApiResponse.unauthorized('No token provided');
    }

    // Verify token and get user
    const { verifyToken } = await import('../lib/jwt');
    const payload = verifyToken(token) as any;
    
    if (!payload?.userId) {
      return NextApiResponse.unauthorized('Invalid token payload');
    }

    // Get user from database
    const { default: prisma } = await import('../lib/prisma');
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isVerified: true,
      }
    });

    if (!user) {
      return NextApiResponse.unauthorized('Invalid token');
    }

    return handler(request, user);
  } catch (error) {
    console.error('Auth middleware error:', error);
    return NextApiResponse.unauthorized('Authentication failed');
  }
}

/**
 * Middleware-like function to handle admin authentication
 */
export async function withAdminAuth(
  request: NextRequest,
  handler: (req: NextRequest, user: any) => Promise<NextResponse>
) {
  return withAuth(request, async (req, user) => {
    if (user.role !== 'ADMIN') {
      return NextApiResponse.forbidden('Admin access required');
    }
    return handler(req, user);
  });
}

/**
 * Validate request body with Zod schema
 */
export async function validateBody<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): Promise<{ data: T; error: null } | { data: null; error: NextResponse }> {
  try {
    const body = await request.json();
    const data = schema.parse(body);
    return { data, error: null };
  } catch (error) {
    if (error instanceof ZodError) {
      return { data: null, error: NextApiResponse.validationError(error) };
    }
    return { 
      data: null, 
      error: NextApiResponse.badRequest('Invalid JSON body') 
    };
  }
}

/**
 * Extract query parameters with type safety
 */
export function getQueryParam(
  request: NextRequest,
  key: string,
  defaultValue?: string
): string | undefined {
  const { searchParams } = new URL(request.url);
  return searchParams.get(key) || defaultValue;
}

/**
 * Handle HTTP method routing in a single route file
 */
export function createMethodHandler(handlers: {
  GET?: (request: NextRequest, context?: any) => Promise<NextResponse>;
  POST?: (request: NextRequest, context?: any) => Promise<NextResponse>;
  PUT?: (request: NextRequest, context?: any) => Promise<NextResponse>;
  PATCH?: (request: NextRequest, context?: any) => Promise<NextResponse>;
  DELETE?: (request: NextRequest, context?: any) => Promise<NextResponse>;
}) {
  return async (request: NextRequest, context?: any) => {
    const method = request.method as keyof typeof handlers;
    const handler = handlers[method];

    if (!handler) {
      return NextApiResponse.error(
        `Method ${method} not allowed`,
        405
      );
    }

    try {
      return await handler(request, context);
    } catch (error) {
      console.error(`API Error [${method}]:`, error);
      return NextApiResponse.error(
        'Internal server error',
        500
      );
    }
  };
}

/**
 * Rate limiting helper (basic implementation)
 */
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(
  request: NextRequest,
  maxRequests = 10,
  windowMs = 60000
): boolean {
  const ip = request.headers.get('x-forwarded-for') || 
             request.headers.get('x-real-ip') || 
             'unknown';
  const now = Date.now();
  const windowStart = now - windowMs;

  const currentData = requestCounts.get(ip);
  
  if (!currentData || currentData.resetTime < windowStart) {
    requestCounts.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (currentData.count >= maxRequests) {
    return false;
  }

  currentData.count++;
  return true;
}

/**
 * CORS helper for Next.js API routes
 */
export function withCors(response: NextResponse, origin?: string): NextResponse {
  const allowedOrigin = origin || process.env.FRONTEND_URL || '*';
  
  response.headers.set('Access-Control-Allow-Origin', allowedOrigin);
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  
  return response;
}

/**
 * Handle preflight OPTIONS requests
 */
export function handleCorsOptions(): NextResponse {
  const response = new NextResponse(null, { status: 200 });
  return withCors(response);
}
