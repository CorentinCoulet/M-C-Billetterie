import { PrismaClient } from '../generated/prisma';
import { Request } from 'express';
import { safeLogger } from '../lib/logger';

const prisma = new PrismaClient();

interface ThreatDetectionResult {
  threatLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  threatType: string;
  details: string;
  shouldBlock: boolean;
  shouldAlert: boolean;
}

interface AttackPattern {
  name: string;
  pattern: RegExp;
  threatLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
}

/**
 * Real-time Intrusion Detection System
 * Monitors and analyzes incoming requests for suspicious activity
 */
export class IntrusionDetectionService {
  private static instance: IntrusionDetectionService;
  private attackPatterns: AttackPattern[] = [];
  private suspiciousIPs = new Map<string, number>();
  private rateLimitViolations = new Map<string, number>();

  private constructor() {
    this.initializeAttackPatterns();
    this.startCleanupTasks();
  }

  static getInstance(): IntrusionDetectionService {
    if (!IntrusionDetectionService.instance) {
      IntrusionDetectionService.instance = new IntrusionDetectionService();
    }
    return IntrusionDetectionService.instance;
  }

  /**
   * Initialize known attack patterns
   */
  private initializeAttackPatterns(): void {
    this.attackPatterns = [
      // SQL Injection patterns
      {
        name: 'SQL_INJECTION_UNION',
        pattern: /\b(union|select|insert|update|delete|drop)\b.*\b(from|where|order by)\b/gi,
        threatLevel: 'HIGH',
        description: 'SQL injection attempt detected'
      },
      {
        name: 'SQL_INJECTION_BLIND',
        pattern: /(\b1\s*=\s*1\b|\b1\s*=\s*0\b|'\s*or\s*'1'\s*=\s*'1)/gi,
        threatLevel: 'HIGH',
        description: 'Blind SQL injection attempt'
      },

      // XSS patterns
      {
        name: 'XSS_SCRIPT_TAG',
        pattern: /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
        threatLevel: 'MEDIUM',
        description: 'XSS script injection attempt'
      },
      {
        name: 'XSS_EVENT_HANDLER',
        pattern: /on(load|click|mouseover|error|focus)[\s]*=[\s]*['"]/gi,
        threatLevel: 'MEDIUM',
        description: 'XSS event handler injection'
      },
      {
        name: 'XSS_JAVASCRIPT_PROTOCOL',
        pattern: /javascript\s*:/gi,
        threatLevel: 'MEDIUM',
        description: 'JavaScript protocol injection'
      },

      // Command Injection
      {
        name: 'COMMAND_INJECTION',
        pattern: /(\||&|;|\$\(|\`|>|<)/g,
        threatLevel: 'HIGH',
        description: 'Command injection attempt'
      },

      // Path Traversal
      {
        name: 'PATH_TRAVERSAL',
        pattern: /\.\.(\/|\\)/g,
        threatLevel: 'HIGH',
        description: 'Path traversal attempt'
      },

      // LDAP Injection
      {
        name: 'LDAP_INJECTION',
        pattern: /(\*|\(|\)|\||&)/g,
        threatLevel: 'MEDIUM',
        description: 'LDAP injection attempt'
      },

      // File Inclusion
      {
        name: 'FILE_INCLUSION',
        pattern: /(php:\/\/|file:\/\/|data:\/\/)/gi,
        threatLevel: 'HIGH',
        description: 'File inclusion attempt'
      },

      // NoSQL Injection
      {
        name: 'NOSQL_INJECTION',
        pattern: /(\$ne|\$gt|\$lt|\$regex|\$where)/gi,
        threatLevel: 'MEDIUM',
        description: 'NoSQL injection attempt'
      }
    ];
  }

  /**
   * Analyze incoming request for threats
   */
  async analyzeRequest(req: Request): Promise<ThreatDetectionResult> {
    const clientIP = this.getClientIP(req);
    const userAgent = req.headers['user-agent'] || '';
    const url = req.url || '';
    const method = req.method;
    const body = JSON.stringify(req.body || {});
    const query = JSON.stringify(req.query || {});
    
    let maxThreatLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    const detectedThreats: string[] = [];

    // 1. Analyze for known attack patterns
    const fullRequest = `${url} ${body} ${query} ${userAgent}`;
    
    for (const pattern of this.attackPatterns) {
      if (pattern.pattern.test(fullRequest)) {
        detectedThreats.push(pattern.name);
        
        if (this.getThreatLevelScore(pattern.threatLevel) > this.getThreatLevelScore(maxThreatLevel)) {
          maxThreatLevel = pattern.threatLevel;
        }

        // Log the detection
        await this.logSecurityEvent({
          type: pattern.name,
          ip: clientIP,
          userAgent,
          url,
          method,
          details: pattern.description,
          threatLevel: pattern.threatLevel
        });
      }
    }

    // 2. Behavioral analysis
    const behavioralThreat = await this.analyzeBehavior(clientIP, req);
    if (behavioralThreat.threatLevel !== 'LOW') {
      detectedThreats.push('BEHAVIORAL_ANOMALY');
      if (this.getThreatLevelScore(behavioralThreat.threatLevel) > this.getThreatLevelScore(maxThreatLevel)) {
        maxThreatLevel = behavioralThreat.threatLevel;
      }
    }

    // 3. Rate limiting analysis
    const rateThreat = this.analyzeRateLimit(clientIP);
    if (rateThreat.threatLevel !== 'LOW') {
      detectedThreats.push('RATE_LIMIT_VIOLATION');
      if (this.getThreatLevelScore(rateThreat.threatLevel) > this.getThreatLevelScore(maxThreatLevel)) {
        maxThreatLevel = rateThreat.threatLevel;
      }
    }

    // 4. Geolocation analysis (if available)
    const geoThreat = await this.analyzeGeolocation(clientIP);
    if (geoThreat.threatLevel !== 'LOW') {
      detectedThreats.push('GEO_ANOMALY');
      if (this.getThreatLevelScore(geoThreat.threatLevel) > this.getThreatLevelScore(maxThreatLevel)) {
        maxThreatLevel = geoThreat.threatLevel;
      }
    }

    // Determine response actions
    const shouldBlock = maxThreatLevel === 'CRITICAL' || 
                       (maxThreatLevel === 'HIGH' && detectedThreats.length > 1);
    
    const shouldAlert = maxThreatLevel === 'CRITICAL' || 
                       maxThreatLevel === 'HIGH' ||
                       (maxThreatLevel === 'MEDIUM' && detectedThreats.length > 2);

    // Update suspicious IP tracking
    if (maxThreatLevel !== 'LOW') {
      this.updateSuspiciousIP(clientIP, maxThreatLevel);
    }

    // Send alerts if necessary
    if (shouldAlert) {
      await this.sendSecurityAlert(clientIP, detectedThreats, maxThreatLevel);
    }

    return {
      threatLevel: maxThreatLevel,
      threatType: detectedThreats.join(', ') || 'CLEAN',
      details: `Detected ${detectedThreats.length} potential threats`,
      shouldBlock,
      shouldAlert
    };
  }

  /**
   * Analyze behavioral patterns
   */
  private async analyzeBehavior(clientIP: string, req: Request): Promise<ThreatDetectionResult> {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    try {
      // Get recent activity from this IP
      const recentActivity = await prisma.securityLog.findMany({
        where: {
          ip: clientIP,
          timestamp: {
            gte: oneHourAgo
          }
        },
        orderBy: {
          timestamp: 'desc'
        }
      });

      let threatLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
      const anomalies: string[] = [];

      // Check for rapid-fire requests
      if (recentActivity.length > 100) {
        anomalies.push('High request volume');
        threatLevel = 'MEDIUM';
      }

      if (recentActivity.length > 500) {
        anomalies.push('Extremely high request volume');
        threatLevel = 'CRITICAL';
      }

      // Check for scanning behavior (accessing many different endpoints)
      const uniqueUrls = new Set(recentActivity.map((log: any) => log.url).filter(Boolean));
      if (uniqueUrls.size > 20) {
        anomalies.push('Scanning behavior detected');
        threatLevel = 'HIGH';
      }

      if (uniqueUrls.size > 50) {
        anomalies.push('Intensive scanning detected');
        threatLevel = 'CRITICAL';
      }

      // Check for authentication failures
      const authFailures = recentActivity.filter((log: any) => 
        log.type?.includes('login') && log.data?.includes('failure')
      ).length;
      
      if (authFailures > 10) {
        anomalies.push('Multiple authentication failures');
        threatLevel = 'HIGH';
      }

      if (authFailures > 50) {
        anomalies.push('Brute force attack detected');
        threatLevel = 'CRITICAL';
      }

      // Check for error-generating requests
      const errorRequests = recentActivity.filter((log: any) => 
        log.data?.includes('error') || log.data?.includes('exception')
      ).length;
      
      if (errorRequests > 20) {
        anomalies.push('High error rate');
        threatLevel = 'MEDIUM';
      }

      return {
        threatLevel,
        threatType: 'BEHAVIORAL_ANALYSIS',
        details: anomalies.join(', ') || 'Normal behavior',
        shouldBlock: threatLevel === 'CRITICAL' || threatLevel === 'HIGH',
        shouldAlert: threatLevel === 'HIGH' || threatLevel === 'CRITICAL' || threatLevel === 'MEDIUM'
      };

    } catch (error) {
      safeLogger.error('Error in behavioral analysis:', error);
      return {
        threatLevel: 'LOW',
        threatType: 'BEHAVIORAL_ANALYSIS_ERROR',
        details: 'Could not analyze behavior',
        shouldBlock: false,
        shouldAlert: false
      };
    }
  }

  /**
   * Analyze rate limiting violations
   */
  private analyzeRateLimit(clientIP: string): ThreatDetectionResult {
    const violations = this.rateLimitViolations.get(clientIP) || 0;
    
    if (violations > 20) {
      return {
        threatLevel: 'CRITICAL',
        threatType: 'RATE_LIMIT_ABUSE',
        details: `${violations} rate limit violations`,
        shouldBlock: true,
        shouldAlert: true
      };
    } else if (violations > 10) {
      return {
        threatLevel: 'HIGH',
        threatType: 'RATE_LIMIT_VIOLATION',
        details: `${violations} rate limit violations`,
        shouldBlock: false,
        shouldAlert: true
      };
    } else if (violations > 5) {
      return {
        threatLevel: 'MEDIUM',
        threatType: 'ELEVATED_REQUESTS',
        details: `${violations} rate limit violations`,
        shouldBlock: false,
        shouldAlert: false
      };
    }

    return {
      threatLevel: 'LOW',
      threatType: 'NORMAL_RATE',
      details: 'Normal request rate',
      shouldBlock: false,
      shouldAlert: false
    };
  }

  /**
   * Analyze geolocation for anomalies
   */
  private async analyzeGeolocation(clientIP: string): Promise<ThreatDetectionResult> {
    // This would integrate with a geolocation service
    // For now, return low threat
    return {
      threatLevel: 'LOW',
      threatType: 'GEO_ANALYSIS',
      details: 'Geolocation analysis not implemented',
      shouldBlock: false,
      shouldAlert: false
    };
  }

  /**
   * Update suspicious IP tracking
   */
  private updateSuspiciousIP(clientIP: string, threatLevel: string): void {
    const currentScore = this.suspiciousIPs.get(clientIP) || 0;
    const scoreIncrement = this.getThreatLevelScore(threatLevel as any);
    
    this.suspiciousIPs.set(clientIP, currentScore + scoreIncrement);

    // Auto-block IPs with very high scores
    if (currentScore + scoreIncrement > 100) {
      this.blockIP(clientIP, 'Automated blocking due to high threat score');
    }
  }

  /**
   * Block an IP address
   */
  private async blockIP(clientIP: string, reason: string): Promise<void> {
    try {
      const blockDuration = 24 * 60 * 60 * 1000; // 24 hours
      const expiresAt = new Date(Date.now() + blockDuration);

      await prisma.blockedIP.create({
        data: {
          ipAddress: clientIP,
          reason,
          expiresAt,
          blockCount: 1
        }
      });

      safeLogger.warn(`IP ${clientIP} blocked automatically: ${reason}`);
    } catch (error) {
      safeLogger.error('Error blocking IP:', error);
    }
  }

  /**
   * Send security alert
   */
  private async sendSecurityAlert(
    clientIP: string, 
    threats: string[], 
    threatLevel: string
  ): Promise<void> {
    try {
      const alertMessage = `Security Alert: ${threatLevel} threat detected from IP ${clientIP}. Threats: ${threats.join(', ')}`;
      
      // Log the alert
      safeLogger.warn(alertMessage);

      // Send notification to security team
      // This would integrate with your notification service
      // await notificationService.sendSecurityAlert('admin', 'INTRUSION_DETECTED', {
      //   ip: clientIP,
      //   threats,
      //   threatLevel,
      //   timestamp: new Date().toISOString()
      // });
      
      // For now, just log the alert
      safeLogger.error(`SECURITY ALERT: ${threats.join(', ')} detected from IP ${clientIP} (Level: ${threatLevel})`);

    } catch (error) {
      safeLogger.error('Error sending security alert:', error);
    }
  }

  /**
   * Log security event
   */
  private async logSecurityEvent(event: {
    type: string;
    ip: string;
    userAgent?: string;
    url?: string;
    method?: string;
    details: string;
    threatLevel: string;
  }): Promise<void> {
    try {
      await prisma.securityLog.create({
        data: {
          type: event.type,
          ip: event.ip,
          userAgent: event.userAgent,
          url: event.url,
          data: JSON.stringify({
            method: event.method,
            details: event.details,
            threatLevel: event.threatLevel
          }),
          timestamp: new Date()
        }
      });
    } catch (error) {
      safeLogger.error('Error logging security event:', error);
    }
  }

  /**
   * Get client IP address
   */
  private getClientIP(req: Request): string {
    return (req.ip || 
            req.headers['x-forwarded-for'] || 
            req.headers['x-real-ip'] || 
            req.connection?.remoteAddress || 
            'unknown') as string;
  }

  /**
   * Convert threat level to numeric score
   */
  private getThreatLevelScore(level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'): number {
    const scores = {
      'LOW': 1,
      'MEDIUM': 5,
      'HIGH': 20,
      'CRITICAL': 50
    };
    return scores[level];
  }

  /**
   * Start cleanup tasks
   */
  private startCleanupTasks(): void {
    // Clean up old tracking data every hour
    setInterval(() => {
      this.suspiciousIPs.clear();
      this.rateLimitViolations.clear();
    }, 60 * 60 * 1000);
  }

  /**
   * Record rate limit violation
   */
  recordRateLimitViolation(clientIP: string): void {
    const current = this.rateLimitViolations.get(clientIP) || 0;
    this.rateLimitViolations.set(clientIP, current + 1);
  }

  /**
   * Check if IP should be blocked
   */
  async shouldBlockIP(clientIP: string): Promise<boolean> {
    try {
      const blockedIP = await prisma.blockedIP.findUnique({
        where: { ipAddress: clientIP }
      });

      return blockedIP !== null && blockedIP.expiresAt > new Date();
    } catch (error) {
      safeLogger.error('Error checking blocked IP:', error);
      return false;
    }
  }
}

export const intrusionDetectionService = IntrusionDetectionService.getInstance();
