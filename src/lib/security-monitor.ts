import { EventEmitter } from 'events';
import nodemailer from 'nodemailer';
import { logger } from '../lib/logger';
import prisma from '../lib/prisma';

/**
 * Advanced Security Monitoring and Alerting System
 * Real-time security event detection and incident response
 */

export enum SecurityEventType {
  LOGIN_FAILURE = 'login_failure',
  BRUTE_FORCE_ATTACK = 'brute_force_attack',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  DATA_BREACH_ATTEMPT = 'data_breach_attempt',
  INJECTION_ATTEMPT = 'injection_attempt',
  UNAUTHORIZED_ACCESS = 'unauthorized_access',
  ACCOUNT_TAKEOVER = 'account_takeover',
  PAYMENT_FRAUD = 'payment_fraud',
  BOT_DETECTED = 'bot_detected',
  DDOS_ATTACK = 'ddos_attack',
  PRIVILEGE_ESCALATION = 'privilege_escalation',
  DATA_EXFILTRATION = 'data_exfiltration'
}

export enum AlertSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface SecurityEvent {
  id: string;
  type: SecurityEventType;
  severity: AlertSeverity;
  title: string;
  description: string;
  metadata: Record<string, any>;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
}

export interface AlertRule {
  eventType: SecurityEventType;
  threshold: number;
  timeWindow: number; // in minutes
  severity: AlertSeverity;
  enabled: boolean;
  actions: AlertAction[];
}

export interface AlertAction {
  type: 'email' | 'webhook' | 'block_ip' | 'disable_account' | 'log';
  config: Record<string, any>;
}

class SecurityMonitor extends EventEmitter {
  private eventBuffer: Map<string, SecurityEvent[]> = new Map();
  private alertRules: AlertRule[] = [];
  private alertHistory: Map<string, Date> = new Map();
  private readonly transporter?: nodemailer.Transporter;

  constructor() {
    super();
    this.transporter = this.createEmailTransporter();
    this.initializeAlertRules();
    this.startPeriodicAnalysis();
  }

  private createEmailTransporter(): nodemailer.Transporter | undefined {
    if (process.env.SMTP_HOST) {
      return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: process.env.SMTP_USER ? {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        } : undefined
      });
    }
    return undefined;
  }

  private initializeEmailTransporter() {
    // This method is no longer needed - initialization is done in constructor
  }

  private initializeAlertRules() {
    this.alertRules = [
      {
        eventType: SecurityEventType.LOGIN_FAILURE,
        threshold: 5,
        timeWindow: 15,
        severity: AlertSeverity.MEDIUM,
        enabled: true,
        actions: [
          { type: 'log', config: {} },
          { type: 'email', config: { template: 'brute_force_alert' } }
        ]
      },
      {
        eventType: SecurityEventType.INJECTION_ATTEMPT,
        threshold: 1,
        timeWindow: 5,
        severity: AlertSeverity.HIGH,
        enabled: true,
        actions: [
          { type: 'block_ip', config: { duration: 3600000 } },
          { type: 'email', config: { template: 'injection_alert' } }
        ]
      },
      {
        eventType: SecurityEventType.DATA_BREACH_ATTEMPT,
        threshold: 1,
        timeWindow: 1,
        severity: AlertSeverity.CRITICAL,
        enabled: true,
        actions: [
          { type: 'block_ip', config: { duration: 86400000 } },
          { type: 'email', config: { template: 'breach_alert' } },
          { type: 'webhook', config: { url: process.env.SECURITY_WEBHOOK_URL } }
        ]
      },
      {
        eventType: SecurityEventType.PAYMENT_FRAUD,
        threshold: 1,
        timeWindow: 30,
        severity: AlertSeverity.HIGH,
        enabled: true,
        actions: [
          { type: 'disable_account', config: {} },
          { type: 'email', config: { template: 'fraud_alert' } }
        ]
      }
    ];
  }

  /**
   * Record a security event
   */
  async recordEvent(
    type: SecurityEventType,
    title: string,
    description: string,
    metadata: Record<string, any> = {},
    userId?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<string> {
    const eventId = `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const event: SecurityEvent = {
      id: eventId,
      type,
      severity: this.calculateSeverity(type, metadata),
      title,
      description,
      metadata,
      userId,
      ipAddress,
      userAgent,
      timestamp: new Date(),
      resolved: false
    };

    // Store in database
    await prisma.securityLog.create({
      data: {
        type: type.toString(),
        ip: ipAddress || 'unknown',
        userAgent: userAgent || null,
        userId: userId || null,
        data: JSON.stringify({
          title,
          description,
          metadata,
          severity: event.severity
        })
      }
    });

    // Add to buffer for analysis
    const key = this.getEventKey(type, ipAddress, userId);
    if (!this.eventBuffer.has(key)) {
      this.eventBuffer.set(key, []);
    }
    this.eventBuffer.get(key)!.push(event);

    // Emit event for real-time processing
    this.emit('securityEvent', event);

    // Check if this triggers any alerts
    await this.checkAlertRules(event);

    logger.info('Security event recorded', {
      eventId,
      type,
      severity: event.severity,
      userId,
      ipAddress
    });

    return eventId;
  }

  /**
   * Calculate event severity based on type and metadata
   */
  private calculateSeverity(type: SecurityEventType, metadata: Record<string, any>): AlertSeverity {
    // Base severity by event type
    const baseSeverity = {
      [SecurityEventType.LOGIN_FAILURE]: AlertSeverity.LOW,
      [SecurityEventType.BRUTE_FORCE_ATTACK]: AlertSeverity.MEDIUM,
      [SecurityEventType.SUSPICIOUS_ACTIVITY]: AlertSeverity.MEDIUM,
      [SecurityEventType.DATA_BREACH_ATTEMPT]: AlertSeverity.CRITICAL,
      [SecurityEventType.INJECTION_ATTEMPT]: AlertSeverity.HIGH,
      [SecurityEventType.UNAUTHORIZED_ACCESS]: AlertSeverity.HIGH,
      [SecurityEventType.ACCOUNT_TAKEOVER]: AlertSeverity.CRITICAL,
      [SecurityEventType.PAYMENT_FRAUD]: AlertSeverity.CRITICAL,
      [SecurityEventType.BOT_DETECTED]: AlertSeverity.MEDIUM,
      [SecurityEventType.DDOS_ATTACK]: AlertSeverity.HIGH,
      [SecurityEventType.PRIVILEGE_ESCALATION]: AlertSeverity.CRITICAL,
      [SecurityEventType.DATA_EXFILTRATION]: AlertSeverity.CRITICAL
    };

    let severity = baseSeverity[type] || AlertSeverity.LOW;

    // Escalate severity based on metadata
    if (metadata.privilegedUser) severity = AlertSeverity.CRITICAL;
    if (metadata.automatedAttack) severity = AlertSeverity.HIGH;
    if (metadata.volumetricAttack && metadata.requestCount > 1000) severity = AlertSeverity.CRITICAL;

    return severity;
  }

  /**
   * Check if event triggers any alert rules
   */
  private async checkAlertRules(event: SecurityEvent): Promise<void> {
    const applicableRules = this.alertRules.filter(
      rule => rule.eventType === event.type && rule.enabled
    );

    for (const rule of applicableRules) {
      const key = this.getEventKey(event.type, event.ipAddress, event.userId);
      const events = this.eventBuffer.get(key) || [];
      
      // Filter events within time window
      const cutoff = new Date(Date.now() - rule.timeWindow * 60000);
      const recentEvents = events.filter(e => e.timestamp >= cutoff);

      if (recentEvents.length >= rule.threshold) {
        await this.triggerAlert(rule, recentEvents);
      }
    }
  }

  /**
   * Trigger alert and execute actions
   */
  private async triggerAlert(rule: AlertRule, events: SecurityEvent[]): Promise<void> {
    const alertKey = `${rule.eventType}:${events[0]?.ipAddress || 'unknown'}`;
    const lastAlert = this.alertHistory.get(alertKey);
    
    // Prevent alert spam (minimum 15 minutes between same alerts)
    if (lastAlert && Date.now() - lastAlert.getTime() < 900000) {
      return;
    }

    this.alertHistory.set(alertKey, new Date());

    const alertData = {
      rule,
      events,
      triggeredAt: new Date(),
      eventCount: events.length
    };

    logger.warn('Security alert triggered', {
      eventType: rule.eventType,
      severity: rule.severity,
      threshold: rule.threshold,
      actualCount: events.length,
      timeWindow: rule.timeWindow
    });

    // Execute alert actions
    for (const action of rule.actions) {
      try {
        await this.executeAlertAction(action, alertData);
      } catch (error) {
        logger.error('Failed to execute alert action', { action, error });
      }
    }

    // Emit alert event
    this.emit('securityAlert', alertData);
  }

  /**
   * Execute alert action
   */
  private async executeAlertAction(
    action: AlertAction, 
    alertData: any
  ): Promise<void> {
    switch (action.type) {
      case 'email':
        await this.sendEmailAlert(alertData, action.config);
        break;
        
      case 'webhook':
        await this.sendWebhookAlert(alertData, action.config);
        break;
        
      case 'block_ip':
        await this.blockIP(alertData, action.config);
        break;
        
      case 'disable_account':
        await this.disableAccount(alertData, action.config);
        break;
        
      case 'log':
        logger.error('SECURITY ALERT', alertData);
        break;
    }
  }

  /**
   * Send email alert
   */
  private async sendEmailAlert(alertData: any, config: any): Promise<void> {
    if (!this.transporter) return;

    const { rule, events, eventCount } = alertData;
    const firstEvent = events[0];

    const subject = `Security Alert: ${rule.eventType} - ${rule.severity.toUpperCase()}`;
    const html = `
      <h2>Security Alert Triggered</h2>
      <p><strong>Event Type:</strong> ${rule.eventType}</p>
      <p><strong>Severity:</strong> ${rule.severity.toUpperCase()}</p>
      <p><strong>Events Count:</strong> ${eventCount}</p>
      <p><strong>Time Window:</strong> ${rule.timeWindow} minutes</p>
      <p><strong>IP Address:</strong> ${firstEvent?.ipAddress || 'Unknown'}</p>
      <p><strong>User Agent:</strong> ${firstEvent?.userAgent || 'Unknown'}</p>
      <p><strong>First Event:</strong> ${firstEvent?.timestamp}</p>
      
      <h3>Recent Events:</h3>
      <ul>
        ${events.slice(0, 10).map((e: SecurityEvent) => 
          `<li>${e.timestamp}: ${e.title} - ${e.description}</li>`
        ).join('')}
      </ul>
      
      <p>Please investigate immediately if this is a critical alert.</p>
    `;

    await this.transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: process.env.SECURITY_EMAIL || process.env.EMAIL_FROM,
      subject,
      html
    });
  }

  /**
   * Send webhook alert
   */
  private async sendWebhookAlert(alertData: any, config: any): Promise<void> {
    if (!config.url) return;

    const response = await fetch(config.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(alertData)
    });

    if (!response.ok) {
      throw new Error(`Webhook failed: ${response.status}`);
    }
  }

  /**
   * Block IP address
   */
  private async blockIP(alertData: any, config: any): Promise<void> {
    const { events } = alertData;
    const ipAddress = events[0]?.ipAddress;
    
    if (!ipAddress) return;

    const duration = config.duration || 3600000; // 1 hour default
    
    await prisma.blockedIP.upsert({
      where: { ipAddress },
      create: {
        ipAddress,
        reason: `Security alert: ${alertData.rule.eventType}`,
        expiresAt: new Date(Date.now() + duration),
        blockCount: 1
      },
      update: {
        blockCount: { increment: 1 },
        expiresAt: new Date(Date.now() + duration),
        reason: `Security alert: ${alertData.rule.eventType}`
      }
    });
  }

  /**
   * Disable user account
   */
  private async disableAccount(alertData: any, config: any): Promise<void> {
    const { events } = alertData;
    const userId = events[0]?.userId;
    
    if (!userId) return;

    await prisma.blockedUser.create({
      data: {
        userId,
        reason: `Security alert: ${alertData.rule.eventType}`,
        blockedAt: new Date()
      }
    });
  }

  /**
   * Get event key for grouping
   */
  private getEventKey(type: SecurityEventType, ipAddress?: string, userId?: string): string {
    return `${type}:${ipAddress || 'unknown'}:${userId || 'anonymous'}`;
  }

  /**
   * Periodic analysis and cleanup
   */
  private startPeriodicAnalysis(): void {
    // Clean up old events every 5 minutes
    setInterval(() => {
      const cutoff = new Date(Date.now() - 3600000); // 1 hour
      
      for (const [key, events] of this.eventBuffer.entries()) {
        const filteredEvents = events.filter(e => e.timestamp >= cutoff);
        
        if (filteredEvents.length === 0) {
          this.eventBuffer.delete(key);
        } else {
          this.eventBuffer.set(key, filteredEvents);
        }
      }
    }, 300000);

    // Generate security reports every hour
    setInterval(async () => {
      await this.generateSecurityReport();
    }, 3600000);
  }

  /**
   * Generate security report
   */
  private async generateSecurityReport(): Promise<void> {
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - 3600000); // Last hour

    const events = await prisma.securityLog.findMany({
      where: {
        timestamp: {
          gte: startTime,
          lte: endTime
        }
      },
      orderBy: { timestamp: 'desc' }
    });

    const report = {
      period: { start: startTime, end: endTime },
      totalEvents: events.length,
      eventsByType: this.groupEventsByType(events),
      topIPs: this.getTopIPs(events),
      criticalEvents: events.filter(e => {
        try {
          const data = JSON.parse(e.data || '{}');
          return data.severity === 'critical';
        } catch {
          return false;
        }
      })
    };

    logger.info('Hourly security report generated', report);
    this.emit('securityReport', report);
  }

  private groupEventsByType(events: any[]): Record<string, number> {
    return events.reduce((acc, event) => {
      acc[event.type] = (acc[event.type] || 0) + 1;
      return acc;
    }, {});
  }

  private getTopIPs(events: any[]): Array<{ ip: string; count: number }> {
    const ipCounts = events.reduce((acc, event) => {
      acc[event.ip] = (acc[event.ip] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(ipCounts)
      .map(([ip, count]) => ({ ip, count: count as number }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  /**
   * Get security metrics
   */
  async getMetrics(hours: number = 24): Promise<any> {
    const startTime = new Date(Date.now() - hours * 3600000);

    const [totalEvents, eventsByType, blockedIPs, blockedUsers] = await Promise.all([
      prisma.securityLog.count({
        where: { timestamp: { gte: startTime } }
      }),
      prisma.securityLog.groupBy({
        by: ['type'],
        where: { timestamp: { gte: startTime } },
        _count: { type: true }
      }),
      prisma.blockedIP.count({
        where: { 
          blockedAt: { gte: startTime },
          expiresAt: { gt: new Date() }
        }
      }),
      prisma.blockedUser.count({
        where: { blockedAt: { gte: startTime } }
      })
    ]);

    return {
      totalEvents,
      eventsByType: eventsByType.reduce((acc: Record<string, number>, item: any) => {
        acc[item.type] = item._count.type;
        return acc;
      }, {}),
      blockedIPs,
      blockedUsers,
      activeAlerts: this.eventBuffer.size
    };
  }
}

// Export singleton instance
export const securityMonitor = new SecurityMonitor();

// Convenience functions
export const recordSecurityEvent = securityMonitor.recordEvent.bind(securityMonitor);

export default securityMonitor;
