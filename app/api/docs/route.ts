/**
 * API Documentation Endpoint
 * 
 * Exposes the OpenAPI/Swagger specification in JSON format
 * Accessible via GET /api/docs
 */

import { specs } from '@/src/lib/swagger';
import { NextResponse } from 'next/server';

/**
 * GET /api/docs
 * 
 * Returns the complete OpenAPI specification in JSON format
 * Can be used with Swagger UI or other API clients
 */
export async function GET() {
  try {
    return NextResponse.json(specs, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    console.error('Error generating API documentation:', error);
    return NextResponse.json(
      { error: 'Failed to generate API documentation' },
      { status: 500 }
    );
  }
}
