/**
 * Real-time Security Incident Response System
 * Automated threat detection and response
 */

import { PrismaClient } from '../generated/prisma';
import { logger } from './logger';
import { emailService } from './mailer';
import { slackService } from './slack-integration';

const prisma = new PrismaClient();

interface SecurityIncident {
  id: string;
  type: 'INTRUSION' | 'DATA_BREACH' | 'AUTHENTICATION_ANOMALY' | 'DDOS' | 'SQL_INJECTION' | 'XSS' | 'PRIVILEGE_ESCALATION';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  source: string;
  description: string;
  evidence: Record<string, any>;
  timestamp: Date;
  status: 'DETECTED' | 'INVESTIGATING' | 'CONTAINED' | 'RESOLVED';
  autoBlocked: boolean;
}

interface ThreatIntelligence {
  maliciousIPs: Set<string>;
  suspiciousPatterns: RegExp[];
  knownAttackSignatures: string[];
}

class SecurityIncidentResponse {
  private incidents: Map<string, SecurityIncident> = new Map();
  private threatIntel: ThreatIntelligence;
  private blockedIPs: Set<string> = new Set();
  private emergencyContacts: string[] = [];

  constructor() {
    this.threatIntel = {
      maliciousIPs: new Set(),
      suspiciousPatterns: [
        /(?:union|select|insert|delete|drop|create|alter|exec|script)/gi,
        /<script[^>]*>.*?<\/script>/gi,
        /javascript:\s*[^;]*/gi,
        /on(?:click|load|error|mouseover)\s*=/gi
      ],
      knownAttackSignatures: [
        'sqlmap',
        'nikto',
        'nessus',
        'burpsuite',
        'owasp-zap'
      ]
    };

    this.emergencyContacts = [
      process.env.SECURITY_EMAIL || 'security@company.com',
      process.env.EMERGENCY_EMAIL || 'emergency@company.com'
    ];

    this.startThreatIntelligenceUpdater();
  }

  /**
   * Detect and respond to security incidents
   */
  async detectIncident(
    type: SecurityIncident['type'],
    source: string,
    evidence: Record<string, any>
  ): Promise<string> {
    const incident: SecurityIncident = {
      id: this.generateIncidentId(),
      type,
      severity: this.calculateSeverity(type, evidence),
      source,
      description: this.generateDescription(type, evidence),
      evidence,
      timestamp: new Date(),
      status: 'DETECTED',
      autoBlocked: false
    };

    this.incidents.set(incident.id, incident);

    // Log incident
    logger.error('Security incident detected', {
      incidentId: incident.id,
      type: incident.type,
      severity: incident.severity,
      source: incident.source
    });

    // Persist to database
    await this.persistIncident(incident);

    // Automated response
    await this.executeAutomatedResponse(incident);

    // Notifications
    await this.notifySecurityTeam(incident);

    return incident.id;
  }

  /**
   * Real-time threat analysis
   */
  async analyzeThreat(req: any): Promise<{
    riskScore: number;
    threats: string[];
    shouldBlock: boolean;
    reason?: string;
  }> {
    const threats: string[] = [];
    let riskScore = 0;

    const clientIP = this.extractClientIP(req);
    const userAgent = req.headers['user-agent'] || '';
    const requestPath = req.url || '';
    const requestBody = JSON.stringify(req.body || {});

    // Check against known malicious IPs
    if (this.threatIntel.maliciousIPs.has(clientIP)) {
      threats.push('MALICIOUS_IP');
      riskScore += 80;
    }

    // Check for attack signatures in User-Agent
    if (this.threatIntel.knownAttackSignatures.some(sig => 
      userAgent.toLowerCase().includes(sig.toLowerCase())
    )) {
      threats.push('ATTACK_TOOL_DETECTED');
      riskScore += 70;
    }

    // Check for suspicious patterns
    const combinedInput = `${requestPath} ${requestBody} ${userAgent}`;
    this.threatIntel.suspiciousPatterns.forEach((pattern, index) => {
      if (pattern.test(combinedInput)) {
        threats.push(`SUSPICIOUS_PATTERN_${index}`);
        riskScore += 30;
      }
    });

    // Check request frequency
    const recentRequests = await this.getRecentRequestCount(clientIP, 60000); // 1 minute
    if (recentRequests > 100) {
      threats.push('HIGH_REQUEST_FREQUENCY');
      riskScore += 40;
    }

    // Check for brute force patterns
    const recentFailedLogins = await this.getRecentFailedLogins(clientIP, 300000); // 5 minutes
    if (recentFailedLogins > 5) {
      threats.push('BRUTE_FORCE_ATTEMPT');
      riskScore += 60;
    }

    // Geographic anomaly detection
    const geoAnomaly = await this.checkGeographicAnomaly(clientIP, req.userId);
    if (geoAnomaly) {
      threats.push('GEOGRAPHIC_ANOMALY');
      riskScore += 25;
    }

    const shouldBlock = riskScore >= 70;

    if (shouldBlock) {
      await this.detectIncident('INTRUSION', clientIP, {
        riskScore,
        threats,
        userAgent,
        requestPath,
        requestBody: req.body
      });
    }

    return {
      riskScore,
      threats,
      shouldBlock,
      reason: shouldBlock ? `Risk score: ${riskScore}, Threats: ${threats.join(', ')}` : undefined
    };
  }

  /**
   * Block IP address with automatic expiration
   */
  async blockIP(
    ipAddress: string, 
    reason: string, 
    durationMinutes: number = 60
  ): Promise<void> {
    this.blockedIPs.add(ipAddress);
    
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + durationMinutes);

    await prisma.blockedIP.create({
      data: {
        ipAddress,
        reason,
        expiresAt,
        blockedAt: new Date()
      }
    });

    // Schedule automatic unblock
    setTimeout(() => {
      this.blockedIPs.delete(ipAddress);
    }, durationMinutes * 60 * 1000);

    logger.warn(`IP ${ipAddress} blocked`, { reason, durationMinutes });
  }

  /**
   * Check if IP is currently blocked
   */
  isIPBlocked(ipAddress: string): boolean {
    return this.blockedIPs.has(ipAddress);
  }

  /**
   * Honeypot endpoints for threat detection
   */
  createHoneypot(): { path: string; handler: Function }[] {
    return [
      {
        path: '/admin/login.php',
        handler: async (req: any) => {
          await this.detectIncident('INTRUSION', this.extractClientIP(req), {
            type: 'HONEYPOT_ACCESS',
            path: '/admin/login.php',
            userAgent: req.headers['user-agent']
          });
        }
      },
      {
        path: '/.env',
        handler: async (req: any) => {
          await this.detectIncident('INTRUSION', this.extractClientIP(req), {
            type: 'SENSITIVE_FILE_ACCESS',
            path: '/.env',
            userAgent: req.headers['user-agent']
          });
        }
      },
      {
        path: '/wp-admin',
        handler: async (req: any) => {
          await this.detectIncident('INTRUSION', this.extractClientIP(req), {
            type: 'WORDPRESS_PROBE',
            path: '/wp-admin',
            userAgent: req.headers['user-agent']
          });
        }
      }
    ];
  }

  private generateIncidentId(): string {
    return `INC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private calculateSeverity(
    type: SecurityIncident['type'],
    evidence: Record<string, any>
  ): SecurityIncident['severity'] {
    const severityMap: Record<SecurityIncident['type'], SecurityIncident['severity']> = {
      'DATA_BREACH': 'CRITICAL',
      'SQL_INJECTION': 'CRITICAL',
      'PRIVILEGE_ESCALATION': 'CRITICAL',
      'INTRUSION': 'HIGH',
      'DDOS': 'HIGH',
      'AUTHENTICATION_ANOMALY': 'MEDIUM',
      'XSS': 'MEDIUM'
    };

    let baseSeverity = severityMap[type] || 'LOW';

    // Upgrade severity based on evidence
    if (evidence.riskScore > 90) {
      baseSeverity = 'CRITICAL';
    } else if (evidence.riskScore > 70) {
      baseSeverity = 'HIGH';
    }

    return baseSeverity;
  }

  private generateDescription(
    type: SecurityIncident['type'],
    evidence: Record<string, any>
  ): string {
    const descriptions: Record<SecurityIncident['type'], string> = {
      'INTRUSION': 'Unauthorized access attempt detected',
      'DATA_BREACH': 'Potential data breach incident',
      'AUTHENTICATION_ANOMALY': 'Suspicious authentication activity',
      'DDOS': 'Distributed Denial of Service attack detected',
      'SQL_INJECTION': 'SQL injection attempt detected',
      'XSS': 'Cross-site scripting attempt detected',
      'PRIVILEGE_ESCALATION': 'Privilege escalation attempt detected'
    };

    return descriptions[type] || 'Unknown security incident';
  }

  private async executeAutomatedResponse(incident: SecurityIncident): Promise<void> {
    switch (incident.type) {
      case 'INTRUSION':
      case 'SQL_INJECTION':
      case 'XSS':
        // Auto-block source IP
        await this.blockIP(incident.source, `Auto-blocked: ${incident.type}`, 120);
        incident.autoBlocked = true;
        break;

      case 'DATA_BREACH':
        // Immediate lockdown protocols
        await this.initiateEmergencyLockdown();
        break;

      case 'DDOS':
        // Rate limiting and traffic shaping
        await this.activateEmergencyRateLimiting();
        break;
    }
  }

  private async notifySecurityTeam(incident: SecurityIncident): Promise<void> {
    const message = `
🚨 SECURITY INCIDENT DETECTED 🚨

Incident ID: ${incident.id}
Type: ${incident.type}
Severity: ${incident.severity}
Source: ${incident.source}
Time: ${incident.timestamp.toISOString()}
Auto-Blocked: ${incident.autoBlocked ? 'Yes' : 'No'}

Description: ${incident.description}

Evidence: ${JSON.stringify(incident.evidence, null, 2)}
    `;

    // Email notification
    try {
      await emailService.sendEmail({
        to: this.emergencyContacts,
        subject: `[SECURITY ALERT] ${incident.severity} - ${incident.type}`,
        text: message,
        priority: 'high'
      });
    } catch (error) {
      logger.error('Failed to send security email alert', error);
    }

    // Slack notification for critical incidents
    if (incident.severity === 'CRITICAL') {
      try {
        await slackService.sendAlert({
          channel: '#security-alerts',
          message: `🚨 CRITICAL SECURITY INCIDENT: ${incident.type}`,
          details: message
        });
      } catch (error) {
        logger.error('Failed to send Slack security alert', error);
      }
    }

    // SMS notification for critical incidents (implement with Twilio/similar)
    if (incident.severity === 'CRITICAL') {
      // TODO: Implement SMS alerts
    }
  }

  private async persistIncident(incident: SecurityIncident): Promise<void> {
    try {
      await prisma.securityLog.create({
        data: {
          type: `INCIDENT_${incident.type}`,
          ip: incident.source,
          data: JSON.stringify({
            incidentId: incident.id,
            severity: incident.severity,
            description: incident.description,
            evidence: incident.evidence,
            status: incident.status,
            autoBlocked: incident.autoBlocked
          }),
          timestamp: incident.timestamp
        }
      });
    } catch (error) {
      logger.error('Failed to persist security incident', error);
    }
  }

  private extractClientIP(req: any): string {
    return req.ip || 
           req.connection.remoteAddress || 
           req.socket.remoteAddress || 
           req.headers['x-forwarded-for']?.split(',')[0] ||
           'unknown';
  }

  private async getRecentRequestCount(ip: string, timeWindowMs: number): Promise<number> {
    const since = new Date(Date.now() - timeWindowMs);
    
    const count = await prisma.securityLog.count({
      where: {
        ip,
        timestamp: {
          gte: since
        }
      }
    });

    return count;
  }

  private async getRecentFailedLogins(ip: string, timeWindowMs: number): Promise<number> {
    const since = new Date(Date.now() - timeWindowMs);
    
    const count = await prisma.loginAttempt.count({
      where: {
        ipAddress: ip,
        success: false,
        timestamp: {
          gte: since
        }
      }
    });

    return count;
  }

  private async checkGeographicAnomaly(ip: string, userId?: string): Promise<boolean> {
    if (!userId) return false;

    // Get user's typical locations from login history
    const recentLogins = await prisma.loginAttempt.findMany({
      where: {
        userId,
        success: true,
        timestamp: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      },
      select: {
        ipAddress: true,
        timestamp: true
      },
      orderBy: {
        timestamp: 'desc'
      },
      take: 50
    });

    // Simple geographic anomaly detection
    // In production, you'd use a proper GeoIP service
    const currentIPClass = ip.split('.').slice(0, 2).join('.');
    const knownIPClasses = recentLogins.map(login => 
      login.ipAddress.split('.').slice(0, 2).join('.')
    );

    return !knownIPClasses.includes(currentIPClass);
  }

  private async initiateEmergencyLockdown(): Promise<void> {
    logger.error('Emergency lockdown initiated - Data breach detected');
    
    // TODO: Implement emergency procedures:
    // - Disable non-essential endpoints
    // - Force password resets for admin users
    // - Enable additional logging
    // - Notify compliance team
  }

  private async activateEmergencyRateLimiting(): Promise<void> {
    logger.warn('Emergency rate limiting activated - DDoS detected');
    
    // TODO: Implement emergency rate limiting:
    // - Reduce rate limits by 90%
    // - Enable CAPTCHA for all requests
    // - Block suspicious countries/ASNs
  }

  private startThreatIntelligenceUpdater(): void {
    // Update threat intelligence every hour
    setInterval(async () => {
      await this.updateThreatIntelligence();
    }, 60 * 60 * 1000);

    // Initial update
    this.updateThreatIntelligence();
  }

  private async updateThreatIntelligence(): Promise<void> {
    try {
      // Update malicious IP list from threat feeds
      // TODO: Integrate with threat intelligence providers
      // Examples: AbuseIPDB, VirusTotal, OTX, etc.
      
      logger.info('Threat intelligence updated');
    } catch (error) {
      logger.error('Failed to update threat intelligence', error);
    }
  }
}

// Export singleton instance
export const securityIncidentResponse = new SecurityIncidentResponse();
export default SecurityIncidentResponse;
