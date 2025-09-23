/**
 * Advanced Alerting Service
 * Handles comprehensive security and operational alerts
 */

import cron from 'node-cron';
import nodemailer from 'nodemailer';
import { AuditService } from './audit-service';
import { logger } from './logger';

interface Alert {
  id: string;
  type: 'security' | 'operational' | 'business' | 'performance';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  details: Record<string, any>;
  timestamp: Date;
  source: string;
  resolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
}

interface AlertRule {
  id: string;
  name: string;
  type: Alert['type'];
  severity: Alert['severity'];
  condition: (data: any) => boolean;
  threshold?: number;
  windowMs?: number;
  enabled: boolean;
  cooldownMs: number;
  lastTriggered?: Date;
  notifications: NotificationChannel[];
}

interface NotificationChannel {
  type: 'email' | 'slack' | 'webhook' | 'sms' | 'discord';
  config: Record<string, any>;
  enabled: boolean;
}

class AlertingService {
  private alerts: Map<string, Alert> = new Map();
  private rules: Map<string, AlertRule> = new Map();
  private metrics: Map<string, any[]> = new Map();
  private emailTransporter: nodemailer.Transporter | null = null;

  constructor() {
    this.initializeEmailTransporter();
    this.initializeDefaultRules();
    this.startMonitoring();
  }

  private initializeEmailTransporter(): void {
    try {
      if (process.env.SMTP_HOST) {
        this.emailTransporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          }
        });
      }
    } catch (error) {
      logger.error('Failed to initialize email transporter:', error);
    }
  }

  private initializeDefaultRules(): void {
    // Security Rules
    this.addRule({
      id: 'failed_login_attempts',
      name: 'High Failed Login Attempts',
      type: 'security',
      severity: 'high',
      condition: (data) => data.failedLogins > 10,
      threshold: 10,
      windowMs: 15 * 60 * 1000, // 15 minutes
      enabled: true,
      cooldownMs: 30 * 60 * 1000, // 30 minutes
      notifications: [
        { type: 'email', config: { recipients: ['admin@billetterie.com'] }, enabled: true }
      ]
    });

    this.addRule({
      id: 'suspicious_payment_activity',
      name: 'Suspicious Payment Activity',
      type: 'security',
      severity: 'critical',
      condition: (data) => data.failedPayments > 5 && data.uniqueIPs > 3,
      threshold: 5,
      windowMs: 10 * 60 * 1000, // 10 minutes
      enabled: true,
      cooldownMs: 60 * 60 * 1000, // 1 hour
      notifications: [
        { type: 'email', config: { recipients: ['security@billetterie.com'] }, enabled: true },
        { type: 'slack', config: { webhook: process.env.SLACK_WEBHOOK_URL }, enabled: true }
      ]
    });

    this.addRule({
      id: 'admin_account_compromise',
      name: 'Potential Admin Account Compromise',
      type: 'security',
      severity: 'critical',
      condition: (data) => data.adminFailedLogins > 3,
      threshold: 3,
      windowMs: 5 * 60 * 1000, // 5 minutes
      enabled: true,
      cooldownMs: 15 * 60 * 1000, // 15 minutes
      notifications: [
        { type: 'email', config: { recipients: ['security@billetterie.com', 'admin@billetterie.com'] }, enabled: true }
      ]
    });

    // Operational Rules
    this.addRule({
      id: 'high_error_rate',
      name: 'High Application Error Rate',
      type: 'operational',
      severity: 'high',
      condition: (data) => data.errorRate > 0.05, // 5%
      threshold: 0.05,
      windowMs: 5 * 60 * 1000, // 5 minutes
      enabled: true,
      cooldownMs: 15 * 60 * 1000,
      notifications: [
        { type: 'email', config: { recipients: ['ops@billetterie.com'] }, enabled: true }
      ]
    });

    this.addRule({
      id: 'database_connection_failures',
      name: 'Database Connection Issues',
      type: 'operational',
      severity: 'critical',
      condition: (data) => data.dbConnectionFailures > 5,
      threshold: 5,
      windowMs: 2 * 60 * 1000, // 2 minutes
      enabled: true,
      cooldownMs: 10 * 60 * 1000,
      notifications: [
        { type: 'email', config: { recipients: ['ops@billetterie.com', 'dba@billetterie.com'] }, enabled: true }
      ]
    });

    // Business Rules
    this.addRule({
      id: 'revenue_drop',
      name: 'Significant Revenue Drop',
      type: 'business',
      severity: 'high',
      condition: (data) => data.revenueDropPercentage > 30,
      threshold: 30,
      windowMs: 60 * 60 * 1000, // 1 hour
      enabled: true,
      cooldownMs: 4 * 60 * 60 * 1000, // 4 hours
      notifications: [
        { type: 'email', config: { recipients: ['finance@billetterie.com', 'management@billetterie.com'] }, enabled: true }
      ]
    });

    // Performance Rules
    this.addRule({
      id: 'slow_response_times',
      name: 'Slow API Response Times',
      type: 'performance',
      severity: 'medium',
      condition: (data) => data.averageResponseTime > 2000, // 2 seconds
      threshold: 2000,
      windowMs: 10 * 60 * 1000, // 10 minutes
      enabled: true,
      cooldownMs: 30 * 60 * 1000,
      notifications: [
        { type: 'email', config: { recipients: ['dev@billetterie.com'] }, enabled: true }
      ]
    });

    logger.info(`Initialized ${this.rules.size} alert rules`);
  }

  private startMonitoring(): void {
    // Check alert rules every minute
    cron.schedule('* * * * *', async () => {
      await this.checkAlertRules();
    });

    // Cleanup old metrics every hour
    cron.schedule('0 * * * *', () => {
      this.cleanupOldMetrics();
    });

    logger.info('Alert monitoring started');
  }

  async recordMetric(key: string, value: any, metadata?: Record<string, any>): Promise<void> {
    const timestamp = new Date();
    
    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }

    const metric = {
      value,
      timestamp,
      metadata: metadata || {}
    };

    this.metrics.get(key)!.push(metric);

    // Immediately check if this triggers any alerts
    await this.checkAlertRulesForMetric(key, value, metadata);
  }

  private async checkAlertRules(): Promise<void> {
    for (const rule of this.rules.values()) {
      if (!rule.enabled) continue;

      try {
        // Check cooldown
        if (rule.lastTriggered && 
            Date.now() - rule.lastTriggered.getTime() < rule.cooldownMs) {
          continue;
        }

        const data = this.aggregateMetricsForRule(rule);
        
        if (rule.condition(data)) {
          await this.triggerAlert(rule, data);
        }
      } catch (error) {
        logger.error(`Error checking alert rule ${rule.id}:`, error);
      }
    }
  }

  private async checkAlertRulesForMetric(key: string, value: any, metadata?: Record<string, any>): Promise<void> {
    for (const rule of this.rules.values()) {
      if (!rule.enabled) continue;

      // Simple immediate checks for specific metrics
      try {
        let shouldTrigger = false;
        let alertData = { [key]: value, ...metadata };

        switch (key) {
          case 'failed_login':
            if (rule.id === 'failed_login_attempts') {
              const recentFailures = this.getRecentMetrics('failed_login', rule.windowMs || 15 * 60 * 1000);
              if (recentFailures.length > (rule.threshold || 10)) {
                shouldTrigger = true;
                alertData = { failedLogins: recentFailures.length };
              }
            }
            break;

          case 'admin_failed_login':
            if (rule.id === 'admin_account_compromise') {
              const recentFailures = this.getRecentMetrics('admin_failed_login', rule.windowMs || 5 * 60 * 1000);
              if (recentFailures.length > (rule.threshold || 3)) {
                shouldTrigger = true;
                alertData = { adminFailedLogins: recentFailures.length };
              }
            }
            break;

          case 'payment_failure':
            if (rule.id === 'suspicious_payment_activity') {
              const recentFailures = this.getRecentMetrics('payment_failure', rule.windowMs || 10 * 60 * 1000);
              const uniqueIPs = new Set(recentFailures.map(m => m.metadata?.ip)).size;
              if (recentFailures.length > (rule.threshold || 5) && uniqueIPs > 3) {
                shouldTrigger = true;
                alertData = { failedPayments: recentFailures.length, uniqueIPs };
              }
            }
            break;
        }

        if (shouldTrigger) {
          await this.triggerAlert(rule, alertData);
        }
      } catch (error) {
        logger.error(`Error checking immediate alert for ${key}:`, error);
      }
    }
  }

  private getRecentMetrics(key: string, windowMs: number): any[] {
    const metrics = this.metrics.get(key) || [];
    const cutoff = new Date(Date.now() - windowMs);
    return metrics.filter(m => m.timestamp > cutoff);
  }

  private aggregateMetricsForRule(rule: AlertRule): Record<string, any> {
    const now = Date.now();
    const windowStart = now - (rule.windowMs || 60 * 60 * 1000);
    
    const data: Record<string, any> = {};

    // Aggregate metrics based on rule type
    for (const [key, metrics] of this.metrics.entries()) {
      const recentMetrics = metrics.filter(m => m.timestamp.getTime() > windowStart);
      
      switch (key) {
        case 'failed_login':
          data.failedLogins = recentMetrics.length;
          break;
        case 'admin_failed_login':
          data.adminFailedLogins = recentMetrics.length;
          break;
        case 'payment_failure':
          data.failedPayments = recentMetrics.length;
          data.uniqueIPs = new Set(recentMetrics.map(m => m.metadata?.ip)).size;
          break;
        case 'error':
          const totalRequests = (this.metrics.get('request') || []).filter(m => m.timestamp.getTime() > windowStart).length;
          data.errorRate = totalRequests > 0 ? recentMetrics.length / totalRequests : 0;
          break;
        case 'response_time':
          if (recentMetrics.length > 0) {
            data.averageResponseTime = recentMetrics.reduce((sum, m) => sum + m.value, 0) / recentMetrics.length;
          }
          break;
        case 'db_connection_failure':
          data.dbConnectionFailures = recentMetrics.length;
          break;
        case 'revenue':
          // Calculate revenue drop percentage
          const currentHourRevenue = recentMetrics.reduce((sum, m) => sum + m.value, 0);
          const previousHourRevenue = metrics
            .filter(m => m.timestamp.getTime() > windowStart - (rule.windowMs || 60 * 60 * 1000) && 
                        m.timestamp.getTime() <= windowStart)
            .reduce((sum, m) => sum + m.value, 0);
          
          if (previousHourRevenue > 0) {
            data.revenueDropPercentage = ((previousHourRevenue - currentHourRevenue) / previousHourRevenue) * 100;
          }
          break;
      }
    }

    return data;
  }

  private async triggerAlert(rule: AlertRule, data: Record<string, any>): Promise<void> {
    const alert: Alert = {
      id: `${rule.id}_${Date.now()}`,
      type: rule.type,
      severity: rule.severity,
      title: rule.name,
      message: this.generateAlertMessage(rule, data),
      details: data,
      timestamp: new Date(),
      source: 'alerting-service',
      resolved: false
    };

    this.alerts.set(alert.id, alert);
    rule.lastTriggered = new Date();

    logger.warn(`Alert triggered: ${alert.title}`, { alertId: alert.id, details: alert.details });

    // Send notifications
    await this.sendNotifications(alert, rule.notifications);

    // Log to audit system
    await AuditService.logEvent({
      action: 'alert.triggered',
      resourceType: 'system',
      resourceId: alert.id,
      ipAddress: 'system',
      details: {
        alertType: alert.type,
        severity: alert.severity,
        rule: rule.name,
        data: alert.details
      },
      result: 'success',
      riskLevel: alert.severity === 'critical' ? 'critical' : 'high'
    });
  }

  private generateAlertMessage(rule: AlertRule, data: Record<string, any>): string {
    switch (rule.id) {
      case 'failed_login_attempts':
        return `${data.failedLogins} failed login attempts detected in the last ${rule.windowMs! / 60000} minutes. This may indicate a brute force attack.`;
      
      case 'suspicious_payment_activity':
        return `${data.failedPayments} failed payments from ${data.uniqueIPs} unique IP addresses detected. Possible payment fraud attempt.`;
      
      case 'admin_account_compromise':
        return `${data.adminFailedLogins} failed admin login attempts detected. Possible account compromise attempt.`;
      
      case 'high_error_rate':
        return `Application error rate is ${(data.errorRate * 100).toFixed(2)}%, exceeding the threshold of ${(rule.threshold! * 100)}%.`;
      
      case 'database_connection_failures':
        return `${data.dbConnectionFailures} database connection failures detected in ${rule.windowMs! / 60000} minutes.`;
      
      case 'revenue_drop':
        return `Revenue has dropped by ${data.revenueDropPercentage.toFixed(2)}% compared to the previous period.`;
      
      case 'slow_response_times':
        return `Average API response time is ${data.averageResponseTime}ms, exceeding the threshold of ${rule.threshold}ms.`;
      
      default:
        return `Alert condition met: ${JSON.stringify(data)}`;
    }
  }

  private async sendNotifications(alert: Alert, channels: NotificationChannel[]): Promise<void> {
    for (const channel of channels) {
      if (!channel.enabled) continue;

      try {
        switch (channel.type) {
          case 'email':
            await this.sendEmailNotification(alert, channel.config);
            break;
          case 'slack':
            await this.sendSlackNotification(alert, channel.config);
            break;
          case 'webhook':
            await this.sendWebhookNotification(alert, channel.config);
            break;
          default:
            logger.warn(`Unsupported notification channel: ${channel.type}`);
        }
      } catch (error) {
        logger.error(`Failed to send ${channel.type} notification:`, error);
      }
    }
  }

  private async sendEmailNotification(alert: Alert, config: any): Promise<void> {
    if (!this.emailTransporter) {
      logger.warn('Email transporter not configured');
      return;
    }

    const subject = `[${alert.severity.toUpperCase()}] ${alert.title}`;
    const html = `
      <h2>Alert: ${alert.title}</h2>
      <p><strong>Severity:</strong> ${alert.severity}</p>
      <p><strong>Type:</strong> ${alert.type}</p>
      <p><strong>Time:</strong> ${alert.timestamp.toISOString()}</p>
      <p><strong>Message:</strong> ${alert.message}</p>
      <h3>Details:</h3>
      <pre>${JSON.stringify(alert.details, null, 2)}</pre>
      <p>Alert ID: ${alert.id}</p>
    `;

    await this.emailTransporter.sendMail({
      from: process.env.SMTP_FROM || 'alerts@billetterie.com',
      to: config.recipients.join(', '),
      subject,
      html
    });
  }

  private async sendSlackNotification(alert: Alert, config: any): Promise<void> {
    if (!config.webhook) return;

    const color = {
      low: 'good',
      medium: 'warning',
      high: 'danger',
      critical: 'danger'
    }[alert.severity];

    const payload = {
      text: `Alert: ${alert.title}`,
      attachments: [{
        color,
        fields: [
          { title: 'Severity', value: alert.severity, short: true },
          { title: 'Type', value: alert.type, short: true },
          { title: 'Time', value: alert.timestamp.toISOString(), short: false },
          { title: 'Message', value: alert.message, short: false },
          { title: 'Details', value: `\`\`\`${JSON.stringify(alert.details, null, 2)}\`\`\``, short: false }
        ],
        footer: `Alert ID: ${alert.id}`
      }]
    };

    const response = await fetch(config.webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Slack webhook failed: ${response.statusText}`);
    }
  }

  private async sendWebhookNotification(alert: Alert, config: any): Promise<void> {
    const response = await fetch(config.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...config.headers
      },
      body: JSON.stringify(alert)
    });

    if (!response.ok) {
      throw new Error(`Webhook failed: ${response.statusText}`);
    }
  }

  private cleanupOldMetrics(): void {
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    const cutoff = new Date(Date.now() - maxAge);

    for (const [key, metrics] of this.metrics.entries()) {
      const filtered = metrics.filter(m => m.timestamp > cutoff);
      this.metrics.set(key, filtered);
    }
  }

  // Public API methods

  addRule(rule: AlertRule): void {
    this.rules.set(rule.id, rule);
    logger.info(`Added alert rule: ${rule.name}`);
  }

  removeRule(ruleId: string): boolean {
    const removed = this.rules.delete(ruleId);
    if (removed) {
      logger.info(`Removed alert rule: ${ruleId}`);
    }
    return removed;
  }

  async resolveAlert(alertId: string, resolvedBy: string): Promise<boolean> {
    const alert = this.alerts.get(alertId);
    if (!alert || alert.resolved) {
      return false;
    }

    alert.resolved = true;
    alert.resolvedAt = new Date();
    alert.resolvedBy = resolvedBy;

    await AuditService.logEvent({
      action: 'alert.resolved',
      resourceType: 'system',
      resourceId: alertId,
      userId: resolvedBy,
      ipAddress: 'system',
      details: { alertType: alert.type, severity: alert.severity },
      result: 'success',
      riskLevel: 'low'
    });

    logger.info(`Alert resolved: ${alertId} by ${resolvedBy}`);
    return true;
  }

  getActiveAlerts(): Alert[] {
    return Array.from(this.alerts.values()).filter(alert => !alert.resolved);
  }

  getAlertHistory(limit: number = 100): Alert[] {
    return Array.from(this.alerts.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  getRules(): AlertRule[] {
    return Array.from(this.rules.values());
  }

  getMetrics(): Record<string, any[]> {
    return Object.fromEntries(this.metrics.entries());
  }
}

export const alertingService = new AlertingService();
