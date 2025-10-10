import { EventEmitter } from 'events';
import { safeLogger } from '../lib/logger';

/**
 * FREE Security Monitoring Service
 * Real-time security event monitoring without external dependencies
 */

interface SecurityEvent {
  id: string;
  type: 'authentication' | 'authorization' | 'data_access' | 'suspicious_activity' | 'system_event';
  subType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  source: string;
  timestamp: Date;
  details: any;
  userId?: string;
  ip?: string;
  userAgent?: string;
}

interface SecurityAlert {
  id: string;
  events: SecurityEvent[];
  alertType: 'brute_force' | 'data_breach' | 'privilege_escalation' | 'anomaly';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  timestamp: Date;
}

export class FreeSecurityMonitor extends EventEmitter {
  private events: SecurityEvent[] = [];
  private alerts: SecurityAlert[] = [];
  private readonly maxEvents = 10000; // Keep last 10k events in memory
  private readonly alertRules = new Map<string, (events: SecurityEvent[]) => SecurityAlert[]>();

  constructor() {
    super();
    this.initializeAlertRules();
    this.startCleanupInterval();
  }

  /**
   * Record a security event
   */
  recordEvent(event: Omit<SecurityEvent, 'id' | 'timestamp'>): void {
    const securityEvent: SecurityEvent = {
      ...event,
      id: this.generateEventId(),
      timestamp: new Date()
    };

    this.events.push(securityEvent);
    
    // Keep only recent events
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    // Log the event
    safeLogger.info('Security event recorded', {
      eventId: securityEvent.id,
      type: securityEvent.type,
      subType: securityEvent.subType,
      severity: securityEvent.severity,
      source: securityEvent.source
    });

    // Check for alerts
    this.checkAlertRules();

    // Emit event for real-time monitoring
    this.emit('securityEvent', securityEvent);
  }

  /**
   * Initialize alert rules
   */
  private initializeAlertRules(): void {
    // Brute force detection
    this.alertRules.set('brute_force', (events) => {
      const alerts: SecurityAlert[] = [];
      const last5Minutes = Date.now() - 5 * 60 * 1000;
      
      // Group failed login attempts by IP
      const failedLogins = events.filter(e => 
        e.type === 'authentication' &&
        e.subType === 'login_failed' &&
        e.timestamp.getTime() > last5Minutes
      );

      const ipGroups = this.groupBy(failedLogins, 'ip');
      
      for (const [ip, ipEvents] of ipGroups) {
        if (ipEvents.length >= 5) {
          alerts.push({
            id: this.generateAlertId(),
            events: ipEvents,
            alertType: 'brute_force',
            severity: ipEvents.length >= 10 ? 'critical' : 'high',
            description: `Brute force attack detected from IP ${ip}: ${ipEvents.length} failed login attempts in 5 minutes`,
            timestamp: new Date()
          });
        }
      }

      return alerts;
    });

    // Privilege escalation detection
    this.alertRules.set('privilege_escalation', (events) => {
      const alerts: SecurityAlert[] = [];
      const last10Minutes = Date.now() - 10 * 60 * 1000;
      
      const privilegeEvents = events.filter(e =>
        e.type === 'authorization' &&
        (e.subType === 'role_change' || e.subType === 'permission_granted') &&
        e.timestamp.getTime() > last10Minutes
      );

      const userGroups = this.groupBy(privilegeEvents, 'userId');
      
      for (const [userId, userEvents] of userGroups) {
        if (userEvents.length >= 2) {
          alerts.push({
            id: this.generateAlertId(),
            events: userEvents,
            alertType: 'privilege_escalation',
            severity: 'high',
            description: `Potential privilege escalation for user ${userId}: multiple role/permission changes`,
            timestamp: new Date()
          });
        }
      }

      return alerts;
    });

    // Data access anomaly detection
    this.alertRules.set('data_anomaly', (events) => {
      const alerts: SecurityAlert[] = [];
      const last30Minutes = Date.now() - 30 * 60 * 1000;
      
      const dataEvents = events.filter(e =>
        e.type === 'data_access' &&
        e.timestamp.getTime() > last30Minutes
      );

      const userGroups = this.groupBy(dataEvents, 'userId');
      
      for (const [userId, userEvents] of userGroups) {
        if (userEvents.length >= 100) { // Adjust threshold as needed
          alerts.push({
            id: this.generateAlertId(),
            events: userEvents.slice(-10), // Include last 10 events
            alertType: 'anomaly',
            severity: userEvents.length >= 500 ? 'critical' : 'medium',
            description: `Unusual data access pattern for user ${userId}: ${userEvents.length} access events in 30 minutes`,
            timestamp: new Date()
          });
        }
      }

      return alerts;
    });
  }

  /**
   * Check all alert rules
   */
  private checkAlertRules(): void {
    for (const [ruleName, rule] of this.alertRules) {
      try {
        const newAlerts = rule(this.events);
        
        for (const alert of newAlerts) {
          // Avoid duplicate alerts
          const existingAlert = this.alerts.find(a =>
            a.alertType === alert.alertType &&
            a.description === alert.description &&
            Date.now() - a.timestamp.getTime() < 10 * 60 * 1000 // Within 10 minutes
          );

          if (!existingAlert) {
            this.alerts.push(alert);
            this.handleAlert(alert);
          }
        }
      } catch (error) {
        safeLogger.error(`Error in alert rule ${ruleName}:`, error);
      }
    }
  }

  /**
   * Handle security alert
   */
  private handleAlert(alert: SecurityAlert): void {
    safeLogger.error('Security Alert Generated', {
      alertId: alert.id,
      type: alert.alertType,
      severity: alert.severity,
      description: alert.description,
      eventCount: alert.events.length
    });

    // Emit alert for external handling
    this.emit('securityAlert', alert);

    // Auto-response for critical alerts
    if (alert.severity === 'critical') {
      this.handleCriticalAlert(alert);
    }
  }

  /**
   * Handle critical alerts with automatic response
   */
  private handleCriticalAlert(alert: SecurityAlert): void {
    safeLogger.error('CRITICAL SECURITY ALERT', {
      alertId: alert.id,
      type: alert.alertType,
      description: alert.description
    });

    // Implement automatic responses
    switch (alert.alertType) {
      case 'brute_force':
        // Could implement IP blocking here
        this.emit('autoResponse', {
          action: 'block_ip',
          details: { ips: [...new Set(alert.events.map(e => e.ip).filter(Boolean))] }
        });
        break;
        
      case 'data_breach':
        // Could trigger incident response
        this.emit('autoResponse', {
          action: 'incident_response',
          details: { alertId: alert.id, severity: alert.severity }
        });
        break;
    }
  }

  /**
   * Get security dashboard data
   */
  getDashboard() {
    const last24Hours = Date.now() - 24 * 60 * 60 * 1000;
    const recentEvents = this.events.filter(e => e.timestamp.getTime() > last24Hours);
    const recentAlerts = this.alerts.filter(a => a.timestamp.getTime() > last24Hours);

    return {
      summary: {
        totalEvents: recentEvents.length,
        totalAlerts: recentAlerts.length,
        criticalAlerts: recentAlerts.filter(a => a.severity === 'critical').length,
        highAlerts: recentAlerts.filter(a => a.severity === 'high').length
      },
      eventsByType: this.groupAndCount(recentEvents, 'type'),
      eventsBySeverity: this.groupAndCount(recentEvents, 'severity'),
      alertsByType: this.groupAndCount(recentAlerts, 'alertType'),
      topSources: this.getTopSources(recentEvents),
      recentAlerts: recentAlerts.slice(-10).reverse()
    };
  }

  /**
   * Get security metrics for monitoring
   */
  getMetrics() {
    const last1Hour = Date.now() - 60 * 60 * 1000;
    const recentEvents = this.events.filter(e => e.timestamp.getTime() > last1Hour);
    const recentAlerts = this.alerts.filter(a => a.timestamp.getTime() > last1Hour);

    return {
      events_total: recentEvents.length,
      events_by_severity: this.groupAndCount(recentEvents, 'severity'),
      alerts_total: recentAlerts.length,
      alerts_by_severity: this.groupAndCount(recentAlerts, 'severity'),
      failed_logins_total: recentEvents.filter(e => 
        e.type === 'authentication' && e.subType === 'login_failed'
      ).length,
      data_access_events_total: recentEvents.filter(e => e.type === 'data_access').length
    };
  }

  // Utility methods
  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateAlertId(): string {
    return `alrt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private groupBy<T>(array: T[], key: keyof T): Map<any, T[]> {
    const groups = new Map();
    for (const item of array) {
      const value = item[key];
      if (!groups.has(value)) {
        groups.set(value, []);
      }
      groups.get(value).push(item);
    }
    return groups;
  }

  private groupAndCount<T>(array: T[], key: keyof T): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const item of array) {
      const value = String(item[key]);
      counts[value] = (counts[value] || 0) + 1;
    }
    return counts;
  }

  private getTopSources(events: SecurityEvent[]): Array<{source: string, count: number}> {
    const sourceCounts = this.groupAndCount(events, 'source');
    return Object.entries(sourceCounts)
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  private startCleanupInterval(): void {
    // Clean up old alerts every hour
    setInterval(() => {
      const cutoff = Date.now() - 24 * 60 * 60 * 1000; // 24 hours
      this.alerts = this.alerts.filter(a => a.timestamp.getTime() > cutoff);
    }, 60 * 60 * 1000);
  }
}

// Singleton instance
export const freeSecurityMonitor = new FreeSecurityMonitor();

// Convenience functions for common security events
export const SecurityEvents = {
  loginFailed: (ip: string, email: string, userAgent?: string) => {
    freeSecurityMonitor.recordEvent({
      type: 'authentication',
      subType: 'login_failed',
      severity: 'medium',
      source: 'auth_service',
      ip,
      userAgent,
      details: { email, attempt_time: new Date() }
    });
  },

  loginSuccess: (userId: string, ip: string, userAgent?: string) => {
    freeSecurityMonitor.recordEvent({
      type: 'authentication',
      subType: 'login_success',
      severity: 'low',
      source: 'auth_service',
      userId,
      ip,
      userAgent,
      details: { login_time: new Date() }
    });
  },

  dataAccess: (userId: string, resource: string, action: string) => {
    freeSecurityMonitor.recordEvent({
      type: 'data_access',
      subType: action,
      severity: 'low',
      source: 'api',
      userId,
      details: { resource, action, timestamp: new Date() }
    });
  },

  suspiciousActivity: (source: string, description: string, details: any) => {
    freeSecurityMonitor.recordEvent({
      type: 'suspicious_activity',
      subType: 'anomaly_detected',
      severity: 'high',
      source,
      details: { description, ...details }
    });
  }
};
