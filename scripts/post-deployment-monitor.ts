#!/usr/bin/env node

/**
 * Post-Deployment Monitoring Script
 * Monitors application health and performance after production deployment
 */

import http from 'http';
import https from 'https';

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  bright: '\x1b[1m'
};

const log = {
  info: (msg: string) => console.log(`${colors.cyan}ℹ ${msg}${colors.reset}`),
  success: (msg: string) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  warning: (msg: string) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  error: (msg: string) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  section: (msg: string) => console.log(`\n${colors.bright}${colors.magenta}🔍 ${msg}${colors.reset}`)
};

interface MonitoringConfig {
  baseUrl: string;
  checkInterval: number;
  maxRetries: number;
  timeout: number;
  alertThresholds: {
    responseTime: number;
    errorRate: number;
    memoryUsage: number;
  };
}

interface HealthCheckResult {
  endpoint: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  responseTime: number;
  statusCode: number;
  error?: string;
  details?: any;
}

interface MonitoringStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  uptime: number;
  startTime: number;
}

class PostDeploymentMonitor {
  private config: MonitoringConfig;
  private stats: MonitoringStats;
  private isRunning: boolean = false;
  private intervalId?: NodeJS.Timeout;
  private alerts: string[] = [];

  constructor(config: MonitoringConfig) {
    this.config = config;
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      uptime: 0,
      startTime: Date.now()
    };
  }

  private async makeRequest(url: string, timeout: number = 10000): Promise<HealthCheckResult> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const urlObj = new URL(url);
      const isHttps = urlObj.protocol === 'https:';
      const client = isHttps ? https : http;

      const req = client.get(url, {
        timeout,
        headers: {
          'User-Agent': 'PostDeploymentMonitor/1.0',
          'Accept': 'application/json',
        }
      }, (res) => {
        const responseTime = Date.now() - startTime;
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          let details;
          try {
            details = JSON.parse(data);
          } catch {
            details = data;
          }

          resolve({
            endpoint: url,
            status: res.statusCode === 200 ? 'healthy' : 'unhealthy',
            responseTime,
            statusCode: res.statusCode || 0,
            details
          });
        });
      });

      req.on('error', (error) => {
        const responseTime = Date.now() - startTime;
        resolve({
          endpoint: url,
          status: 'unhealthy',
          responseTime,
          statusCode: 0,
          error: error.message
        });
      });

      req.on('timeout', () => {
        req.destroy();
        const responseTime = Date.now() - startTime;
        resolve({
          endpoint: url,
          status: 'unhealthy',
          responseTime,
          statusCode: 0,
          error: 'Request timeout'
        });
      });
    });
  }

  private async checkEndpoint(endpoint: string): Promise<HealthCheckResult> {
    const fullUrl = `${this.config.baseUrl}${endpoint}`;
    return await this.makeRequest(fullUrl, this.config.timeout);
  }

  private async runHealthChecks(): Promise<HealthCheckResult[]> {
    const endpoints = [
      '/api/health/live',
      '/api/health/ready',
      '/api/metrics',
      '/api/auth/status',
      '/api/events?limit=1',
      '/api/tickets/count'
    ];

    log.section('Health Check Results');

    const results = await Promise.all(
      endpoints.map(endpoint => this.checkEndpoint(endpoint))
    );

    results.forEach(result => {
      this.stats.totalRequests++;

      if (result.status === 'healthy') {
        this.stats.successfulRequests++;
        log.success(`${result.endpoint} - ${result.responseTime}ms`);
      } else {
        this.stats.failedRequests++;
        log.error(`${result.endpoint} - ${result.error || `HTTP ${result.statusCode}`}`);
      }

      // Check response time threshold
      if (result.responseTime > this.config.alertThresholds.responseTime) {
        const alert = `High response time: ${result.endpoint} took ${result.responseTime}ms`;
        if (!this.alerts.includes(alert)) {
          this.alerts.push(alert);
          log.warning(alert);
        }
      }
    });

    // Update average response time
    this.stats.averageResponseTime = results.reduce((sum, result) => sum + result.responseTime, 0) / results.length;

    return results;
  }

  private async checkApplicationMetrics(): Promise<void> {
    log.section('Application Metrics');

    try {
      const metricsResult = await this.checkEndpoint('/api/metrics');
      
      if (metricsResult.status === 'healthy' && typeof metricsResult.details === 'string') {
        const metrics = metricsResult.details;
        
        // Parse memory usage
        const memoryMatch = metrics.match(/nodejs_heap_used_bytes\s+(\d+)/);
        if (memoryMatch) {
          const memoryUsage = parseInt(memoryMatch[1]) / (1024 * 1024); // Convert to MB
          log.info(`Memory usage: ${memoryUsage.toFixed(2)} MB`);
          
          if (memoryUsage > this.config.alertThresholds.memoryUsage) {
            const alert = `High memory usage: ${memoryUsage.toFixed(2)} MB`;
            if (!this.alerts.includes(alert)) {
              this.alerts.push(alert);
              log.warning(alert);
            }
          }
        }

        // Parse request metrics
        const requestsMatch = metrics.match(/http_requests_total\{[^}]*\}\s+(\d+)/g);
        let totalRequests = 0;
        if (requestsMatch) {
          totalRequests = requestsMatch.reduce((sum, match) => {
            const value = parseInt(match.match(/\s+(\d+)$/)?.[1] || '0');
            return sum + value;
          }, 0);
          log.info(`Total HTTP requests: ${totalRequests}`);
        }

        // Parse error metrics
        const errorMatch = metrics.match(/http_requests_total\{.*status="[45]\d\d".*\}\s+(\d+)/g);
        if (errorMatch) {
          const totalErrors = errorMatch.reduce((sum, match) => {
            const value = parseInt(match.match(/\s+(\d+)$/)?.[1] || '0');
            return sum + value;
          }, 0);
          
          const errorRate = totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0;
          log.info(`Error rate: ${errorRate.toFixed(2)}%`);
          
          if (errorRate > this.config.alertThresholds.errorRate) {
            const alert = `High error rate: ${errorRate.toFixed(2)}%`;
            if (!this.alerts.includes(alert)) {
              this.alerts.push(alert);
              log.warning(alert);
            }
          }
        }

        // Parse database connections
        const dbMatch = metrics.match(/postgres_connections_active\s+(\d+)/);
        if (dbMatch) {
          const activeConnections = parseInt(dbMatch[1]);
          log.info(`Active database connections: ${activeConnections}`);
        }

        // Parse Redis connections
        const redisMatch = metrics.match(/redis_connections_active\s+(\d+)/);
        if (redisMatch) {
          const redisConnections = parseInt(redisMatch[1]);
          log.info(`Redis connections: ${redisConnections}`);
        }

      }
    } catch (error) {
      log.error(`Failed to retrieve metrics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async checkBusinessMetrics(): Promise<void> {
    log.section('Business Metrics');

    try {
      // Check events endpoint
      const eventsResult = await this.checkEndpoint('/api/events?limit=1');
      if (eventsResult.status === 'healthy') {
        log.success('Events API responding');
      }

      // Check tickets endpoint
      const ticketsResult = await this.checkEndpoint('/api/tickets/count');
      if (ticketsResult.status === 'healthy') {
        log.success('Tickets API responding');
        if (typeof ticketsResult.details === 'object' && ticketsResult.details.count !== undefined) {
          log.info(`Total tickets: ${ticketsResult.details.count}`);
        }
      }

      // Check authentication
      const authResult = await this.checkEndpoint('/api/auth/status');
      if (authResult.status === 'healthy') {
        log.success('Authentication service responding');
      }

    } catch (error) {
      log.error(`Failed to retrieve business metrics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private printSummary(): void {
    console.log(`\n${colors.bright}📊 Monitoring Summary${colors.reset}`);
    
    const currentTime = Date.now();
    const uptimeMinutes = Math.floor((currentTime - this.stats.startTime) / 60000);
    const successRate = this.stats.totalRequests > 0 
      ? (this.stats.successfulRequests / this.stats.totalRequests) * 100 
      : 0;

    console.log(`⏱️  Uptime: ${uptimeMinutes} minutes`);
    console.log(`📈 Success rate: ${successRate.toFixed(2)}%`);
    console.log(`⚡ Average response time: ${this.stats.averageResponseTime.toFixed(2)}ms`);
    console.log(`🔢 Total requests: ${this.stats.totalRequests}`);
    console.log(`✅ Successful: ${this.stats.successfulRequests}`);
    console.log(`❌ Failed: ${this.stats.failedRequests}`);

    if (this.alerts.length > 0) {
      console.log(`\n${colors.bright}${colors.yellow}⚠️  Active Alerts:${colors.reset}`);
      this.alerts.forEach(alert => {
        console.log(`  • ${alert}`);
      });
    } else {
      console.log(`\n${colors.bright}${colors.green}✅ No active alerts${colors.reset}`);
    }
  }

  async runSingleCheck(): Promise<void> {
    console.log(`${colors.bright}${colors.cyan}🔍 Post-Deployment Health Check${colors.reset}`);
    console.log(`Target: ${this.config.baseUrl}\n`);

    await this.runHealthChecks();
    await this.checkApplicationMetrics();
    await this.checkBusinessMetrics();
    this.printSummary();
  }

  async startMonitoring(): Promise<void> {
    if (this.isRunning) {
      log.warning('Monitoring is already running');
      return;
    }

    this.isRunning = true;
    log.info(`🚀 Starting continuous monitoring (interval: ${this.config.checkInterval}ms)`);
    log.info(`Target: ${this.config.baseUrl}`);

    // Run initial check
    await this.runSingleCheck();

    // Start interval monitoring
    this.intervalId = setInterval(async () => {
      console.log(`\n${colors.cyan}🔄 Running scheduled health check...${colors.reset}`);
      await this.runHealthChecks();
      await this.checkApplicationMetrics();
      this.printSummary();
    }, this.config.checkInterval);

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      this.stopMonitoring();
    });

    process.on('SIGTERM', () => {
      this.stopMonitoring();
    });
  }

  stopMonitoring(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    log.info('📊 Final monitoring summary:');
    this.printSummary();
    log.info('👋 Monitoring stopped');
    process.exit(0);
  }
}

// Configuration from environment variables or defaults
const config: MonitoringConfig = {
  baseUrl: process.env.MONITOR_BASE_URL || 'https://api.tickets.company.com',
  checkInterval: parseInt(process.env.MONITOR_INTERVAL || '30000'), // 30 seconds
  maxRetries: parseInt(process.env.MONITOR_MAX_RETRIES || '3'),
  timeout: parseInt(process.env.MONITOR_TIMEOUT || '10000'), // 10 seconds
  alertThresholds: {
    responseTime: parseInt(process.env.ALERT_RESPONSE_TIME || '2000'), // 2 seconds
    errorRate: parseFloat(process.env.ALERT_ERROR_RATE || '5'), // 5%
    memoryUsage: parseInt(process.env.ALERT_MEMORY_MB || '512') // 512 MB
  }
};

async function main() {
  const args = process.argv.slice(2);
  const mode = args[0] || 'single';

  // Override base URL if provided
  if (args[1]) {
    config.baseUrl = args[1];
  }

  const monitor = new PostDeploymentMonitor(config);

  switch (mode) {
    case 'single':
      await monitor.runSingleCheck();
      break;
    case 'continuous':
      await monitor.startMonitoring();
      break;
    default:
      console.log(`${colors.yellow}Usage: node post-deployment-monitor.js [single|continuous] [base-url]${colors.reset}`);
      console.log(`${colors.cyan}Examples:${colors.reset}`);
      console.log(`  node post-deployment-monitor.js single`);
      console.log(`  node post-deployment-monitor.js continuous`);
      console.log(`  node post-deployment-monitor.js single http://localhost:3000`);
      console.log(`  node post-deployment-monitor.js continuous https://api.staging.company.com`);
      process.exit(1);
  }
}

main().catch((error) => {
  log.error(`Monitor failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  process.exit(1);
});
