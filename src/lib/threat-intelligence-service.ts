/**
 * Threat Intelligence and Indicators of Compromise (IOC) Service
 * Real-time threat detection and automated response
 */

import { EventEmitter } from 'events';
import { incidentResponseService } from './incident-response-service';
import { safeLogger } from './logger';
import { siemService } from './siem-service';

export interface ThreatIndicator {
  id: string;
  type: 'ip' | 'domain' | 'url' | 'hash' | 'email' | 'user_agent' | 'signature';
  value: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number; // 0-100
  source: string;
  description: string;
  tags: string[];
  firstSeen: Date;
  lastSeen: Date;
  isActive: boolean;
  ttl: number; // Time to live in hours
}

export interface ThreatIntelFeed {
  name: string;
  url: string;
  type: 'json' | 'xml' | 'csv' | 'txt';
  updateInterval: number; // in minutes
  enabled: boolean;
  lastUpdate: Date;
  apiKey?: string;
}

export interface ThreatMatch {
  indicatorId: string;
  matchedValue: string;
  sourceIp: string;
  timestamp: Date;
  context: any;
  riskScore: number;
  blocked: boolean;
}

export class ThreatIntelligenceService extends EventEmitter {
  private indicators = new Map<string, ThreatIndicator>();
  private feeds: ThreatIntelFeed[] = [];
  private matchCache = new Map<string, ThreatMatch[]>();
  
  constructor() {
    super();
    this.initializeDefaultFeeds();
    this.startFeedUpdates();
    this.startThreatHunting();
  }

  /**
   * Initialize threat intelligence feeds
   */
  private initializeDefaultFeeds(): void {
    this.feeds = [
      {
        name: 'MISP Threat Feed',
        url: 'https://misp.company.com/events/json',
        type: 'json',
        updateInterval: 60, // 1 hour
        enabled: true,
        lastUpdate: new Date(0),
        apiKey: process.env.MISP_API_KEY
      },
      {
        name: 'Abuse.ch Malware Hashes',
        url: 'https://malware-bazaar.abuse.ch/export/json/recent/',
        type: 'json',
        updateInterval: 30, // 30 minutes
        enabled: true,
        lastUpdate: new Date(0)
      },
      {
        name: 'URLVoid Malicious URLs',
        url: 'https://www.urlvoid.com/api1000/host/',
        type: 'json',
        updateInterval: 120, // 2 hours
        enabled: true,
        lastUpdate: new Date(0),
        apiKey: process.env.URLVOID_API_KEY
      },
      {
        name: 'Tor Exit Nodes',
        url: 'https://check.torproject.org/torbulkexitlist',
        type: 'txt',
        updateInterval: 360, // 6 hours
        enabled: true,
        lastUpdate: new Date(0)
      },
      {
        name: 'Spamhaus DROP List',
        url: 'https://www.spamhaus.org/drop/drop.txt',
        type: 'txt',
        updateInterval: 1440, // 24 hours
        enabled: true,
        lastUpdate: new Date(0)
      }
    ];
  }

  /**
   * Start automatic feed updates
   */
  private startFeedUpdates(): void {
    setInterval(async () => {
      for (const feed of this.feeds) {
        if (feed.enabled && this.shouldUpdateFeed(feed)) {
          try {
            await this.updateThreatFeed(feed);
          } catch (error) {
            safeLogger.error(`Failed to update threat feed ${feed.name}`, { error, feedName: feed.name });
          }
        }
      }
    }, 5 * 60 * 1000); // Check every 5 minutes
  }

  /**
   * Start proactive threat hunting
   */
  private startThreatHunting(): void {
    setInterval(async () => {
      await this.performThreatHunting();
    }, 15 * 60 * 1000); // Every 15 minutes
  }

  /**
   * Update threat intelligence feed
   */
  private async updateThreatFeed(feed: ThreatIntelFeed): Promise<void> {
    safeLogger.info(`Updating threat feed: ${feed.name}`);
    
    try {
      const headers: Record<string, string> = {
        'User-Agent': 'M&C-Billetterie-ThreatIntel/1.0'
      };
      
      if (feed.apiKey) {
        headers['Authorization'] = `Bearer ${feed.apiKey}`;
      }

      const response = await fetch(feed.url, { headers });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await this.parseFeedData(response, feed.type);
      const newIndicators = await this.extractIndicators(data, feed.name);
      
      // Update indicators
      for (const indicator of newIndicators) {
        this.indicators.set(indicator.id, indicator);
      }

      feed.lastUpdate = new Date();
      
      safeLogger.info(`Updated ${newIndicators.length} indicators from ${feed.name}`);
      this.emit('feedUpdated', { feed: feed.name, indicators: newIndicators.length });
      
    } catch (error) {
      safeLogger.error(`Failed to update feed ${feed.name}`, { error, feedName: feed.name });
      this.emit('feedError', { feed: feed.name, error });
    }
  }

  /**
   * Parse feed data based on type
   */
  private async parseFeedData(response: Response, type: string): Promise<any> {
    switch (type) {
      case 'json':
        return await response.json();
      case 'xml':
        const xmlText = await response.text();
        // Parse XML (implement XML parser)
        return xmlText;
      case 'csv':
        const csvText = await response.text();
        return this.parseCSV(csvText);
      case 'txt':
        return await response.text();
      default:
        throw new Error(`Unsupported feed type: ${type}`);
    }
  }

  /**
   * Extract indicators from feed data
   */
  private async extractIndicators(data: any, source: string): Promise<ThreatIndicator[]> {
    const indicators: ThreatIndicator[] = [];
    
    try {
      if (source.includes('MISP')) {
        // Parse MISP format
        indicators.push(...this.parseMISPData(data, source));
      } else if (source.includes('Abuse.ch')) {
        // Parse Abuse.ch format
        const abuseCHData = await this.parseAbuseCHData(data, source);
        indicators.push(...abuseCHData);
      } else if (source.includes('Tor')) {
        // Parse Tor exit nodes
        indicators.push(...this.parseTorExitNodes(data, source));
      } else if (source.includes('Spamhaus')) {
        // Parse Spamhaus DROP list
        const spamhausData = await this.parseSpamhausDROP(data, source);
        indicators.push(...spamhausData);
    }
  } catch (error) {
    safeLogger.error(`Failed to extract indicators from ${source}`, { error, source });
  }
  
  return indicators;
}  /**
   * Parse MISP threat intelligence format
   */
  private parseMISPData(data: any, source: string): ThreatIndicator[] {
    const indicators: ThreatIndicator[] = [];
    
    if (data.response && Array.isArray(data.response)) {
      for (const event of data.response) {
        if (event.Event && event.Event.Attribute) {
          for (const attr of event.Event.Attribute) {
            const indicator: ThreatIndicator = {
              id: `misp-${attr.uuid || Date.now()}`,
              type: this.mapMISPTypeToIOCType(attr.type),
              value: attr.value,
              severity: this.mapMISPThreatLevelToSeverity(event.Event.threat_level_id),
              confidence: 85, // High confidence for MISP
              source,
              description: attr.comment || event.Event.info,
              tags: event.Event.Tag?.map((t: any) => t.name) || [],
              firstSeen: new Date(attr.timestamp * 1000),
              lastSeen: new Date(),
              isActive: true,
              ttl: 168 // 7 days
            };
            indicators.push(indicator);
          }
        }
      }
    }
    
    return indicators;
  }

  /**
   * Parse Tor exit nodes list
   */
  private parseTorExitNodes(data: string, source: string): ThreatIndicator[] {
    const indicators: ThreatIndicator[] = [];
    const lines = data.split('\n');
    
    for (const line of lines) {
      const ip = line.trim();
      if (this.isValidIP(ip)) {
        indicators.push({
          id: `tor-${ip}`,
          type: 'ip',
          value: ip,
          severity: 'medium',
          confidence: 95,
          source,
          description: 'Tor exit node',
          tags: ['tor', 'anonymity', 'proxy'],
          firstSeen: new Date(),
          lastSeen: new Date(),
          isActive: true,
          ttl: 24 // 24 hours
        });
      }
    }
    
    return indicators;
  }

  /**
   * Real-time threat matching
   */
  async checkThreatIndicators(
    value: string, 
    type: ThreatIndicator['type'], 
    context: any = {}
  ): Promise<ThreatMatch | null> {
    // Check against all active indicators
    for (const [id, indicator] of this.indicators) {
      if (indicator.type === type && indicator.isActive && this.matchesIndicator(value, indicator)) {
        const match: ThreatMatch = {
          indicatorId: id,
          matchedValue: value,
          sourceIp: context.sourceIp || 'unknown',
          timestamp: new Date(),
          context,
          riskScore: this.calculateRiskScore(indicator),
          blocked: false
        };

        // Auto-block critical threats
        if (indicator.severity === 'critical' && indicator.confidence > 80) {
          match.blocked = true;
          await this.blockThreat(match);
        }

        // Store match
        const matches = this.matchCache.get(value) || [];
        matches.push(match);
        this.matchCache.set(value, matches);

      // Emit threat detected event
      this.emit('threatDetected', { indicator, match });
      
      // Log the threat
      safeLogger.warn('Threat indicator matched', {
        indicator: indicator.id,
        value,
        severity: indicator.severity,
        confidence: indicator.confidence
      });        return match;
      }
    }

    return null;
  }

  /**
   * Proactive threat hunting
   */
  private async performThreatHunting(): Promise<void> {
    safeLogger.info('Starting threat hunting cycle');
    
    try {
      // Hunt for indicators in recent logs
      const recentEvents = await siemService.getRecentEvents(1); // Last hour
      
      for (const event of recentEvents) {
        await this.huntInEvent(event);
      }
      
      // Hunt for behavioral anomalies
      await this.huntBehavioralAnomalies();
      
    // Hunt for compromised accounts
    await this.huntCompromisedAccounts();
    
  } catch (error) {
    safeLogger.error('Threat hunting failed', { error });
  }
}  /**
   * Hunt for threats in specific event
   */
  private async huntInEvent(event: any): Promise<void> {
    const huntTargets = [
      { value: event.sourceIp, type: 'ip' as const },
      { value: event.userAgent, type: 'user_agent' as const },
      { value: event.referer, type: 'url' as const }
    ];

    for (const target of huntTargets) {
      if (target.value) {
        const match = await this.checkThreatIndicators(target.value, target.type, event);
        if (match) {
          await this.escalateThreatMatch(match, event);
        }
      }
    }
  }

  /**
   * Hunt for behavioral anomalies
   */
  private async huntBehavioralAnomalies(): Promise<void> {
    // Detect unusual login patterns
    const suspiciousLogins = await this.detectSuspiciousLogins();
    
    // Detect data exfiltration patterns
    const dataExfiltration = await this.detectDataExfiltration();
    
    // Detect privilege escalation attempts
    const privEscalation = await this.detectPrivilegeEscalation();
    
    const anomalies = [...suspiciousLogins, ...dataExfiltration, ...privEscalation];
    
    for (const anomaly of anomalies) {
      await this.createBehavioralThreat(anomaly);
    }
  }

  /**
   * Block threat automatically
   */
  private async blockThreat(match: ThreatMatch): Promise<void> {
    safeLogger.warn(`Auto-blocking threat: ${match.indicatorId}`);
    
    // Add to firewall blacklist
    await this.addToFirewallBlacklist(match.sourceIp);
    
    // Create incident
    await incidentResponseService.detectIncident(
      'unauthorized_access',
      'high',
      {
        sourceIp: match.sourceIp,
        threatIndicator: match.indicatorId,
        autoBlocked: true,
        context: match.context
      }
    );
    
    this.emit('threatBlocked', match);
  }

  /**
   * Escalate threat match to incident
   */
  private async escalateThreatMatch(match: ThreatMatch, event: any): Promise<void> {
    const indicator = this.indicators.get(match.indicatorId);
    if (!indicator) return;

    if (indicator.severity === 'high' || indicator.severity === 'critical') {
      await incidentResponseService.detectIncident(
        'unauthorized_access',
        indicator.severity,
        {
          sourceIp: match.sourceIp,
          threatIndicator: match.indicatorId,
          event,
          context: match.context
        }
      );
    }
  }

  /**
   * Calculate risk score for indicator
   */
  private calculateRiskScore(indicator: ThreatIndicator): number {
    const severityWeights = { low: 25, medium: 50, high: 75, critical: 100 };
    const severityScore = severityWeights[indicator.severity];
    const confidenceScore = indicator.confidence;
    
    // Weighted average
    return Math.round((severityScore * 0.6) + (confidenceScore * 0.4));
  }

  /**
   * Helper methods
   */
  private shouldUpdateFeed(feed: ThreatIntelFeed): boolean {
    const timeSinceLastUpdate = Date.now() - feed.lastUpdate.getTime();
    const updateInterval = feed.updateInterval * 60 * 1000; // Convert to ms
    return timeSinceLastUpdate >= updateInterval;
  }

  private matchesIndicator(value: string, indicator: ThreatIndicator): boolean {
    // Exact match for most types
    if (indicator.type !== 'signature') {
      return value.toLowerCase() === indicator.value.toLowerCase();
    }
    
    // Regex match for signatures
    try {
      const regex = new RegExp(indicator.value, 'i');
      return regex.test(value);
    } catch {
      return false;
    }
  }

  private isValidIP(ip: string): boolean {
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipRegex.test(ip);
  }

  private mapMISPTypeToIOCType(mispType: string): ThreatIndicator['type'] {
    const typeMap: { [key: string]: ThreatIndicator['type'] } = {
      'ip-src': 'ip',
      'ip-dst': 'ip',
      'domain': 'domain',
      'url': 'url',
      'md5': 'hash',
      'sha1': 'hash',
      'sha256': 'hash',
      'email-src': 'email',
      'user-agent': 'user_agent'
    };
    return typeMap[mispType] || 'signature';
  }

  private mapMISPThreatLevelToSeverity(threatLevel: number): ThreatIndicator['severity'] {
    const levelMap: { [key: number]: ThreatIndicator['severity'] } = {
      1: 'high',
      2: 'medium',
      3: 'low',
      4: 'low'
    };
    return levelMap[threatLevel] || 'medium';
  }

  private parseCSV(csv: string): any[] {
    const lines = csv.split('\n');
    const headers = lines[0].split(',');
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      const obj: any = {};
      headers.forEach((header, index) => {
        obj[header.trim()] = values[index]?.trim();
      });
      data.push(obj);
    }
    
    return data;
  }

  // Placeholder implementations for additional hunting methods
  private async parseAbuseCHData(data: any, source: string): Promise<ThreatIndicator[]> {
    const indicators: ThreatIndicator[] = [];
    
    try {
      if (data.query_status === 'ok' && Array.isArray(data.data)) {
        for (const item of data.data) {
          if (item.sha256_hash) {
            indicators.push({
              id: `abusech-${item.sha256_hash}`,
              type: 'hash',
              value: item.sha256_hash,
              severity: 'high',
              confidence: 90,
              source,
              description: item.signature || 'Malware hash from Abuse.ch',
              tags: item.tags || ['malware'],
              firstSeen: new Date(item.first_seen || Date.now()),
              lastSeen: new Date(),
              isActive: true,
              ttl: 72 // 3 days
            });
          }
        }
    }
  } catch (error) {
    safeLogger.error('Failed to parse Abuse.ch data', { error });
  }
  
  return indicators;
}  private async parseSpamhausDROP(data: string, source: string): Promise<ThreatIndicator[]> {
    const indicators: ThreatIndicator[] = [];
    const lines = data.split('\n');
    
    for (const line of lines) {
      // Skip comments and empty lines
      if (line.startsWith(';') || line.startsWith('#') || !line.trim()) {
        continue;
      }
      
      // Parse CIDR notation (e.g., "1.2.3.0/24 ; SBL123")
      const match = line.match(/^(\d+\.\d+\.\d+\.\d+\/?\d*)/);
      if (match) {
        const network = match[1];
        indicators.push({
          id: `spamhaus-${network.replace(/[\/\.]/g, '-')}`,
          type: 'ip',
          value: network,
          severity: 'medium',
          confidence: 95,
          source,
          description: `Spamhaus DROP list entry: ${line.trim()}`,
          tags: ['spam', 'malicious-network'],
          firstSeen: new Date(),
          lastSeen: new Date(),
          isActive: true,
          ttl: 24 // 24 hours
        });
      }
    }
    
    return indicators;
  }

  private async huntCompromisedAccounts(): Promise<void> {
    safeLogger.info('Hunting for compromised accounts');
    
    try {
      // Look for multiple failed logins followed by successful login from different IPs
      const suspiciousLogins = await siemService.getRecentEvents(24); // Last 24 hours
      
      const loginEvents = suspiciousLogins.filter(event => 
        event.metadata.action?.includes('login') || 
        event.metadata.action?.includes('auth')
      );
      
      // Group by user and analyze patterns
      const userLoginPatterns = new Map<string, any[]>();
      
      for (const event of loginEvents) {
        if (event.userId) {
          if (!userLoginPatterns.has(event.userId)) {
            userLoginPatterns.set(event.userId, []);
          }
          userLoginPatterns.get(event.userId)!.push(event);
        }
      }
      
      // Check for suspicious patterns
      for (const [userId, events] of userLoginPatterns) {
        await this.analyzeUserLoginPattern(userId, events);
      }
      
    } catch (error) {
      safeLogger.error('Failed to hunt compromised accounts', { error });
    }
  }

  private async detectSuspiciousLogins(): Promise<any[]> {
    const suspicious: any[] = [];
    
    try {
      const recentEvents = await siemService.getRecentEvents(1); // Last hour
      
      for (const event of recentEvents) {
        // Check for logins from new locations
        if (event.metadata.action?.includes('login') && event.ipAddress) {
          const isNewLocation = await this.isNewLoginLocation(event.userId, event.ipAddress);
          if (isNewLocation) {
            suspicious.push({
              type: 'new_location_login',
              userId: event.userId,
              ipAddress: event.ipAddress,
              timestamp: event.timestamp,
              riskScore: 70
            });
          }
        }
        
        // Check for multiple failed logins
        if (event.metadata.result === 'failure' && event.metadata.action?.includes('login')) {
          const recentFailures = await this.countRecentFailedLogins(event.ipAddress);
          if (recentFailures > 5) {
            suspicious.push({
              type: 'brute_force_attempt',
              ipAddress: event.ipAddress,
              failureCount: recentFailures,
              timestamp: event.timestamp,
              riskScore: 85
            });
          }
        }
    }
  } catch (error) {
    safeLogger.error('Failed to detect suspicious logins', { error });
  }
  
  return suspicious;
}  private async detectDataExfiltration(): Promise<any[]> {
    const exfiltrationAttempts: any[] = [];
    
    try {
      const recentEvents = await siemService.getRecentEvents(1);
      
      for (const event of recentEvents) {
        // Look for bulk data access patterns
        if (event.metadata.action?.includes('export') || 
            event.metadata.action?.includes('download')) {
          
          const bulkAccess = await this.detectBulkDataAccess(event.userId, event.ipAddress);
          if (bulkAccess.isSuspicious) {
            exfiltrationAttempts.push({
              type: 'bulk_data_access',
              userId: event.userId,
              ipAddress: event.ipAddress,
              accessCount: bulkAccess.count,
              timestamp: event.timestamp,
              riskScore: bulkAccess.riskScore
            });
          }
        }
    }
  } catch (error) {
    safeLogger.error('Failed to detect data exfiltration', { error });
  }
  
  return exfiltrationAttempts;
}  private async detectPrivilegeEscalation(): Promise<any[]> {
    const escalationAttempts: any[] = [];
    
    try {
      const recentEvents = await siemService.getRecentEvents(1);
      
      for (const event of recentEvents) {
        // Look for privilege escalation attempts
        if (event.metadata.action?.includes('role_change') || 
            event.metadata.action?.includes('permission_grant')) {
          
          escalationAttempts.push({
            type: 'privilege_escalation',
            userId: event.userId,
            targetUser: event.metadata.targetUser,
            action: event.metadata.action,
            timestamp: event.timestamp,
            riskScore: 75
          });
        }
    }
  } catch (error) {
    safeLogger.error('Failed to detect privilege escalation', { error });
  }
  
  return escalationAttempts;
}  private async createBehavioralThreat(anomaly: any): Promise<void> {
    // Create a dynamic threat indicator based on behavioral analysis
    const indicator: ThreatIndicator = {
      id: `behavioral-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'signature',
      value: `behavioral:${anomaly.type}`,
      severity: this.mapRiskScoreToSeverity(anomaly.riskScore),
      confidence: Math.min(anomaly.riskScore, 100),
      source: 'behavioral-analysis',
      description: `Behavioral anomaly detected: ${anomaly.type}`,
      tags: ['behavioral', 'anomaly', anomaly.type],
      firstSeen: new Date(),
      lastSeen: new Date(),
      isActive: true,
      ttl: 1 // 1 hour for behavioral indicators
    };
    
  this.indicators.set(indicator.id, indicator);
  
  safeLogger.warn('Behavioral threat created', {
    indicator: indicator.id,
    anomaly: anomaly.type,
    riskScore: anomaly.riskScore
  });
}  private async addToFirewallBlacklist(ip: string): Promise<void> {
    safeLogger.warn(`Adding IP ${ip} to firewall blacklist`);
    
    // In a real implementation, this would integrate with:
    // - Cloud WAF (CloudFlare, AWS WAF, etc.)
    // - Network firewalls
    // - Load balancer rules
    // - Application-level IP blocking
    
    // For now, we'll log the action and emit an event
    this.emit('firewallBlock', { ip, timestamp: new Date() });
  }

  // Helper methods for behavioral analysis
  private async analyzeUserLoginPattern(userId: string, events: any[]): Promise<void> {
    // Analyze login patterns for this user
    const ips = [...new Set(events.map(e => e.ipAddress))];
    const failedLogins = events.filter(e => e.metadata.result === 'failure');
    const successfulLogins = events.filter(e => e.metadata.result === 'success');
    
    // Flag if multiple IPs with mixed success/failure patterns
    if (ips.length > 3 && failedLogins.length > 5 && successfulLogins.length > 0) {
      await this.createBehavioralThreat({
        type: 'account_compromise',
        userId,
        riskScore: 80,
        details: { uniqueIPs: ips.length, failedLogins: failedLogins.length }
      });
    }
  }

  private async isNewLoginLocation(userId?: string, ipAddress?: string): Promise<boolean> {
    if (!userId || !ipAddress) return false;
    
    // Check if this IP has been used by this user before
    // In a real implementation, this would check geolocation and historical data
    return Math.random() > 0.9; // Simplified for demo
  }

  private async countRecentFailedLogins(ipAddress?: string): Promise<number> {
    if (!ipAddress) return 0;
    
    try {
      const recentEvents = await siemService.getRecentEvents(1);
      return recentEvents.filter(event => 
        event.ipAddress === ipAddress && 
        event.metadata.result === 'failure' &&
        event.metadata.action?.includes('login')
      ).length;
    } catch (error) {
      return 0;
    }
  }

  private async detectBulkDataAccess(userId?: string, ipAddress?: string): Promise<{
    isSuspicious: boolean;
    count: number;
    riskScore: number;
  }> {
    if (!userId) return { isSuspicious: false, count: 0, riskScore: 0 };
    
    try {
      const recentEvents = await siemService.getRecentEvents(1);
      const dataAccessEvents = recentEvents.filter(event => 
        event.userId === userId &&
        (event.metadata.action?.includes('export') || 
         event.metadata.action?.includes('download') ||
         event.metadata.action?.includes('access'))
      );
      
      const count = dataAccessEvents.length;
      const isSuspicious = count > 10; // Threshold for bulk access
      const riskScore = Math.min(count * 8, 100);
      
      return { isSuspicious, count, riskScore };
    } catch (error) {
      return { isSuspicious: false, count: 0, riskScore: 0 };
    }
  }

  private mapRiskScoreToSeverity(riskScore: number): ThreatIndicator['severity'] {
    if (riskScore >= 90) return 'critical';
    if (riskScore >= 70) return 'high';
    if (riskScore >= 40) return 'medium';
    return 'low';
  }
}

export const threatIntelligenceService = new ThreatIntelligenceService();
export default threatIntelligenceService;
