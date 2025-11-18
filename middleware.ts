import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
// IMPORTANT: Edge middleware runs in a restricted runtime (no Node APIs like jsonwebtoken)
// Do NOT import server-side JWT libraries here. We only perform a lightweight check
// based on the presence of the auth cookie and defer full verification to API routes.

type HeaderKV = { key: string; value: string };

// Fallback static headers in case dynamic import fails in Edge runtime
const FALLBACK_SECURITY_HEADERS: HeaderKV[] = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Content-Security-Policy',
    value:
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none'",
  },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
];

async function buildHeaders(): Promise<HeaderKV[]> {
  try {
    // Dynamic import to avoid CJS/ESM issues at module evaluation time in Edge
    const mod: any = await import('./config/security-headers');
    const fn = (mod as any).buildSecurityHeaders as
      | ((opts: { env?: string; additionalHeaders?: HeaderKV[] }) => HeaderKV[])
      | undefined;
    if (typeof fn === 'function') {
      return fn({
        env: process.env.NODE_ENV,
        additionalHeaders: [{ key: 'X-DNS-Prefetch-Control', value: 'on' }],
      });
    }
  } catch (e) {
    // Last resort: use fallback headers and continue
    console.error('Security headers module failed to load in middleware:', e);
  }
  return FALLBACK_SECURITY_HEADERS;
}

export async function middleware(request: NextRequest) {
  try {
    const pathname = request.nextUrl.pathname;
    const isApiRoute = pathname.startsWith('/api/');

    // Get token depending on route type
    // For API routes, we accept Authorization header or auth cookie.
    // For page routes (dashboard/admin/organizer), we REQUIRE the 'auth-token' cookie to avoid
    // accidental exposure via manually crafted Authorization headers.
    let token: string | undefined = undefined;
    if (isApiRoute) {
      token = request.cookies.get('auth-token')?.value;
      if (!token) {
        const authHeader = request.headers.get('authorization');
        if (authHeader?.startsWith('Bearer ')) {
          token = authHeader.substring(7);
        }
      }
    } else {
      token = request.cookies.get('auth-token')?.value;
    }

    // Edge-safe: consider user "authenticated" if a token is present.
    // Full validation (signature, expiration, role) is performed in API routes via withAuth.
    // We avoid jsonwebtoken usage here due to Edge limitations to fix redirect loops.
    let payload: any = null;
    if (token) {
      payload = { tokenPresent: true };
    }

    // Check protected routes
    const isAdminRoute = pathname.startsWith('/admin');
    const isOrganizerRoute = pathname.startsWith('/organizer');
    const isDashboardRoute = pathname.startsWith('/dashboard');
    const isProtectedRoute = isAdminRoute || isOrganizerRoute || isDashboardRoute;

    // If user is already authenticated (token present) and tries to access the login page,
    // redirect them to the intended destination (redirect param) or a sensible default.
    if (pathname === '/login' && payload) {
      const url = new URL(request.url);
      const redirect = url.searchParams.get('redirect') || '';
      const safeRedirect = redirect.startsWith('/') && !redirect.startsWith('/api');
      
      // Default destination if no safe redirect provided
      // We choose /dashboard as a sensible default for authenticated users of this app
      // (role-based routing will be handled client-side and/or by API protections)
      let defaultDest = '/dashboard';

      const dest = safeRedirect ? redirect : defaultDest;
      const destUrl = new URL(dest, request.url);
      return NextResponse.redirect(destUrl);
    }

    if (isProtectedRoute && !payload) {
      const loginUrl = new URL('/login', request.url);
      // Preserve full path with query (including targeted organizer context like ?org=...)
      loginUrl.searchParams.set('redirect', request.nextUrl.pathname + (request.nextUrl.search || ''));
      return NextResponse.redirect(loginUrl);
    }

    // Role-based access: Only enforce if a role is explicitly available (not the case in Edge here).
    // API routes will strictly validate roles; pages can self-guard.
    if (isAdminRoute && payload && (payload as any).role && (payload as any).role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Access denied. Admin role required.' },
        { status: 403 }
      );
    }

    if (isOrganizerRoute && payload && (payload as any).role && (payload as any).role !== 'ORGANIZER' && (payload as any).role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Access denied. Organizer role required.' },
        { status: 403 }
      );
    }

    // Dashboard: accessible à tout utilisateur authentifié (les sous-routes spécifiques gèrent leurs propres autorisations)

    // Create response with headers
    const response = NextResponse.next();

    const securityHeaders = await buildHeaders();
    securityHeaders.forEach(({ key, value }) => {
      response.headers.set(key, value);
    });
    response.headers.set('Server', 'MC-Billetterie/1.0');
    
    // Cache control
    if (isApiRoute || isProtectedRoute) {
      response.headers.set('Cache-Control', 'no-store, must-revalidate');
    } else {
      response.headers.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=60');
    }

    // Add minimal user info header if authenticated (no PII, only a flag)
    if (payload) {
      response.headers.set('X-Auth', '1');
    }

    return response;
  } catch (error) {
    // In case of any error, return a minimal safe response
    console.error('Middleware error:', error);
    const response = NextResponse.next();
    const headers = await buildHeaders();
    headers.forEach(({ key, value }) => {
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
    '/login',
  ],
};
