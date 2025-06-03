import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// This function can be marked `async` if using `await` inside
export function middleware(request: NextRequest) {
  // Get the token from the cookies
  const token = request.cookies.get('token')?.value;

  // Define public paths that don't require authentication
  const publicPaths = [
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/logout',
    '/api/auth/request-reset',
    '/api/auth/reset-password',
  ];

  // Check if the requested path is a public path
  const isPublicPath = publicPaths.some(path => 
    request.nextUrl.pathname === path || 
    request.nextUrl.pathname.startsWith('/api/public/')
  );

  // If the path is public, allow access
  if (isPublicPath) {
    return NextResponse.next();
  }

  // If there's no token and the path is not public, redirect to login
  if (!token) {
    // If it's an API route, return 401 Unauthorized
    if (request.nextUrl.pathname.startsWith('/api/')) {
      return new NextResponse(
        JSON.stringify({ message: 'Authentication required' }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // For non-API routes, redirect to login
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If there's a token, allow access
  return NextResponse.next();
}

// Configure the middleware to run on specific paths
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};