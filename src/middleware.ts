import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// Simple auth verification function (to be improved with JWT)
async function verifyAuth(request: NextRequest) {
  // Basic auth simulation for now
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return null;
  
  // TODO: Implement real JWT verification
  return { role: 'ADMIN' }; // Temporary simulation
}

export async function middleware(request: NextRequest) {
  // Protect admin routes
  if (request.nextUrl.pathname.startsWith('/admin')) {
    const user = await verifyAuth(request);
    
    if (!user) {
      return NextResponse.redirect(new URL('/auth', request.url));
    }
    
    if (user.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  // Protect organizer routes
  if (request.nextUrl.pathname.startsWith('/organizer')) {
    const user = await verifyAuth(request);
    
    if (!user) {
      return NextResponse.redirect(new URL('/auth', request.url));
    }
    
    if (!['ADMIN', 'ORGANIZER'].includes(user.role)) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/organizer/:path*']
}
