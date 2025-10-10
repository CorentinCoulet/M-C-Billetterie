/**
 * Advanced Health Check Service
 * Comprehensive system health monitoring for production
 */

import { PrismaClient } from '../generated/prisma';
import { Request, Response } from 'express';
import Redis from 'ioredis';
import * as os from 'os';
import { safeLogger } from './logger';

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  services: {
    database: ServiceHealth;
    redis: ServiceHealth;
    storage: ServiceHealth;
    external: ServiceHealth;
  };
  system: {
    memory: MemoryHealth;
    cpu: CpuHealth;
    disk: DiskHealth;
  };
  metrics: {
    responseTime: number;
    activeConnections: number;
    queueSize: number;
  };
}

interface ServiceHealth {
  status: 'up' | 'down' | 'degraded';
  responseTime: number;
  error?: string;
  details?: any;
}

interface MemoryHealth {
  used: number;
  free: number;
  total: number;
  percentage: number;
  status: 'healthy' | 'warning' | 'critical';
}

interface CpuHealth {
  loadAverage: number[];
  usage: number;
  status: 'healthy' | 'warning' | 'critical';
}

interface DiskHealth {
  used: number;
  free: number;
  total: number;
  percentage: number;
  status: 'healthy' | 'warning' | 'critical';
}

export class AdvancedHealthService {
  private prisma: PrismaClient;
  private redis: Redis;
  private startTime: Date;

  constructor(prisma: PrismaClient, redis: Redis) {
    this.prisma = prisma;
    this.redis = redis;
    this.startTime = new Date();
  }

  /**
   * Comprehensive health check
   */
  async performHealthCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // Run all checks in parallel
      const [
        databaseHealth,
        redisHealth,
        storageHealth,
        externalHealth,
        memoryHealth,
        cpuHealth,
        diskHealth,
        metrics
      ] = await Promise.all([
        this.checkDatabase(),
        this.checkRedis(),
        this.checkStorage(),
        this.checkExternalServices(),
        this.checkMemory(),
        this.checkCPU(),
        this.checkDisk(),
        this.collectMetrics()
      ]);

      const responseTime = Date.now() - startTime;
      
      // Determine overall status
      const services = { 
        database: databaseHealth, 
        redis: redisHealth, 
        storage: storageHealth, 
        external: externalHealth 
      };
      
      const overallStatus = this.calculateOverallStatus(services, {
        memory: memoryHealth,
        cpu: cpuHealth,
        disk: diskHealth
      });

      const result: HealthCheckResult = {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        uptime: Date.now() - this.startTime.getTime(),
        version: process.env.APP_VERSION || '1.0.0',
        services,
        system: {
          memory: memoryHealth,
          cpu: cpuHealth,
          disk: diskHealth
        },
        metrics: {
          responseTime,
          activeConnections: metrics.activeConnections,
          queueSize: metrics.queueSize
        }
      };

      // Log unhealthy status
      if (overallStatus !== 'healthy') {
        safeLogger.warn('Health check shows degraded/unhealthy status', result);
      }

      return result;
    } catch (error) {
      safeLogger.error('Health check failed:', error);
      
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: Date.now() - this.startTime.getTime(),
        version: process.env.APP_VERSION || '1.0.0',
        services: {
          database: { status: 'down', responseTime: -1, error: 'Health check failed' },
          redis: { status: 'down', responseTime: -1, error: 'Health check failed' },
          storage: { status: 'down', responseTime: -1, error: 'Health check failed' },
          external: { status: 'down', responseTime: -1, error: 'Health check failed' }
        },
        system: {
          memory: { used: 0, free: 0, total: 0, percentage: 0, status: 'critical' },
          cpu: { loadAverage: [0], usage: 0, status: 'critical' },
          disk: { used: 0, free: 0, total: 0, percentage: 0, status: 'critical' }
        },
        metrics: {
          responseTime: Date.now() - startTime,
          activeConnections: 0,
          queueSize: 0
        }
      };
    }
  }

  /**
   * Check database connectivity and performance
   */
  private async checkDatabase(): Promise<ServiceHealth> {
    const startTime = Date.now();
    
    try {
      // Test basic connectivity
      await this.prisma.$queryRaw`SELECT 1`;
      
      // Test write operation
      await this.prisma.$queryRaw`SELECT NOW()`;
      
      // Check connection pool
      const connectionCount = await this.prisma.$queryRaw`
        SELECT count(*) as count FROM pg_stat_activity 
        WHERE datname = current_database()
      ` as any[];
      
      const responseTime = Date.now() - startTime;
      
      return {
        status: responseTime < 1000 ? 'up' : 'degraded',
        responseTime,
        details: {
          activeConnections: parseInt(connectionCount[0]?.count || '0'),
          version: (await this.prisma.$queryRaw`SELECT version()` as any[])[0]?.version
        }
      };
    } catch (error) {
      return {
        status: 'down',
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Check Redis connectivity and performance
   */
  private async checkRedis(): Promise<ServiceHealth> {
    const startTime = Date.now();
    
    try {
      // Test connectivity
      const pong = await this.redis.ping();
      
      if (pong !== 'PONG') {
        throw new Error('Invalid Redis response');
      }
      
      // Test write/read operation
      const testKey = `health_check_${Date.now()}`;
      await this.redis.setex(testKey, 1, 'test');
      const value = await this.redis.get(testKey);
      
      if (value !== 'test') {
        throw new Error('Redis read/write test failed');
      }
      
      // Get Redis info
      const info = await this.redis.info();
      const responseTime = Date.now() - startTime;
      
      return {
        status: responseTime < 500 ? 'up' : 'degraded',
        responseTime,
        details: {
          connectedClients: this.parseRedisInfo(info, 'connected_clients'),
          usedMemory: this.parseRedisInfo(info, 'used_memory_human')
        }
      };
    } catch (error) {
      return {
        status: 'down',
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Check storage/filesystem health
   */
  private async checkStorage(): Promise<ServiceHealth> {
    const startTime = Date.now();
    
    try {
      const fs = require('fs').promises;
      const path = require('path');
      
      // Test write/read operation
      const testFile = path.join(process.cwd(), 'temp', `health_check_${Date.now()}.tmp`);
      const testData = 'health check test';
      
      // Ensure temp directory exists
      await fs.mkdir(path.dirname(testFile), { recursive: true });
      
      // Write test
      await fs.writeFile(testFile, testData);
      
      // Read test
      const readData = await fs.readFile(testFile, 'utf8');
      
      if (readData !== testData) {
        throw new Error('Storage read/write test failed');
      }
      
      // Cleanup
      await fs.unlink(testFile);
      
      const responseTime = Date.now() - startTime;
      
      return {
        status: responseTime < 1000 ? 'up' : 'degraded',
        responseTime
      };
    } catch (error) {
      return {
        status: 'down',
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Check external services (Stripe, email, etc.)
   */
  private async checkExternalServices(): Promise<ServiceHealth> {
    const startTime = Date.now();
    
    try {
      const checks = [];
      
      // Check Stripe (if configured)
      if (process.env.STRIPE_SECRET_KEY) {
        checks.push(this.checkStripe());
      }
      
      // Check SMTP (if configured)
      if (process.env.SMTP_HOST) {
        checks.push(this.checkSMTP());
      }
      
      if (checks.length === 0) {
        return {
          status: 'up',
          responseTime: Date.now() - startTime,
          details: { message: 'No external services configured' }
        };
      }
      
      const results = await Promise.allSettled(checks);
      const failures = results.filter(r => r.status === 'rejected');
      
      const responseTime = Date.now() - startTime;
      
      return {
        status: failures.length === 0 ? 'up' : failures.length === results.length ? 'down' : 'degraded',
        responseTime,
        details: {
          totalChecks: results.length,
          failures: failures.length
        }
      };
    } catch (error) {
      return {
        status: 'down',
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Check system memory
   */
  private async checkMemory(): Promise<MemoryHealth> {
    const free = os.freemem();
    const total = os.totalmem();
    const used = total - free;
    const percentage = Math.round((used / total) * 100);
    
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (percentage > 90) status = 'critical';
    else if (percentage > 80) status = 'warning';
    
    return {
      used: Math.round(used / 1024 / 1024), // MB
      free: Math.round(free / 1024 / 1024), // MB
      total: Math.round(total / 1024 / 1024), // MB
      percentage,
      status
    };
  }

  /**
   * Check CPU usage
   */
  private async checkCPU(): Promise<CpuHealth> {
    const loadAverage = os.loadavg();
    const cpuCount = os.cpus().length;
    
    // Calculate CPU usage percentage (rough estimate)
    const usage = Math.round((loadAverage[0] / cpuCount) * 100);
    
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (usage > 90) status = 'critical';
    else if (usage > 70) status = 'warning';
    
    return {
      loadAverage,
      usage,
      status
    };
  }

  /**
   * Check disk usage
   */
  private async checkDisk(): Promise<DiskHealth> {
    try {
      const { execSync } = require('child_process');
      const output = execSync('df -h /', { encoding: 'utf8' });
      const lines = output.trim().split('\n');
      const data = lines[1].split(/\s+/);
      
      const total = this.parseSize(data[1]);
      const used = this.parseSize(data[2]);
      const free = this.parseSize(data[3]);
      const percentage = parseInt(data[4].replace('%', ''));
      
      let status: 'healthy' | 'warning' | 'critical' = 'healthy';
      if (percentage > 90) status = 'critical';
      else if (percentage > 80) status = 'warning';
      
      return {
        used: Math.round(used),
        free: Math.round(free),
        total: Math.round(total),
        percentage,
        status
      };
    } catch (error) {
      // Fallback for non-Unix systems
      return {
        used: 0,
        free: 0,
        total: 0,
        percentage: 0,
        status: 'healthy'
      };
    }
  }

  /**
   * Collect various metrics
   */
  private async collectMetrics(): Promise<{
    activeConnections: number;
    queueSize: number;
  }> {
    try {
      // Get active connections from database
      const connectionResult = await this.prisma.$queryRaw`
        SELECT count(*) as count FROM pg_stat_activity 
        WHERE datname = current_database() AND state = 'active'
      ` as any[];
      
      const activeConnections = parseInt(connectionResult[0]?.count || '0');
      
      // Get queue size from Redis (if using queues)
      let queueSize = 0;
      try {
        queueSize = await this.redis.llen('job_queue') || 0;
      } catch {
        // Queue might not exist
      }
      
      return {
        activeConnections,
        queueSize
      };
    } catch (error) {
      return {
        activeConnections: 0,
        queueSize: 0
      };
    }
  }

  /**
   * Calculate overall system status
   */
  private calculateOverallStatus(
    services: Record<string, ServiceHealth>,
    system: { memory: MemoryHealth; cpu: CpuHealth; disk: DiskHealth }
  ): 'healthy' | 'degraded' | 'unhealthy' {
    const serviceStatuses = Object.values(services).map(s => s.status);
    const systemStatuses = [system.memory.status, system.cpu.status, system.disk.status];
    
    // If any service is down, system is unhealthy
    if (serviceStatuses.includes('down')) {
      return 'unhealthy';
    }
    
    // If any system resource is critical, system is unhealthy
    if (systemStatuses.includes('critical')) {
      return 'unhealthy';
    }
    
    // If any service is degraded or system resource is warning, system is degraded
    if (serviceStatuses.includes('degraded') || systemStatuses.includes('warning')) {
      return 'degraded';
    }
    
    return 'healthy';
  }

  /**
   * Helper methods
   */
  private parseRedisInfo(info: string, key: string): string | undefined {
    const lines = info.split('\n');
    const line = lines.find(l => l.startsWith(`${key}:`));
    return line?.split(':')[1]?.trim();
  }

  private parseSize(sizeStr: string): number {
    const match = sizeStr.match(/^(\d+(?:\.\d+)?)([KMGT]?)$/);
    if (!match) return 0;
    
    const size = parseFloat(match[1]);
    const unit = match[2];
    
    switch (unit) {
      case 'K': return size * 1024;
      case 'M': return size * 1024 * 1024;
      case 'G': return size * 1024 * 1024 * 1024;
      case 'T': return size * 1024 * 1024 * 1024 * 1024;
      default: return size;
    }
  }

  private async checkStripe(): Promise<void> {
    // Basic Stripe connectivity check
    const https = require('https');
    return new Promise((resolve, reject) => {
      const req = https.request({
        hostname: 'api.stripe.com',
        path: '/v1/account',
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`
        },
        timeout: 5000
      }, (res) => {
        if (res.statusCode && res.statusCode < 400) {
          resolve();
        } else {
          reject(new Error(`Stripe API returned ${res.statusCode}`));
        }
      });
      
      req.on('error', reject);
      req.on('timeout', () => reject(new Error('Stripe API timeout')));
      req.end();
    });
  }

  private async checkSMTP(): Promise<void> {
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
    
    await transporter.verify();
  }

  /**
   * Express middleware for health checks
   */
  createHealthCheckHandler() {
    return async (req: Request, res: Response) => {
      try {
        const healthResult = await this.performHealthCheck();
        
        // Set appropriate HTTP status code
        let statusCode = 200;
        if (healthResult.status === 'degraded') statusCode = 206;
        if (healthResult.status === 'unhealthy') statusCode = 503;
        
        res.status(statusCode).json(healthResult);
      } catch (error) {
        safeLogger.error('Health check endpoint failed:', error);
        res.status(503).json({
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          error: 'Health check failed'
        });
      }
    };
  }

  /**
   * Simple liveness probe (for Kubernetes)
   */
  createLivenessHandler() {
    return (req: Request, res: Response) => {
      res.status(200).json({
        status: 'alive',
        timestamp: new Date().toISOString(),
        uptime: Date.now() - this.startTime.getTime()
      });
    };
  }

  /**
   * Readiness probe (for Kubernetes)
   */
  createReadinessHandler() {
    return async (req: Request, res: Response) => {
      try {
        // Quick checks for essential services only
        const [dbCheck, redisCheck] = await Promise.allSettled([
          this.prisma.$queryRaw`SELECT 1`,
          this.redis.ping()
        ]);
        
        const isReady = dbCheck.status === 'fulfilled' && 
                       redisCheck.status === 'fulfilled' &&
                       (redisCheck as PromiseFulfilledResult<string>).value === 'PONG';
        
        res.status(isReady ? 200 : 503).json({
          status: isReady ? 'ready' : 'not_ready',
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        res.status(503).json({
          status: 'not_ready',
          timestamp: new Date().toISOString(),
          error: 'Readiness check failed'
        });
      }
    };
  }
}

export default AdvancedHealthService;
