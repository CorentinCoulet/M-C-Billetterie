import { logger } from '@/lib/logger';
import { NextApiRequest, NextApiResponse } from 'next';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Adapter for using Pages Router controllers with App Router
 * This allows reusing existing controller logic with the new Route Handlers API
 */
export async function adaptController(
  request: NextRequest,
  controllerFn: (req: NextApiRequest, res: NextApiResponse) => Promise<void> | void,
  rateLimiter?: (request: NextRequest) => Promise<Headers | NextResponse>,
  method: string = 'GET'
) {
  // Apply rate limiting if provided
  let responseHeaders = new Headers();
  if (rateLimiter) {
    const rateLimitHeaders = await rateLimiter(request);
    
    // If rate limit is exceeded, return the error response
    if (rateLimitHeaders instanceof NextResponse) {
      return rateLimitHeaders;
    }
    
    responseHeaders = new Headers(rateLimitHeaders);
  }
  
  // Parse request body for non-GET methods
  let body = undefined;
  if (method !== 'GET' && request.body) {
    try {
      body = await request.json();
    } catch (error) {
      // If body parsing fails, continue with undefined body
      logger.error({ error }, 'Failed to parse request body');
    }
  }
  
  // Create a mock NextApiRequest
  const req = {
    body,
    cookies: Object.fromEntries(
      request.cookies.getAll().map(cookie => [cookie.name, cookie.value])
    ),
    headers: Object.fromEntries(request.headers),
    method,
    query: Object.fromEntries(new URL(request.url).searchParams),
  };
  
  // Create a response object to capture the controller's response
  let statusCode = 200;
  let responseData = {};
  
  const res = {
    status: (code: number) => {
      statusCode = code;
      return res;
    },
    json: (data: any) => {
      responseData = data;
      return res;
    },
    setHeader: (name: string, value: string) => {
      responseHeaders.set(name, value);
      return res;
    },
    getHeader: (name: string) => {
      return responseHeaders.get(name);
    },
    cookie: (name: string, value: string, options: any) => {
      // Convert cookie options to Set-Cookie header
      const cookieHeader = `${name}=${value}; ${Object.entries(options)
        .map(([key, value]) => {
          if (key === 'maxAge') {
            return `Max-Age=${value}`;
          }
          if (value === true) {
            return key;
          }
          return `${key}=${value}`;
        })
        .join('; ')}`;
      
      responseHeaders.append('Set-Cookie', cookieHeader);
      return res;
    },
  };
  
  // Call the controller
  await controllerFn(req as any, res as any);
  
  // Return the response
  return NextResponse.json(responseData, {
    status: statusCode,
    headers: responseHeaders,
  });
}