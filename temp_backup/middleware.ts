import createIntlMiddleware from 'next-intl/middleware';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const intlMiddleware = createIntlMiddleware({
  locales: ['fr', 'en'],
  defaultLocale: 'fr',
});

export function middleware(request: NextRequest) {
  const intlResponse = intlMiddleware(request);
  if (intlResponse) return intlResponse;

  const token = request.cookies.get('token')?.value;

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

  const isPublicPath =
    publicPaths.some(path =>
      request.nextUrl.pathname === path ||
      request.nextUrl.pathname.startsWith('/api/public/')
    );

  if (isPublicPath) {
    return NextResponse.next();
  }

  if (!token) {
    if (request.nextUrl.pathname.startsWith('/api/')) {
      return new NextResponse(
        JSON.stringify({ message: 'Authentication required' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};