import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { buildSecurityHeaders } from './config/security-headers';
import { verifyToken } from './src/lib/jwt';
import prisma from './src/lib/prisma';
import { instrumentedRateLimit } from './src/middlewares/production-rate-limit-integration';

const sharedSecurityHeaders = buildSecurityHeaders({
  env: process.env.NODE_ENV,
  additionalHeaders: [{ key: 'X-DNS-Prefetch-Control', value: 'on' }],
});

export async function middleware(request: NextRequest) {
  try {
    const pathname = request.nextUrl.pathname;
    
    // Apply rate limiting
    try {
      await instrumentedRateLimit(request);
    } catch (error) {
      // Continue even if rate limiting fails
      console.error('Rate limit error:', error);
    }

    // Get token from cookie or Authorization header
    let token = request.cookies.get('auth-token')?.value;
    
    if (!token) {
      const authHeader = request.headers.get('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    // Verify token and get payload
    let payload: any = null;
    let user: any = null;
    
    if (token) {
      try {
        payload = verifyToken(token);
        
        if (payload) {
          // Try to validate session and user, but don't fail if DB is down
          try {
            // Validate session if sessionId is present
            if (payload.sessionId) {
              const session = await prisma.userSession.findUnique({
                where: {
                  id: payload.sessionId,
                  expiresAt: { gt: new Date() },
                  isActive: true
                }
              });
              
              if (!session) {
                payload = null; // Invalidate payload if session not found or expired
              }
            }
            
            // Fetch user to verify they're still active
            if (payload) {
              user = await prisma.user.findUnique({
                where: { id: payload.userId },
                include: { blocked: true }
              });
              
              // Check if user is blocked or unverified
              if (!user || user.blocked || !user.isVerified) {
                payload = null;
                user = null;
              }
            }
          } catch (dbError) {
            // Database error: continue with token payload as fallback
            console.error('Database error in middleware, using token payload as fallback:', dbError);
            // Keep payload from token, set user to null
            user = null;
          }
        }
      } catch (error) {
        // Token verification failed
        payload = null;
        user = null;
      }
    }

    // Check protected routes
    const isAdminRoute = pathname.startsWith('/admin');
    const isOrganizerRoute = pathname.startsWith('/organizer');
    const isDashboardRoute = pathname.startsWith('/dashboard');
    const isProtectedRoute = isAdminRoute || isOrganizerRoute || isDashboardRoute;

    if (isProtectedRoute && !payload) {
      const loginUrl = new URL('/auth/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Check role-based access
    if (isAdminRoute && payload && payload.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Access denied. Admin role required.' },
        { status: 403 }
      );
    }

    if (isOrganizerRoute && payload && payload.role !== 'ORGANIZER' && payload.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Access denied. Organizer role required.' },
        { status: 403 }
      );
    }

    // Create response with headers
    const response = NextResponse.next();

    sharedSecurityHeaders.forEach(({ key, value }) => {
      response.headers.set(key, value);
    });
    response.headers.set('Server', 'MC-Billetterie/1.0');
    
    // Cache control
    if (pathname.startsWith('/api/') || isProtectedRoute) {
      response.headers.set('Cache-Control', 'no-store, must-revalidate');
    } else {
      response.headers.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=60');
    }

    // Add user info to headers if authenticated
    if (payload) {
      response.headers.set('X-User-ID', payload.userId);
      response.headers.set('X-User-Role', payload.role || user?.role || '');
    }

    return response;
  } catch (error) {
    // In case of any error, return a minimal safe response
    console.error('Middleware error:', error);
    const response = NextResponse.next();
    sharedSecurityHeaders.forEach(({ key, value }) => {
      response.headers.set(key, value);
    });
    response.headers.set('Server', 'MC-Billetterie/1.0');
    return response;
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
