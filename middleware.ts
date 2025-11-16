import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { buildSecurityHeaders } from './config/security-headers';
import { verifyToken } from './src/lib/jwt';

const sharedSecurityHeaders = buildSecurityHeaders({
  env: process.env.NODE_ENV,
  additionalHeaders: [{ key: 'X-DNS-Prefetch-Control', value: 'on' }],
});

export async function middleware(request: NextRequest) {
  try {
    const pathname = request.nextUrl.pathname;
    const isApiRoute = pathname.startsWith('/api/');

    // Get token from cookie or Authorization header
    let token = request.cookies.get('auth-token')?.value;
    
    if (!token) {
      const authHeader = request.headers.get('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    // Verify token and get payload (DB validation done in API routes)
    let payload: any = null;
    
    if (token) {
      try {
        payload = verifyToken(token);
      } catch (error) {
        payload = null;
      }
    }

    // Check protected routes
    const isAdminRoute = pathname.startsWith('/admin');
    const isOrganizerRoute = pathname.startsWith('/organizer');
    const isDashboardRoute = pathname.startsWith('/dashboard');
    const isProtectedRoute = isAdminRoute || isOrganizerRoute || isDashboardRoute;

    if (isProtectedRoute && !payload) {
      const loginUrl = new URL('/login', request.url);
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

    // Dashboard: accessible à tout utilisateur authentifié (les sous-routes spécifiques gèrent leurs propres autorisations)

    // Create response with headers
    const response = NextResponse.next();

    sharedSecurityHeaders.forEach(({ key, value }) => {
      response.headers.set(key, value);
    });
    response.headers.set('Server', 'MC-Billetterie/1.0');
    
    // Cache control
    if (isApiRoute || isProtectedRoute) {
      response.headers.set('Cache-Control', 'no-store, must-revalidate');
    } else {
      response.headers.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=60');
    }

    // Add user info to headers if authenticated
    if (payload) {
      response.headers.set('X-User-ID', payload.userId);
      response.headers.set('X-User-Role', payload.role || '');
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
    // Restrict middleware to protected areas and APIs to reduce overhead on public pages
    '/api/:path*',
    '/admin/:path*',
    '/organizer/:path*',
    '/dashboard/:path*',
  ],
};
