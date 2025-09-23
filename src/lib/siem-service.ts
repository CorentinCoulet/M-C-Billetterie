import { PrismaClient } from '../generated/prisma';
import { createHash } from 'crypto';
import { EventEmitter } from 'events';
import { promises as fs } from 'fs';
import path from 'path';
import logger from './logger';

interface SecurityEvent {
  id: string;
  type: 'intrusion' | 'anomaly' | 'breach' | 'compliance' | 'fraud';
  severity: 'low' | 'medium' | 'high' | 'critical';
  source: string;
  timestamp: Date;
  metadata: Record<string, any>;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
}

interface AlertRule {
  id: string;
  name: string;
  type: string;
  condition: (event: SecurityEvent) => boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  threshold?: {
    count: number;
    timeWindow: number; // minutes
  };
  actions: AlertAction[];
  enabled: boolean;
}

interface AlertAction {
  type: 'email' | 'webhook' | 'block_ip' | 'suspend_user' | 'log';
  config: Record<string, any>;
}

interface ThreatIntelligence {
  maliciousIPs: Set<string>;
  suspiciousUserAgents: string[];
  knownAttackPatterns: RegExp[];
  lastUpdated: Date;
}

/**
 * Real-time Security Information and Event Management (SIEM) Service
 * Monitors, analyzes, and responds to security events in real-time
 */
export class SIEMService extends EventEmitter {
  private prisma: PrismaClient;
  private alertRules: Map<string, AlertRule>;
  private eventBuffer: SecurityEvent[];
  private threatIntel: ThreatIntelligence;
  private alertHistory: Map<string, Date>;
  private isRunning: boolean = false;
  
  // Rate limiting for alerts
  private readonly ALERT_COOLDOWN = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_BUFFER_SIZE = 10000;
  private readonly BATCH_PROCESS_INTERVAL = 5000; // 5 seconds

  constructor() {
    super();
    this.prisma = new PrismaClient();
    this.alertRules = new Map();
    this.eventBuffer = [];
    this.alertHistory = new Map();
    this.threatIntel = {
      maliciousIPs: new Set(),
      suspiciousUserAgents: [],
      knownAttackPatterns: [],
      lastUpdated: new Date()
    };
    
    this.initializeDefaultRules();
    this.loadThreatIntelligence();
  }

  /**
   * Start the SIEM service
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    logger.info('SIEM Service starting...');

    // Process events in batches
    setInterval(() => this.processEventBatch(), this.BATCH_PROCESS_INTERVAL);
    
    // Update threat intelligence every hour
    setInterval(() => this.updateThreatIntelligence(), 60 * 60 * 1000);
    
    // Cleanup old events every day
    setInterval(() => this.cleanupOldEvents(), 24 * 60 * 60 * 1000);

    logger.info('SIEM Service started successfully');
  }

  /**
   * Stop the SIEM service
   */
  async stop(): Promise<void> {
    this.isRunning = false;
    await this.processPendingEvents();
    logger.info('SIEM Service stopped');
  }

  /**
   * Log a security event for analysis
   */
  async logSecurityEvent(event: Omit<SecurityEvent, 'id' | 'timestamp'>): Promise<void> {
    const securityEvent: SecurityEvent = {
      ...event,
      id: this.generateEventId(),
      timestamp: new Date()
    };

    // Add to buffer for processing
    this.eventBuffer.push(securityEvent);
    
    // If buffer is too large, process immediately
    if (this.eventBuffer.length >= this.MAX_BUFFER_SIZE) {
      await this.processEventBatch();
    }

    // Emit event for real-time listeners
    this.emit('securityEvent', securityEvent);
    
    // Check for immediate threats
    await this.checkCriticalThreats(securityEvent);
  }

  /**
   * Add or update an alert rule
   */
  addAlertRule(rule: AlertRule): void {
    this.alertRules.set(rule.id, rule);
    logger.info(`Alert rule '${rule.name}' added/updated`);
  }

  /**
   * Remove an alert rule
   */
  removeAlertRule(ruleId: string): void {
    this.alertRules.delete(ruleId);
    logger.info(`Alert rule with ID '${ruleId}' removed`);
  }

  /**
   * Get current threat intelligence summary
   */
  getThreatIntelligence(): ThreatIntelligence {
    return { ...this.threatIntel };
  }

  /**
   * Generate security analytics dashboard data
   */
  async getSecurityAnalytics(timeRange: number = 24): Promise<any> {
    const since = new Date(Date.now() - timeRange * 60 * 60 * 1000);
    
    try {
      const [
        totalEvents,
        eventsByType,
        eventsBySeverity,
        topSourceIPs,
        recentAlerts
      ] = await Promise.all([
        this.prisma.auditLog.count({
          where: { timestamp: { gte: since } }
        }),
        this.prisma.auditLog.groupBy({
          by: ['action'],
          where: { timestamp: { gte: since } },
          _count: true
        }),
        this.prisma.auditLog.groupBy({
          by: ['riskLevel'],
          where: { timestamp: { gte: since } },
          _count: true
        }),
        this.prisma.auditLog.groupBy({
          by: ['ipAddress'],
          where: { timestamp: { gte: since } },
          _count: true,
          orderBy: { _count: { ipAddress: 'desc' } },
          take: 10
        }),
        this.prisma.auditLog.findMany({
          where: { 
            timestamp: { gte: since },
            riskLevel: { in: ['high', 'critical'] }
          },
          orderBy: { timestamp: 'desc' },
          take: 50
        })
      ]);

      return {
        summary: {
          totalEvents,
          timeRange: `${timeRange} hours`,
          generatedAt: new Date()
        },
        distribution: {
          byType: eventsByType,
          bySeverity: eventsBySeverity,
          topSourceIPs: topSourceIPs
        },
        recentHighRiskEvents: recentAlerts,
        threatIntelligence: {
          maliciousIPsCount: this.threatIntel.maliciousIPs.size,
          lastUpdated: this.threatIntel.lastUpdated
        }
      };
    } catch (error) {
      logger.error('Error generating security analytics:', error);
      throw error;
    }
  }

  /**
   * Initialize default security alert rules
   */
  private initializeDefaultRules(): void {
    // Brute force detection
    this.addAlertRule({
      id: 'brute-force-login',
      name: 'Brute Force Login Attempts',
      type: 'intrusion',
      condition: (event) => event.type === 'intrusion' && event.source === 'auth',
      severity: 'high',
      threshold: { count: 5, timeWindow: 15 },
      actions: [
        { type: 'block_ip', config: { duration: 3600 } },
        { type: 'email', config: { template: 'brute-force-alert' } }
      ],
      enabled: true
    });

    // SQL Injection attempts
    this.addAlertRule({
      id: 'sql-injection',
      name: 'SQL Injection Attempt',
      type: 'intrusion',
      condition: (event) => 
        event.metadata?.payload && 
        /(\'|\"|;|--|\bUNION\b|\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b)/i.test(event.metadata.payload),
      severity: 'critical',
      actions: [
        { type: 'block_ip', config: { duration: 7200 } },
        { type: 'email', config: { template: 'sql-injection-alert', immediate: true } }
      ],
      enabled: true
    });

    // Suspicious data access patterns
    this.addAlertRule({
      id: 'data-access-anomaly',
      name: 'Anomalous Data Access Pattern',
      type: 'anomaly',
      condition: (event) => event.type === 'anomaly' && event.severity === 'high',
      severity: 'medium',
      threshold: { count: 10, timeWindow: 60 },
      actions: [
        { type: 'log', config: { level: 'warn' } },
        { type: 'email', config: { template: 'data-access-anomaly' } }
      ],
      enabled: true
    });

    // Payment fraud detection
    this.addAlertRule({
      id: 'payment-fraud',
      name: 'Potential Payment Fraud',
      type: 'fraud',
      condition: (event) => event.type === 'fraud',
      severity: 'critical',
      actions: [
        { type: 'suspend_user', config: {} },
        { type: 'email', config: { template: 'payment-fraud-alert', immediate: true } },
        { type: 'webhook', config: { url: process.env.FRAUD_WEBHOOK_URL } }
      ],
      enabled: true
    });
  }

  /**
   * Load threat intelligence from external sources
   */
  private async loadThreatIntelligence(): Promise<void> {
    try {
      // Load malicious IPs from threat feeds
      const threatFeedUrls = [
        'https://reputation.alienvault.com/reputation.data',
        'https://www.spamhaus.org/drop/drop.txt'
      ];

      for (const url of threatFeedUrls) {
        try {
          // In production, implement actual HTTP requests to threat feeds
          // For now, load from local file if exists
          const localFile = path.join(process.cwd(), 'data', 'threat-intel.json');
          const data = await fs.readFile(localFile, 'utf-8').catch(() => '{"ips": [], "patterns": []}');
          const intel = JSON.parse(data);
          
          intel.ips?.forEach((ip: string) => this.threatIntel.maliciousIPs.add(ip));
          intel.patterns?.forEach((pattern: string) => {
            this.threatIntel.knownAttackPatterns.push(new RegExp(pattern, 'i'));
          });
        } catch (error) {
          logger.warn(`Failed to load threat intel from ${url}:`, error);
        }
      }

      this.threatIntel.lastUpdated = new Date();
      logger.info(`Loaded ${this.threatIntel.maliciousIPs.size} malicious IPs and ${this.threatIntel.knownAttackPatterns.length} attack patterns`);
    } catch (error) {
      logger.error('Error loading threat intelligence:', error);
    }
  }

  /**
   * Update threat intelligence periodically
   */
  private async updateThreatIntelligence(): Promise<void> {
    logger.info('Updating threat intelligence...');
    await this.loadThreatIntelligence();
  }

  /**
   * Process events in batches for efficiency
   */
  private async processEventBatch(): Promise<void> {
    if (this.eventBuffer.length === 0) {
      return;
    }

    const events = this.eventBuffer.splice(0, Math.min(100, this.eventBuffer.length));
    
    try {
      // Store events in database
      await this.storeEvents(events);
      
      // Check each event against alert rules
      for (const event of events) {
        await this.checkAlertRules(event);
      }
      
      // Analyze for patterns
      await this.analyzeEventPatterns(events);
      
    } catch (error) {
      logger.error('Error processing event batch:', error);
    }
  }

  /**
   * Store security events in database
   */
  private async storeEvents(events: SecurityEvent[]): Promise<void> {
    try {
      const auditLogs = events.map(event => ({
        action: `security.${event.type}`,
        resourceType: event.source,
        resourceId: event.metadata?.resourceId || null,
        userId: event.userId || null,
        userEmail: event.metadata?.userEmail || null,
        ipAddress: event.ipAddress || 'unknown',
        userAgent: event.userAgent || null,
        details: JSON.stringify(event.metadata || {}),
        timestamp: event.timestamp,
        sessionId: event.metadata?.sessionId || null,
        result: 'success',
        riskLevel: event.severity,
        eventHash: createHash('sha256').update(JSON.stringify(event)).digest('hex'),
        isSensitive: event.severity === 'critical'
      }));

      await this.prisma.auditLog.createMany({
        data: auditLogs
      });
    } catch (error) {
      logger.error('Error storing security events:', error);
    }
  }

  /**
   * Check events against alert rules
   */
  private async checkAlertRules(event: SecurityEvent): Promise<void> {
    for (const [ruleId, rule] of this.alertRules) {
      if (!rule.enabled || !rule.condition(event)) {
        continue;
      }

      // Check cooldown period
      const lastAlert = this.alertHistory.get(ruleId);
      if (lastAlert && Date.now() - lastAlert.getTime() < this.ALERT_COOLDOWN) {
        continue;
      }

      // Check threshold if defined
      if (rule.threshold) {
        const recentEvents = await this.getRecentEventCount(
          rule.type,
          rule.threshold.timeWindow,
          event.ipAddress
        );
        
        if (recentEvents < rule.threshold.count) {
          continue;
        }
      }

      // Trigger alert
      await this.triggerAlert(rule, event);
      this.alertHistory.set(ruleId, new Date());
    }
  }

  /**
   * Trigger alert actions
   */
  private async triggerAlert(rule: AlertRule, event: SecurityEvent): Promise<void> {
    logger.warn(`Security alert triggered: ${rule.name}`, {
      ruleId: rule.id,
      eventId: event.id,
      severity: rule.severity
    });

    for (const action of rule.actions) {
      try {
        await this.executeAlertAction(action, rule, event);
      } catch (error) {
        logger.error(`Failed to execute alert action ${action.type}:`, error);
      }
    }

    // Emit alert event
    this.emit('securityAlert', {
      rule,
      event,
      timestamp: new Date()
    });
  }

  /**
   * Execute specific alert actions
   */
  private async executeAlertAction(
    action: AlertAction, 
    rule: AlertRule, 
    event: SecurityEvent
  ): Promise<void> {
    switch (action.type) {
      case 'block_ip':
        if (event.ipAddress) {
          await this.blockIP(event.ipAddress, action.config.duration || 3600);
        }
        break;
        
      case 'suspend_user':
        if (event.userId) {
          await this.suspendUser(event.userId);
        }
        break;
        
      case 'email':
        await this.sendAlertEmail(rule, event, action.config);
        break;
        
      case 'webhook':
        await this.callWebhook(action.config.url, { rule, event });
        break;
        
      case 'log':
        const logLevel = action.config.level || 'info';
        if (logLevel in logger) {
          (logger as any)[logLevel](`Security alert: ${rule.name}`, event);
        }
        break;
    }
  }

  /**
   * Check for critical threats requiring immediate action
   */
  private async checkCriticalThreats(event: SecurityEvent): Promise<void> {
    // Check against threat intelligence
    if (event.ipAddress && this.threatIntel.maliciousIPs.has(event.ipAddress)) {
      await this.blockIP(event.ipAddress, 86400); // 24 hours
      logger.warn(`Blocked known malicious IP: ${event.ipAddress}`);
    }

    // Check for known attack patterns
    const payload = JSON.stringify(event.metadata);
    for (const pattern of this.threatIntel.knownAttackPatterns) {
      if (pattern.test(payload)) {
        await this.logSecurityEvent({
          type: 'intrusion',
          severity: 'critical',
          source: 'pattern-detection',
          metadata: { detectedPattern: pattern.source, originalEvent: event.id },
          ipAddress: event.ipAddress
        });
        break;
      }
    }
  }

  /**
   * Block IP address
   */
  private async blockIP(ipAddress: string, duration: number): Promise<void> {
    try {
      const expiresAt = new Date(Date.now() + duration * 1000);
      
      await this.prisma.blockedIP.upsert({
        where: { ipAddress },
        update: {
          expiresAt,
          blockCount: { increment: 1 }
        },
        create: {
          ipAddress,
          reason: 'Automated security block',
          expiresAt,
          blockCount: 1
        }
      });

      logger.info(`IP address blocked: ${ipAddress} until ${expiresAt}`);
    } catch (error) {
      logger.error('Error blocking IP address:', error);
    }
  }

  /**
   * Suspend user account
   */
  private async suspendUser(userId: string): Promise<void> {
    try {
      await this.prisma.blockedUser.create({
        data: {
          userId,
          reason: 'Automated security suspension due to suspicious activity'
        }
      });

      logger.info(`User suspended: ${userId}`);
    } catch (error) {
      logger.error('Error suspending user:', error);
    }
  }

  /**
   * Send alert email
   */
  private async sendAlertEmail(
    rule: AlertRule, 
    event: SecurityEvent, 
    config: any
  ): Promise<void> {
    // Implementation depends on your email service
    logger.info(`Alert email would be sent for rule: ${rule.name}`);
  }

  /**
   * Call webhook for alert
   */
  private async callWebhook(url: string, data: any): Promise<void> {
    // Implementation depends on your webhook requirements
    logger.info(`Webhook would be called: ${url}`);
  }

  /**
   * Get recent events for threat hunting
   */
  async getRecentEvents(hours: number = 1): Promise<SecurityEvent[]> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    try {
      const auditLogs = await this.prisma.auditLog.findMany({
        where: {
          timestamp: { gte: since }
        },
        orderBy: { timestamp: 'desc' },
        take: 1000 // Limit to prevent memory issues
      });

      // Convert audit logs to security events
      return auditLogs.map((log: any) => ({
        id: log.id,
        type: this.mapAuditToSecurityEventType(log.action),
        severity: this.mapRiskLevelToSeverity(log.riskLevel),
        source: 'audit-log',
        timestamp: log.timestamp,
        metadata: {
          action: log.action,
          resourceType: log.resourceType,
          resourceId: log.resourceId,
          result: log.result,
          details: log.details ? JSON.parse(log.details) : null
        },
        userId: log.userId || undefined,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent || undefined
      }));
    } catch (error) {
      logger.error('Failed to get recent events:', error);
      return [];
    }
  }

  /**
   * Map audit log action to security event type
   */
  private mapAuditToSecurityEventType(action: string): SecurityEvent['type'] {
    const actionLower = action.toLowerCase();
    
    if (actionLower.includes('login') || actionLower.includes('auth')) {
      return 'intrusion';
    } else if (actionLower.includes('payment') || actionLower.includes('fraud')) {
      return 'fraud';
    } else if (actionLower.includes('breach') || actionLower.includes('unauthorized')) {
      return 'breach';
    } else if (actionLower.includes('compliance')) {
      return 'compliance';
    } else {
      return 'anomaly';
    }
  }

  /**
   * Map risk level to severity
   */
  private mapRiskLevelToSeverity(riskLevel: string): SecurityEvent['severity'] {
    switch (riskLevel.toLowerCase()) {
      case 'critical': return 'critical';
      case 'high': return 'high';
      case 'medium': return 'medium';
      case 'low': return 'low';
      default: return 'medium';
    }
  }

  /**
   * Get recent event count for threshold checking
   */
  private async getRecentEventCount(
    eventType: string,
    timeWindowMinutes: number,
    ipAddress?: string
  ): Promise<number> {
    const since = new Date(Date.now() - timeWindowMinutes * 60 * 1000);
    
    const where: any = {
      timestamp: { gte: since },
      action: { contains: eventType }
    };

    if (ipAddress) {
      where.ipAddress = ipAddress;
    }

    return await this.prisma.auditLog.count({ where });
  }

  /**
   * Analyze event patterns for anomalies
   */
  private async analyzeEventPatterns(events: SecurityEvent[]): Promise<void> {
    // Implementation of pattern analysis algorithms
    // This could include machine learning models for anomaly detection
    logger.debug(`Analyzed ${events.length} events for patterns`);
  }

  /**
   * Process any pending events before shutdown
   */
  private async processPendingEvents(): Promise<void> {
    while (this.eventBuffer.length > 0) {
      await this.processEventBatch();
    }
  }

  /**
   * Clean up old events to prevent database bloat
   */
  private async cleanupOldEvents(): Promise<void> {
    try {
      const retentionDays = parseInt(process.env.AUDIT_RETENTION_DAYS || '2555');
      const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
      
      const result = await this.prisma.auditLog.deleteMany({
        where: {
          timestamp: { lt: cutoffDate },
          isSensitive: false
        }
      });

      logger.info(`Cleaned up ${result.count} old audit logs`);
    } catch (error) {
      logger.error('Error cleaning up old events:', error);
    }
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Singleton instance
export const siemService = new SIEMService();
export default siemService;
