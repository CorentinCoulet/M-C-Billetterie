import { NextRequest, NextResponse } from 'next/server';
import { getHealthStatus } from '../../../../src/lib/health';

/**
 * Advanced Health Check Endpoints
 * Kubernetes-compatible liveness and readiness probes
 */

export async function GET(request: NextRequest) {
  try {
    const { pathname } = new URL(request.url);
    
    // Kubernetes liveness probe - simple check to verify the process is running
    // Returns 200 if the process is alive, regardless of dependencies
    if (pathname.endsWith('/live')) {
      return NextResponse.json({ 
        status: 'alive', 
        timestamp: new Date().toISOString(),
        pid: process.pid,
        uptime: Math.round(process.uptime()),
        memoryUsage: {
          heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          external: Math.round(process.memoryUsage().external / 1024 / 1024)
        },
        version: process.env.npm_package_version || process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0'
      }, { status: 200 });
    }
    
    // Kubernetes readiness probe - check if ready to serve requests
    // Returns 200 only if all critical dependencies are healthy
    if (pathname.endsWith('/ready')) {
      const health = await getHealthStatus();
      
      // Ready only if database is up and memory usage is acceptable
      const ready = health.checks.database.status === 'up' && 
                   health.checks.memory.status !== 'down';
      
      const status = ready ? 200 : 503;
      
      return NextResponse.json({
        status: ready ? 'ready' : 'not_ready',
        timestamp: health.timestamp,
        uptime: health.uptime,
        version: health.version,
        critical_services: {
          database: health.checks.database.status,
          memory: health.checks.memory.status
        },
        ready
      }, { status });
    }
    
    // Default comprehensive health check
    const health = await getHealthStatus();
    const httpStatus = health.status === 'unhealthy' ? 503 : 
                      health.status === 'degraded' ? 200 : 200;
    
    return NextResponse.json(health, { status: httpStatus });
    
  } catch (error) {
    console.error('Health check error:', error);
    
    return NextResponse.json(
      { 
        status: 'unhealthy', 
        error: error instanceof Error ? error.message : 'Health check failed',
        timestamp: new Date().toISOString(),
        pid: process.pid
      },
      { status: 500 }
    );
  }
}
