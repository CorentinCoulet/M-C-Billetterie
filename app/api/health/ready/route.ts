import { NextRequest, NextResponse } from 'next/server';
import { getHealthStatus } from '../../../../src/lib/health';

/**
 * Kubernetes Readiness Probe
 * Checks if the application is ready to serve traffic
 */

export async function GET(request: NextRequest) {
  try {
    const health = await getHealthStatus();
    
    // Ready only if critical services are operational
    const criticalServices = {
      database: health.checks.database.status === 'up',
      memory: health.checks.memory.status !== 'down',
      disk: health.checks.disk.status !== 'down'
    };
    
    const ready = Object.values(criticalServices).every(Boolean);
    const status = ready ? 200 : 503;
    
    return NextResponse.json({
      status: ready ? 'ready' : 'not_ready',
      timestamp: health.timestamp,
      uptime: health.uptime,
      version: health.version,
      environment: health.environment,
      critical_services: criticalServices,
      ready,
      details: {
        database_response_time: health.checks.database.responseTime,
        memory_usage: health.checks.memory.details,
        disk_status: health.checks.disk.message
      }
    }, { status });
    
  } catch (error) {
    console.error('Readiness probe error:', error);
    
    return NextResponse.json(
      { 
        status: 'not_ready', 
        error: error instanceof Error ? error.message : 'Readiness check failed',
        timestamp: new Date().toISOString(),
        ready: false
      },
      { status: 503 }
    );
  }
}
