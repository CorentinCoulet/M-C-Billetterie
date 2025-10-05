import { NextRequest, NextResponse } from 'next/server';

interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  version: string;
  services: {
    database: ServiceHealth;
    redis?: ServiceHealth;
    external?: ServiceHealth;
  };
  metrics: {
    memory: MemoryUsage;
    cpu: number;
    activeConnections: number;
  };
  features: {
    auth: boolean;
    events: boolean;
    orders: boolean;
    payments: boolean;
    security: boolean;
  };
  migrations: {
    expressRemoved: boolean;
    nextjsApiRoutes: boolean;
    middlewares: boolean;
  };
}

interface ServiceHealth {
  status: 'up' | 'down' | 'degraded';
  responseTime: number;
  error?: string;
}

interface MemoryUsage {
  used: number;
  total: number;
  percentage: number;
}

class HealthChecker {
  private startTime: number;

  constructor() {
    this.startTime = Date.now();
  }

  async checkDatabase(): Promise<ServiceHealth> {
    const start = Date.now();
    try {
      const { default: prisma } = await import('../../../src/lib/prisma');
      await prisma.$queryRaw`SELECT 1`;
      return {
        status: 'up',
        responseTime: Date.now() - start
      };
    } catch (error) {
      return {
        status: 'down',
        responseTime: Date.now() - start,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async checkRedis(): Promise<ServiceHealth> {
    const start = Date.now();
    try {
      // Only check Redis if URL is configured
      if (!process.env.REDIS_URL) {
        return {
          status: 'up',
          responseTime: 0
        };
      }
      
      const { Redis } = await import('ioredis');
      const redis = new Redis(process.env.REDIS_URL);
      await redis.ping();
      await redis.quit();
      
      return {
        status: 'up',
        responseTime: Date.now() - start
      };
    } catch (error) {
      return {
        status: 'down',
        responseTime: Date.now() - start,
        error: error instanceof Error ? error.message : 'Redis not available'
      };
    }
  }

  async checkExternalServices(): Promise<ServiceHealth> {
    const start = Date.now();
    try {
      // Basic check - could be extended to check Stripe, email service, etc.
      return {
        status: 'up',
        responseTime: Date.now() - start
      };
    } catch (error) {
      return {
        status: 'down',
        responseTime: Date.now() - start,
        error: error instanceof Error ? error.message : 'External services unavailable'
      };
    }
  }

  getMemoryUsage(): MemoryUsage {
    const memUsage = process.memoryUsage();
    const totalMem = memUsage.heapTotal;
    const usedMem = memUsage.heapUsed;
    
    return {
      used: usedMem,
      total: totalMem,
      percentage: Math.round((usedMem / totalMem) * 100)
    };
  }

  async getFullHealthStatus(): Promise<HealthCheckResult> {
    const database = await this.checkDatabase();
    const redis = process.env.REDIS_URL ? await this.checkRedis() : undefined;
    const external = await this.checkExternalServices();

    const memory = this.getMemoryUsage();
    const uptime = Date.now() - this.startTime;

    let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
    
    // Database is critical - if down, system is unhealthy
    if (database.status === 'down') {
      overallStatus = 'unhealthy';
    } 
    // Redis down or high memory usage means degraded
    else if ((redis && redis.status === 'down') || memory.percentage > 90) {
      overallStatus = 'degraded';
    }
    // External services down is degraded (not critical)
    else if (external.status === 'down') {
      overallStatus = 'degraded';
    }

    const services: any = { database };
    if (redis) services.redis = redis;
    if (external) services.external = external;

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime,
      version: process.env.npm_package_version || '1.0.0',
      services,
      metrics: {
        memory,
        cpu: process.cpuUsage().user / 1000000, // Convert to milliseconds
        activeConnections: 0 // This would need to be tracked separately
      },
      features: {
        auth: true,
        events: true,
        orders: true,
        payments: true,
        security: true,
      },
      migrations: {
        expressRemoved: true,
        nextjsApiRoutes: true,
        middlewares: true,
      },
    };
  }

  async getBasicHealthStatus() {
    try {
      const database = await this.checkDatabase();
      return {
        status: database.status === 'up' ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        architecture: 'Next.js API Routes',
        database: database.status,
        version: process.env.npm_package_version || '1.0.0',
        uptime: process.uptime(),
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Health check failed'
      };
    }
  }
}

const healthChecker = new HealthChecker();

// Liveness probe - simple check to verify the process is running
export async function GET(request: NextRequest) {
  try {
    const { pathname } = new URL(request.url);
    
    // Kubernetes liveness probe - just check if process is alive
    if (pathname.endsWith('/live')) {
      return NextResponse.json({ 
        status: 'alive', 
        timestamp: new Date().toISOString(),
        pid: process.pid,
        uptime: process.uptime()
      });
    }
    
    // Kubernetes readiness probe - check if ready to serve requests
    if (pathname.endsWith('/ready')) {
      const health = await healthChecker.getFullHealthStatus();
      const status = health.status === 'unhealthy' ? 503 : 200;
      return NextResponse.json(health, { status });
    }
    
    // Default health check - comprehensive status
    const health = await healthChecker.getFullHealthStatus();
    return NextResponse.json(health);
    
  } catch (error) {
    console.error('Health check error:', error);
    return NextResponse.json(
      { 
        status: 'unhealthy', 
        error: error instanceof Error ? error.message : 'Health check failed',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
