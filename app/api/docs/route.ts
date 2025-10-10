/**
 * API Documentation Endpoint
 * 
 * Exposes the OpenAPI/Swagger specification in JSON format
 * Accessible via GET /api/docs
 */

import { logger } from '@/lib/logger';
import { createMethodHandler } from '@/src/lib/next-api-helpers';
import { specs } from '@/src/lib/swagger';
import { NextResponse } from 'next/server';

/**
 * GET /api/docs
 * 
 * Returns the complete OpenAPI specification in JSON format
 * Can be used with Swagger UI or other API clients
 */
async function handleGet() {
  try {
    logger.info('Serving API documentation');
    
    return NextResponse.json(specs, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    logger.error({ error }, 'Error generating API documentation');
    return NextResponse.json(
      { error: 'Failed to generate API documentation' },
      { status: 500 }
    );
  }
}

export const GET = createMethodHandler({
  GET: handleGet,
});
