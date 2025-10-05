import { NextFunction, Request, Response } from 'express';
import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';
import Redis from 'ioredis';
import AuditService from './audit-service';
import prisma from './prisma';
import { REQUEST_LIMITS } from './security-config';

// Redis client for distributed rate limiting
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Custom Redis Store implementation
class CustomRedisStore {
  constructor(private redis: Redis) {}

  async incr(key: string): Promise<{ totalHits: number; resetTime?: Date }> {
    const multi = this.redis.multi();
    multi.incr(key);
    multi.pexpire(key, 60000); // 1 minute default
    const results = await multi.exec();
    
    if (!results || !results[0] || results[0][1] === null) {
      throw new Error('Redis incr failed');
    }
    
    return { totalHits: results[0][1] as number };
  }

  async decrement(key: string): Promise<void> {
    await this.redis.decr(key);
  }

  async resetKey(key: string): Promise<void> {
    await this.redis.del(key);
  }
}

export interface RateLimitConfig {
  windowMs: number;
  max: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: Request) => string;
  handler?: (req: Request, res: Response) => void;
}

export interface IPSecurityConfig {
  whitelist?: string[];
  blacklist?: string[];
  maxRequestsPerHour?: number;
  suspiciousActivityThreshold?: number;
  autoBlockDuration?: number;
}

export class AdvancedRateLimitService {
  /**
   * General rate limiter
   */
  static createGeneralRateLimit(): RateLimitRequestHandler {
    return rateLimit({
      store: new CustomRedisStore(redis) as any,
      windowMs: REQUEST_LIMITS.GENERAL.windowMs,
      max: REQUEST_LIMITS.GENERAL.max,
      message: {
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: Math.ceil(REQUEST_LIMITS.GENERAL.windowMs / 1000)
      },
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req: Request) => {
        return this.getClientIP(req);
      },
      handler: async (req: Request, res: Response) => {
        await AuditService.logSecurityEvent(
          'brute_force',
          this.getClientIP(req),
          req.headers['user-agent'] as string,
          { endpoint: req.url, rateLimitType: 'general' }
        );
        
        res.status(429).json({
          error: 'Rate limit exceeded',
          retryAfter: Math.ceil(REQUEST_LIMITS.GENERAL.windowMs / 1000)
        });
      }
    });
  }

  /**
   * Authentication specific rate limiter (stricter)
   */
  static createAuthRateLimit(): RateLimitRequestHandler {
    return rateLimit({
      store: new CustomRedisStore(redis) as any,
      windowMs: REQUEST_LIMITS.AUTH.windowMs,
      max: REQUEST_LIMITS.AUTH.max,
      message: {
        error: 'Too many authentication attempts, please try again later.',
        retryAfter: Math.ceil(REQUEST_LIMITS.AUTH.windowMs / 1000)
      },
      skipSuccessfulRequests: true, // Don't count successful logins
      keyGenerator: (req: Request) => {
        const ip = this.getClientIP(req);
        const email = req.body?.email || 'unknown';
        return `auth:${ip}:${email}`;
      },
      handler: async (req: Request, res: Response) => {
        const ip = this.getClientIP(req);
        const email = req.body?.email;
        
        // Auto-block IP after multiple auth failures
        await this.handleSuspiciousIP(ip, 'auth_brute_force');
        
        await AuditService.logSecurityEvent(
          'brute_force',
          ip,
          req.headers['user-agent'] as string,
          { endpoint: req.url, email, rateLimitType: 'auth' }
        );
        
        res.status(429).json({
          error: 'Too many authentication attempts',
          retryAfter: Math.ceil(REQUEST_LIMITS.AUTH.windowMs / 1000)
        });
      }
    });
  }

  /**
   * Payment specific rate limiter
   */
  static createPaymentRateLimit(): RateLimitRequestHandler {
    return rateLimit({
      store: new CustomRedisStore(redis) as any,
      windowMs: REQUEST_LIMITS.PAYMENT.windowMs,
      max: REQUEST_LIMITS.PAYMENT.max,
      keyGenerator: (req: Request) => {
        const ip = this.getClientIP(req);
        const userId = req.body?.userId || req.headers['x-user-id'];
        return `payment:${ip}:${userId}`;
      },
      handler: async (req: Request, res: Response) => {
        await AuditService.logSecurityEvent(
          'suspicious_activity',
          this.getClientIP(req),
          req.headers['user-agent'] as string,
          { endpoint: req.url, rateLimitType: 'payment', reason: 'too_many_payment_requests' }
        );
        
        res.status(429).json({
          error: 'Too many payment requests, please try again later.',
          retryAfter: Math.ceil(REQUEST_LIMITS.PAYMENT.windowMs / 1000)
        });
      }
    });
  }

  /**
   * Password reset rate limiter
   */
  static createPasswordResetRateLimit(): RateLimitRequestHandler {
    return rateLimit({
      store: new CustomRedisStore(redis) as any,
      windowMs: REQUEST_LIMITS.PASSWORD_RESET.windowMs,
      max: REQUEST_LIMITS.PASSWORD_RESET.max,
      keyGenerator: (req: Request) => {
        const ip = this.getClientIP(req);
        const email = req.body?.email || 'unknown';
        return `reset:${ip}:${email}`;
      },
      handler: async (req: Request, res: Response) => {
        await AuditService.logSecurityEvent(
          'suspicious_activity',
          this.getClientIP(req),
          req.headers['user-agent'] as string,
          { endpoint: req.url, rateLimitType: 'password_reset' }
        );
        
        res.status(429).json({
          error: 'Too many password reset requests, please try again later.',
          retryAfter: Math.ceil(REQUEST_LIMITS.PASSWORD_RESET.windowMs / 1000)
        });
      }
    });
  }

  /**
   * IP-based security middleware
   */
  static ipSecurityMiddleware(config: IPSecurityConfig = {}) {
    return async (req: Request, res: Response, next: NextFunction) => {
      const clientIP = this.getClientIP(req);

      // Check if IP is blocked
      const isBlocked = await this.isIPBlocked(clientIP);
      if (isBlocked) {
        await AuditService.logSecurityEvent(
          'ip_blocked',
          clientIP,
          req.headers['user-agent'] as string,
          { endpoint: req.url, reason: 'blocked_ip_access_attempt' }
        );
        
        return res.status(403).json({ error: 'Access denied from this IP address' });
      }

      // Check whitelist (if configured)
      if (config.whitelist && config.whitelist.length > 0) {
        if (!config.whitelist.includes(clientIP)) {
          return res.status(403).json({ error: 'IP not in whitelist' });
        }
      }

      // Check blacklist
      if (config.blacklist && config.blacklist.includes(clientIP)) {
        await this.blockIP(clientIP, 'manual_blacklist', 24 * 60); // 24 hours
        return res.status(403).json({ error: 'IP is blacklisted' });
      }

      // Track request for suspicious activity detection
      await this.trackIPActivity(clientIP, req.url || '');

      // Check for suspicious patterns
      if (await this.detectSuspiciousActivity(clientIP, req)) {
        await this.handleSuspiciousIP(clientIP, 'suspicious_pattern');
        return res.status(400).json({ error: 'Suspicious activity detected' });
      }

      next();
    };
  }

  /**
   * Get client IP address
   */
  static getClientIP(req: Request): string {
    return (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      (req.headers['x-real-ip'] as string) ||
      req.socket.remoteAddress ||
      'unknown'
    );
  }

  /**
   * Check if IP is currently blocked
   */
  static async isIPBlocked(ip: string): Promise<boolean> {
    try {
      const blocked = await redis.get(`blocked_ip:${ip}`);
      return blocked !== null;
    } catch (error) {
      console.error('Error checking blocked IP:', error);
      return false;
    }
  }

  /**
   * Block an IP address
   */
  static async blockIP(ip: string, reason: string, durationMinutes: number = 60): Promise<void> {
    try {
      const key = `blocked_ip:${ip}`;
      const blockInfo = {
        reason,
        blockedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + durationMinutes * 60 * 1000).toISOString()
      };

      await redis.setex(key, durationMinutes * 60, JSON.stringify(blockInfo));

      // Log the block action
      await AuditService.logSecurityEvent(
        'ip_blocked',
        ip,
        undefined,
        { reason, duration: durationMinutes, action: 'block_applied' }
      );

      // Store in database for longer-term tracking
      await prisma.blockedIP.upsert({
        where: { ipAddress: ip },
        update: {
          reason,
          blockedAt: new Date(),
          expiresAt: new Date(Date.now() + durationMinutes * 60 * 1000),
          blockCount: { increment: 1 }
        },
        create: {
          ipAddress: ip,
          reason,
          blockedAt: new Date(),
          expiresAt: new Date(Date.now() + durationMinutes * 60 * 1000),
          blockCount: 1
        }
      });
    } catch (error) {
      console.error('Error blocking IP:', error);
    }
  }

  /**
   * Track IP activity for pattern analysis
   */
  static async trackIPActivity(ip: string, endpoint: string): Promise<void> {
    try {
      const key = `ip_activity:${ip}`;
      const activityKey = `${Date.now()}:${endpoint}`;
      
      // Store recent activity with 1 hour expiration
      await redis.zadd(key, Date.now(), activityKey);
      await redis.expire(key, 3600); // 1 hour
    } catch (error) {
      console.error('Error tracking IP activity:', error);
    }
  }

  /**
   * Detect suspicious activity patterns
   */
  static async detectSuspiciousActivity(ip: string, req: Request): Promise<boolean> {
    try {
      const oneHourAgo = Date.now() - 60 * 60 * 1000;
      const key = `ip_activity:${ip}`;
      
      // Count requests in last hour
      const recentRequests = await redis.zcount(key, oneHourAgo, Date.now());
      
      // Too many requests from single IP
      if (recentRequests > 500) {
        return true;
      }

      // Check for suspicious request patterns
      const requestBody = JSON.stringify(req.body || {});
      const requestQuery = JSON.stringify(req.query || {});
      const suspiciousPatterns = [
        /script/i, /javascript/i, /eval/i, /alert/i,
        /union.*select/i, /drop.*table/i, /delete.*from/i,
        /<.*>/i, /on.*error/i, /onerror/i
      ];

      const content = `${requestBody} ${requestQuery} ${req.url}`;
      const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(content));
      
      if (isSuspicious) {
        return true;
      }

      // Check for rapid sequential requests to different endpoints
      const activities = await redis.zrange(key, oneHourAgo, Date.now(), 'BYSCORE');
      const uniqueEndpoints = new Set(activities.map((activity: string) => activity.split(':')[1]));
      
      if (uniqueEndpoints.size > 50 && recentRequests > 100) {
        return true; // Possible scanning/crawling
      }

      return false;
    } catch (error) {
      console.error('Error detecting suspicious activity:', error);
      return false;
    }
  }

  /**
   * Handle suspicious IP - progressive penalties
   */
  static async handleSuspiciousIP(ip: string, reason: string): Promise<void> {
    try {
      // Get previous incidents
      const incidents = await redis.get(`incidents:${ip}`);
      const incidentCount = incidents ? parseInt(incidents) : 0;
      
      // Increment incident counter
      await redis.setex(`incidents:${ip}`, 24 * 60 * 60, (incidentCount + 1).toString());
      
      // Progressive blocking durations
      let blockDuration = 15; // Start with 15 minutes
      
      if (incidentCount >= 1) blockDuration = 60; // 1 hour
      if (incidentCount >= 3) blockDuration = 4 * 60; // 4 hours  
      if (incidentCount >= 5) blockDuration = 24 * 60; // 24 hours
      if (incidentCount >= 10) blockDuration = 7 * 24 * 60; // 7 days
      
      await this.blockIP(ip, `${reason}_repeated_${incidentCount + 1}x`, blockDuration);
      
      // Alert on repeated offenders
      if (incidentCount >= 3) {
        await AuditService.logSecurityEvent(
          'suspicious_activity',
          ip,
          undefined,
          { 
            reason, 
            incidentCount: incidentCount + 1, 
            blockDuration,
            severity: 'repeat_offender'
          }
        );
      }
    } catch (error) {
      console.error('Error handling suspicious IP:', error);
    }
  }

  /**
   * Unblock IP address (for admin use)
   */
  static async unblockIP(ip: string, adminUserId: string): Promise<void> {
    try {
      await redis.del(`blocked_ip:${ip}`);
      await redis.del(`incidents:${ip}`);
      
      await prisma.blockedIP.update({
        where: { ipAddress: ip },
        data: {
          expiresAt: new Date(), // Set expiry to now
          unblockedBy: adminUserId,
          unblockedAt: new Date()
        }
      });

      await AuditService.logAdminAction(
        'ip_unblocked',
        ip,
        adminUserId,
        'admin_action',
        { action: 'manual_unblock' }
      );
    } catch (error) {
      console.error('Error unblocking IP:', error);
    }
  }

  /**
   * Get blocked IPs list for admin
   */
  static async getBlockedIPs(limit: number = 100): Promise<any[]> {
    try {
      return await prisma.blockedIP.findMany({
        where: {
          expiresAt: { gt: new Date() }
        },
        orderBy: { blockedAt: 'desc' },
        take: limit
      });
    } catch (error) {
      console.error('Error getting blocked IPs:', error);
      return [];
    }
  }
}

export default AdvancedRateLimitService;
