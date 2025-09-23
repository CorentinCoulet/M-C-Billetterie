import crypto from 'crypto';
import { NextFunction, Request, Response } from 'express';
import { logger } from './logger';
import prisma from './prisma';

/**
 * Unified Security Service
 * Combines bot detection, fraud detection, and intrusion detection
 */

// Types
interface SecurityThreat {
  type: 'bot' | 'fraud' | 'intrusion' | 'abuse';
  level: 'low' | 'medium' | 'high' | 'critical';
  score: number;
  reasons: string[];
  shouldBlock: boolean;
  shouldAlert: boolean;
}

interface RequestAnalysis {
  ip: string;
  userAgent: string;
  fingerprint: string;
  patterns: BehavioralPattern;
  threats: SecurityThreat[];
  blocked: boolean;
}

interface BehavioralPattern {
  requestsPerMinute: number;
  uniqueEndpoints: Set<string>;
  statusCodes: Map<number, number>;
  averageResponseTime: number;
  suspiciousActions: string[];
}

interface FraudScore {
  score: number; // 0-100, higher = more suspicious
  risk: 'low' | 'medium' | 'high' | 'critical';
  reasons: string[];
  blocked: boolean;
}

class UnifiedSecurityService {
  private suspiciousIPs = new Map<string, {
    score: number;
    lastSeen: number;
    patterns: BehavioralPattern;
    violations: string[];
    blockedUntil?: number;
  }>();

  private readonly botSignatures: RegExp[] = [
    /bot|crawler|spider|scraper/i,
    /curl|wget|httpie/i,
    /postman|insomnia/i,
    /python|nodejs|java|go-http/i,
  ];

  private readonly attackPatterns = [
    // SQL Injection patterns
    { name: 'SQL_INJECTION', pattern: /(union|select|insert|delete|update|drop|create|alter)\s+/i, level: 'high' as const },
    { name: 'XSS_SCRIPT', pattern: /<script[^>]*>.*?<\/script>/i, level: 'high' as const },
    { name: 'PATH_TRAVERSAL', pattern: /\.\.\/|\.\.\\|\.\.\%2f|\.\.\%5c/i, level: 'medium' as const },
    { name: 'COMMAND_INJECTION', pattern: /[;&|`]|\$\(|\${/i, level: 'high' as const },
    { name: 'PHP_INJECTION', pattern: /<\?php|php:\/\//i, level: 'high' as const },
  ];

  private readonly suspiciousEmailDomains = [
    '10minutemail.com', 'guerrillamail.com', 'mailinator.com',
    'throwaway.email', 'temp-mail.org', 'yopmail.com'
  ];

  private readonly highRiskCountries = [
    'NG', 'GH', 'ID', 'PK', 'BD', 'VN', 'PH', 'EG'
  ];

  constructor() {
    this.startCleanupTasks();
  }

  /**
   * Analyze incoming request for security threats
   */
  async analyzeRequest(req: Request): Promise<RequestAnalysis> {
    const ip = this.getClientIP(req);
    const userAgent = req.get('User-Agent') || '';
    const fingerprint = this.generateFingerprint(req);
    
    const threats: SecurityThreat[] = [];
    
    // Bot detection
    const botThreat = this.detectBot(req, userAgent);
    if (botThreat) threats.push(botThreat);
    
    // Intrusion detection
    const intrusionThreat = this.detectIntrusion(req);
    if (intrusionThreat) threats.push(intrusionThreat);
    
    // Behavioral analysis
    const patterns = this.analyzeBehavior(ip, req);
    const behaviorThreat = this.detectSuspiciousBehavior(patterns);
    if (behaviorThreat) threats.push(behaviorThreat);
    
    // Update IP tracking
    this.updateIPTracking(ip, patterns, threats);
    
    // Determine if request should be blocked
    const blocked = threats.some(t => t.shouldBlock) || this.isIPBlocked(ip);
    
    return {
      ip,
      userAgent,
      fingerprint,
      patterns,
      threats,
      blocked
    };
  }

  /**
   * Analyze user for fraud patterns
   */
  async analyzeFraudRisk(userId: string, context: {
    email?: string;
    ip?: string;
    amount?: number;
    country?: string;
  }): Promise<FraudScore> {
    let score = 0;
    const reasons: string[] = [];

    // Email analysis
    if (context.email) {
      const emailDomain = context.email.split('@')[1];
      if (this.suspiciousEmailDomains.includes(emailDomain)) {
        score += 30;
        reasons.push('Suspicious email domain');
      }
      
      if (context.email.includes('+') || context.email.includes('.')) {
        score += 10;
        reasons.push('Email aliasing detected');
      }
    }

    // Geographic analysis
    if (context.country && this.highRiskCountries.includes(context.country)) {
      score += 25;
      reasons.push('High-risk country');
    }

    // User history analysis
    const userHistory = await this.getUserHistory(userId);
    if (userHistory.recentFailedLogins > 5) {
      score += 20;
      reasons.push('Multiple failed login attempts');
    }

    if (userHistory.deviceChanges > 3) {
      score += 15;
      reasons.push('Frequent device changes');
    }

    // Payment velocity
    if (context.amount && userHistory.recentPayments > 5) {
      score += 25;
      reasons.push('High payment velocity');
    }

    // Determine risk level
    const risk = score >= 80 ? 'critical' : 
                 score >= 60 ? 'high' :
                 score >= 40 ? 'medium' : 'low';
    
    const blocked = risk === 'critical' || (risk === 'high' && score > 70);

    return { score, risk, reasons, blocked };
  }

  /**
   * Block IP address
   */
  async blockIP(ip: string, reason: string, duration: number = 24 * 60 * 60 * 1000): Promise<void> {
    const entry = this.suspiciousIPs.get(ip) || {
      score: 0,
      lastSeen: Date.now(),
      patterns: this.createEmptyPattern(),
      violations: []
    };

    entry.score = 100;
    entry.blockedUntil = Date.now() + duration;
    entry.violations.push(reason);

    this.suspiciousIPs.set(ip, entry);

    // Log to database
    try {
      await prisma.securityLog.create({
        data: {
          type: 'ip_block',
          ip,
          data: JSON.stringify({ reason, duration }),
        }
      });
    } catch (error) {
      logger.error('Failed to log IP block', { error, ip, reason });
    }

    logger.warn('IP blocked', { ip, reason, duration });
  }

  /**
   * Check if IP is currently blocked
   */
  isIPBlocked(ip: string): boolean {
    const entry = this.suspiciousIPs.get(ip);
    if (!entry || !entry.blockedUntil) return false;
    
    if (Date.now() > entry.blockedUntil) {
      // Block expired, remove it
      entry.blockedUntil = undefined;
      return false;
    }
    
    return true;
  }

  /**
   * Express middleware for request protection
   */
  middleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const analysis = await this.analyzeRequest(req);
        
        // Add analysis to request object for other middleware to use
        (req as any).securityAnalysis = analysis;
        
        if (analysis.blocked) {
          logger.warn('Request blocked by security analysis', {
            ip: analysis.ip,
            threats: analysis.threats.map(t => ({ type: t.type, level: t.level })),
            path: req.path
          });
          
          return res.status(403).json({
            error: 'Access denied',
            reason: 'Security policy violation'
          });
        }
        
        // Log high-risk requests
        const highRiskThreats = analysis.threats.filter(t => ['high', 'critical'].includes(t.level));
        if (highRiskThreats.length > 0) {
          logger.warn('High-risk request detected', {
            ip: analysis.ip,
            threats: highRiskThreats,
            path: req.path,
            userAgent: analysis.userAgent
          });
        }
        
        next();
      } catch (error) {
        logger.error('Security analysis failed', { error, ip: this.getClientIP(req) });
        next(); // Don't block on security analysis errors
      }
    };
  }

  // Private methods
  private detectBot(req: Request, userAgent: string): SecurityThreat | null {
    if (this.botSignatures.some(sig => sig.test(userAgent))) {
      return {
        type: 'bot',
        level: 'medium',
        score: 60,
        reasons: ['Bot user agent detected'],
        shouldBlock: true,
        shouldAlert: false
      };
    }

    // Check for missing common headers
    const missingHeaders = [];
    if (!req.get('Accept')) missingHeaders.push('Accept');
    if (!req.get('Accept-Language')) missingHeaders.push('Accept-Language');
    if (!req.get('Accept-Encoding')) missingHeaders.push('Accept-Encoding');

    if (missingHeaders.length >= 2) {
      return {
        type: 'bot',
        level: 'low',
        score: 30,
        reasons: [`Missing headers: ${missingHeaders.join(', ')}`],
        shouldBlock: false,
        shouldAlert: false
      };
    }

    return null;
  }

  private detectIntrusion(req: Request): SecurityThreat | null {
    const url = req.url;
    const body = JSON.stringify(req.body || {});
    const query = JSON.stringify(req.query || {});
    
    for (const pattern of this.attackPatterns) {
      if (pattern.pattern.test(url) || pattern.pattern.test(body) || pattern.pattern.test(query)) {
        return {
          type: 'intrusion',
          level: pattern.level,
          score: pattern.level === 'high' ? 90 : pattern.level === 'medium' ? 60 : 30,
          reasons: [`${pattern.name} pattern detected`],
          shouldBlock: pattern.level === 'high',
          shouldAlert: pattern.level === 'high'
        };
      }
    }

    return null;
  }

  private detectSuspiciousBehavior(patterns: BehavioralPattern): SecurityThreat | null {
    const score = patterns.requestsPerMinute * 2 + patterns.suspiciousActions.length * 10;
    
    if (score > 80) {
      return {
        type: 'abuse',
        level: 'high',
        score,
        reasons: patterns.suspiciousActions,
        shouldBlock: true,
        shouldAlert: true
      };
    } else if (score > 40) {
      return {
        type: 'abuse',
        level: 'medium',
        score,
        reasons: patterns.suspiciousActions,
        shouldBlock: false,
        shouldAlert: false
      };
    }

    return null;
  }

  private analyzeBehavior(ip: string, req: Request): BehavioralPattern {
    const now = Date.now();
    const oneMinute = 60 * 1000;
    
    const existing = this.suspiciousIPs.get(ip);
    if (!existing) {
      const newPattern = this.createEmptyPattern();
      newPattern.uniqueEndpoints.add(req.path);
      return newPattern;
    }

    // Update patterns
    const pattern = existing.patterns;
    pattern.uniqueEndpoints.add(req.path);

    // Calculate requests per minute
    if (now - existing.lastSeen < oneMinute) {
      pattern.requestsPerMinute++;
    } else {
      pattern.requestsPerMinute = 1;
    }

    // Detect suspicious actions
    if (pattern.requestsPerMinute > 60) {
      pattern.suspiciousActions.push('High request rate');
    }

    if (pattern.uniqueEndpoints.size > 20) {
      pattern.suspiciousActions.push('Endpoint scanning');
    }

    return pattern;
  }

  private updateIPTracking(ip: string, patterns: BehavioralPattern, threats: SecurityThreat[]): void {
    const now = Date.now();
    const totalScore = threats.reduce((sum, t) => sum + t.score, 0);
    
    const entry = this.suspiciousIPs.get(ip) || {
      score: 0,
      lastSeen: now,
      patterns: this.createEmptyPattern(),
      violations: []
    };

    entry.score = Math.min(100, entry.score + totalScore);
    entry.lastSeen = now;
    entry.patterns = patterns;
    
    if (threats.length > 0) {
      entry.violations.push(...threats.map(t => `${t.type}: ${t.reasons.join(', ')}`));
    }

    this.suspiciousIPs.set(ip, entry);
  }

  private async getUserHistory(userId: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          orders: {
            where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }
          }
        }
      });

      return {
        recentFailedLogins: 0, // Would track in security logs
        deviceChanges: 0, // Would track device fingerprints
        recentPayments: user?.orders?.length || 0,
      };
    } catch (error) {
      return { recentFailedLogins: 0, deviceChanges: 0, recentPayments: 0 };
    }
  }

  private generateFingerprint(req: Request): string {
    const components = [
      req.get('User-Agent') || '',
      req.get('Accept-Language') || '',
      req.get('Accept-Encoding') || '',
      req.get('Accept') || '',
    ];
    
    return crypto.createHash('md5').update(components.join('|')).digest('hex');
  }

  private getClientIP(req: Request): string {
    return req.get('x-forwarded-for')?.split(',')[0] || 
           req.get('x-real-ip') || 
           req.ip || 
           req.connection?.remoteAddress || 
           'unknown';
  }

  private createEmptyPattern(): BehavioralPattern {
    return {
      requestsPerMinute: 0,
      uniqueEndpoints: new Set(),
      statusCodes: new Map(),
      averageResponseTime: 0,
      suspiciousActions: []
    };
  }

  private startCleanupTasks(): void {
    // Cleanup old entries every hour
    setInterval(() => {
      const now = Date.now();
      const oneHour = 60 * 60 * 1000;
      
      for (const [ip, entry] of this.suspiciousIPs.entries()) {
        if (now - entry.lastSeen > oneHour && !entry.blockedUntil) {
          this.suspiciousIPs.delete(ip);
        }
      }
    }, 60 * 60 * 1000);
  }
}

// Export singleton instance
export const securityService = new UnifiedSecurityService();

// Export types
export type { FraudScore, RequestAnalysis, SecurityThreat };

// Export middleware for backward compatibility
export const securityMiddleware = securityService.middleware();

export default securityService;
