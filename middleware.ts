import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { verifyToken } from './src/lib/jwt';
import prisma from './src/lib/prisma';
import { instrumentedRateLimit } from './src/middlewares/production-rate-limit-integration';

/**
 * Real JWT-based authentication verification for protected routes
 */
async function verifyAuth(request: NextRequest): Promise<{ user: any; role: string } | null> {
  try {
    // Get token from Authorization header or cookies
    const authHeader = request.headers.get('authorization');
    const cookieToken = request.cookies.get('auth-token')?.value || 
                       request.cookies.get('token')?.value;
    
    const token = authHeader?.startsWith('Bearer ') 
      ? authHeader.split(' ')[1] 
      : cookieToken;

    if (!token) {
      return null;
    }

    // Verify JWT token
    const payload = verifyToken<{ userId: string; email: string; role: string; sessionId?: string }>(token);
    
    if (!payload || !payload.userId) {
      return null;
    }

    // Verify session exists and is not expired
    if (payload.sessionId) {
      try {
        const session = await prisma.userSession.findUnique({
          where: { 
            id: payload.sessionId,
            token: token,
            expiresAt: { gt: new Date() }
          }
        });

        if (!session) {
          return null;
        }
      } catch (error) {
        console.warn('⚠️ Session verification failed:', error);
        // Continue without session verification if DB is unavailable
      }
    }

    // Get user information
    try {
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { 
          id: true, 
          email: true, 
          role: true, 
          isVerified: true,
          blocked: true 
        }
      });

      if (!user || !user.isVerified || user.blocked) {
        return null;
      }

      return {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          isVerified: user.isVerified
        },
        role: user.role
      };
    } catch (error) {
      console.warn('⚠️ User verification failed:', error);
      // Fallback to token payload if DB is unavailable
      return {
        user: {
          id: payload.userId,
          email: payload.email,
          role: payload.role,
        },
        role: payload.role
      };
    }

  } catch (error) {
    console.warn('⚠️ JWT verification failed:', error);
    return null;
  }
}

// Security patterns that should be blocked
const SUSPICIOUS_PATTERNS = [
  '../', '..\\', '/etc/passwd', 'wp-admin', '.php', '.asp', '.jsp',
  'union select', 'drop table', 'exec xp_', '<script', 'javascript:',
  'onload=', 'onerror=', 'eval(', 'alert(', 'document.cookie'
] as const;

// Bot patterns (excluding legitimate crawlers)
const SUSPICIOUS_BOT_PATTERNS = [
  'bot', 'crawler', 'spider', 'scraper'
] as const;

const LEGITIMATE_BOTS = [
  'googlebot', 'bingbot', 'slackbot', 'twitterbot', 'facebookexternalhit'
] as const;

export async function middleware(request: NextRequest) {
  const startTime = Date.now();
  const pathname = request.nextUrl.pathname;

  try {
    // 1. Apply distributed rate limiting first (with Redis fallback)
    const rateLimitResult = await instrumentedRateLimit(request);
    
    // If rate limit is exceeded, return the rate limit response
    if (rateLimitResult instanceof NextResponse) {
      return rateLimitResult;
    }

    // 2. Handle authentication for protected routes
    if (pathname.startsWith('/admin') || pathname.startsWith('/organizer') || pathname.startsWith('/dashboard')) {
      const authResult = await verifyAuth(request);
      
      if (!authResult) {
        // Redirect to login for unauthenticated users
        const loginUrl = new URL('/auth/login', request.url);
        loginUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(loginUrl);
      }

      // Check role-based access
      if (pathname.startsWith('/admin') && authResult.role !== 'ADMIN') {
        return NextResponse.json(
          { error: 'Access denied. Admin role required.' },
          { status: 403 }
        );
      }

      if (pathname.startsWith('/organizer') && 
          !['ADMIN', 'ORGANIZER', 'ORGANISATEUR'].includes(authResult.role)) {
        return NextResponse.json(
          { error: 'Access denied. Organizer role required.' },
          { status: 403 }
        );
      }

      // For dashboard routes, check specific role-based permissions
      if (pathname.startsWith('/dashboard/admin') && authResult.role !== 'ADMIN') {
        return NextResponse.json(
          { error: 'Access denied. Admin role required.' },
          { status: 403 }
        );
      }

      if (pathname.startsWith('/dashboard/organizer') && 
          !['ADMIN', 'ORGANIZER', 'ORGANISATEUR'].includes(authResult.role)) {
        return NextResponse.json(
          { error: 'Access denied. Organizer role required.' },
          { status: 403 }
        );
      }

      // Add user info to headers for downstream processing
      const response = NextResponse.next();
      response.headers.set('X-User-ID', authResult.user.id);
      response.headers.set('X-User-Email', authResult.user.email);
      response.headers.set('X-User-Role', authResult.role);
      
      // Continue with security headers
      return addSecurityHeaders(response, request, startTime, rateLimitResult);
    }

    // 3. For non-protected routes, continue with normal processing
    const response = NextResponse.next();
    return addSecurityHeaders(response, request, startTime, rateLimitResult);

  } catch (error) {
    // Log middleware errors
    console.error('❌ Middleware error:', error);
    
    // Return minimal security headers even on error
    const response = NextResponse.next();
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    return response;
  }
}

/**
 * Add comprehensive security headers to response
 */
function addSecurityHeaders(
  response: NextResponse, 
  request: NextRequest, 
  startTime: number, 
  rateLimitResult: any
): NextResponse {
  // 3. Add production security headers
  const securityHeaders: Record<string, string> = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
    'X-DNS-Prefetch-Control': 'off',
    'Server': 'MC-Billetterie/1.0'
  };

  // 4. Add HTTPS security headers for production
  if (process.env.NODE_ENV === 'production') {
    securityHeaders['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains; preload';
  }

  // 5. Enhanced Content Security Policy
  const cspHeader = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://checkout.stripe.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https://api.stripe.com wss: https://*.sentry.io",
    "frame-src https://js.stripe.com https://checkout.stripe.com https://hooks.stripe.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests"
  ].join('; ');
  
  securityHeaders['Content-Security-Policy'] = cspHeader;

  // 6. Apply all security headers
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  // 7. Add rate limit headers if available
  if (rateLimitResult instanceof Headers) {
    for (const [key, value] of rateLimitResult.entries()) {
      response.headers.set(key, value);
    }
  }

  // 8. Enhanced cache control for different routes
  const requestPathname = request.nextUrl.pathname;
  
  if (requestPathname.includes('/admin') || 
      requestPathname.includes('/auth') ||
      requestPathname.includes('/api/admin') ||
      requestPathname.includes('/api/auth')) {
    // No cache for sensitive routes
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
  } else if (requestPathname.includes('/api/')) {
    // Short cache for API routes
    response.headers.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=30');
  } else if (requestPathname.includes('/events') || requestPathname.includes('/tickets')) {
    // Moderate cache for content routes
    response.headers.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=60');
  }

  // 9. Security monitoring - log suspicious activities
  const userAgent = request.headers.get('user-agent') || '';
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
            request.headers.get('x-real-ip') || 
            'unknown';

  // Detect common attack patterns
  const hasSuspiciousPattern = SUSPICIOUS_PATTERNS.some(pattern => 
    requestPathname.toLowerCase().includes(pattern) || 
    request.url.toLowerCase().includes(pattern)
  );

  // Check for suspicious bots (excluding legitimate ones)
  const userAgentLower = userAgent.toLowerCase();
  const isSuspiciousBot = SUSPICIOUS_BOT_PATTERNS.some(pattern => 
    userAgentLower.includes(pattern)
  ) && !LEGITIMATE_BOTS.some(legitimateBot => 
    userAgentLower.includes(legitimateBot)
  );

  if (hasSuspiciousPattern || isSuspiciousBot) {
    console.warn('🚨 Suspicious request detected:', {
      ip,
      userAgent: userAgent.substring(0, 200), // Truncate long user agents
      path: requestPathname,
      method: request.method,
      timestamp: new Date().toISOString(),
      processing_time: Date.now() - startTime,
      reason: hasSuspiciousPattern ? 'suspicious_pattern' : 'suspicious_bot'
    });
    
    // For very suspicious patterns, we could even block the request
    if (hasSuspiciousPattern && 
        (requestPathname.includes('../') || requestPathname.includes('..\\') || 
         requestPathname.includes('/etc/') || requestPathname.includes('union select'))) {
      return new NextResponse('Forbidden', { status: 403 });
    }
  }

  // 10. Add performance header
  response.headers.set('X-Processing-Time', `${Date.now() - startTime}ms`);

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/health (health checks)
     * - api/metrics (monitoring)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api/health|api/metrics|_next/static|_next/image|favicon.ico).*)',
  ],
  // Force Node.js runtime instead of Edge Runtime for middleware
  runtime: 'nodejs',
};
