/**
 * Advanced Web Application Firewall (WAF)
 * Real-time attack detection and prevention
 */

import { NextFunction, Request, Response } from 'express';
import { incidentResponseService } from './incident-response-service';
import { logger } from './logger';
import { threatIntelligenceService } from './threat-intelligence-service';

export interface WAFRule {
  id: string;
  name: string;
  description: string;
  pattern: RegExp;
  severity: 'low' | 'medium' | 'high' | 'critical';
  action: 'log' | 'block' | 'challenge';
  category: 'injection' | 'xss' | 'rfi' | 'lfi' | 'rce' | 'traversal' | 'dos';
  enabled: boolean;
}

export interface AttackDetection {
  ruleId: string;
  ruleName: string;
  severity: string;
  clientIP: string;
  userAgent: string;
  requestURL: string;
  payload: string;
  timestamp: Date;
  blocked: boolean;
}

export class AdvancedWAFService {
  private rules: Map<string, WAFRule> = new Map();
  private ipRateLimits = new Map<string, { count: number; resetTime: number }>();
  private blockedIPs = new Set<string>();
  
  constructor() {
    this.initializeWAFRules();
  }

  /**
   * Main WAF middleware
   */
  middleware = (req: Request, res: Response, next: NextFunction): void => {
    this.processRequest(req, res, next).catch(error => {
      logger.error('WAF processing error:', error);
      next();
    });
  };

  private async processRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    const clientIP = this.getClientIP(req);
    
    // Check blocked IPs first
    if (this.blockedIPs.has(clientIP)) {
      this.blockRequest(res, 'IP_BLOCKED', 'Your IP has been blocked due to malicious activity');
      return;
    }

    // Rate limiting check
    if (await this.checkRateLimit(clientIP)) {
      this.blockRequest(res, 'RATE_LIMIT', 'Too many requests from your IP');
      return;
    }

    // Threat intelligence check
    const threatMatch = await threatIntelligenceService.checkThreatIndicators(
      clientIP, 
      'ip', 
      { userAgent: req.get('user-agent'), url: req.url }
    );
    
    if (threatMatch && threatMatch.blocked) {
      this.blockRequest(res, 'THREAT_INTEL', 'IP flagged by threat intelligence');
      return;
    }

    // Apply WAF rules
    const detection = await this.applyWAFRules(req);
    
    if (detection && detection.blocked) {
      await this.handleAttackDetection(detection);
      this.blockRequest(res, 'WAF_RULE', `Blocked by WAF rule: ${detection.ruleName}`);
      return;
    }

    // Log clean requests in verbose mode
    if (process.env.WAF_VERBOSE === 'true') {
      logger.debug('WAF: Clean request', {
        ip: clientIP,
        method: req.method,
        url: req.url,
        userAgent: req.get('user-agent')
      });
    }

    next();
  }

  /**
   * Apply all WAF rules to request
   */
  private async applyWAFRules(req: Request): Promise<AttackDetection | null> {
    const clientIP = this.getClientIP(req);
    const userAgent = req.get('user-agent') || '';
    const url = req.url;
    
    // Combine all request data for analysis
    const requestData = {
      url,
      query: JSON.stringify(req.query),
      body: typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {}),
      headers: JSON.stringify(req.headers),
      cookies: req.get('cookie') || ''
    };

    // Test against all enabled rules
    for (const [ruleId, rule] of this.rules) {
      if (!rule.enabled) continue;
      
      // Test each part of the request
      for (const [field, data] of Object.entries(requestData)) {
        if (data && rule.pattern.test(data)) {
          const detection: AttackDetection = {
            ruleId,
            ruleName: rule.name,
            severity: rule.severity,
            clientIP,
            userAgent,
            requestURL: url,
            payload: this.sanitizePayload(`${field}: ${data}`),
            timestamp: new Date(),
            blocked: rule.action === 'block'
          };

          logger.warn('WAF rule triggered', {
            rule: rule.name,
            ip: clientIP,
            severity: rule.severity,
            field,
            url
          });

          return detection;
        }
      }
    }

    return null;
  }

  /**
   * Initialize OWASP Core Rule Set and custom rules
   */
  private initializeWAFRules(): void {
    // SQL Injection Rules
    this.addRule({
      id: 'WAF-001',
      name: 'SQL Injection Detection',
      description: 'Detects SQL injection attempts',
      pattern: /(\bunion\s+select|select\s+.*\s+from|insert\s+into|update\s+.*\s+set|delete\s+from|drop\s+table|exec\s*\(|sp_executesql|\bor\s+1\s*=\s*1|\band\s+1\s*=\s*1|\';\s*--|\'\s+or\s+\'|\/\*.*?\*\/)/i,
      severity: 'critical',
      action: 'block',
      category: 'injection',
      enabled: true
    });

    this.addRule({
      id: 'WAF-002',
      name: 'Advanced SQL Injection',
      description: 'Advanced SQL injection patterns',
      pattern: /(\bhex\s*\(|\bchar\s*\(|\bascii\s*\(|\bsubstring\s*\(|\bconcat\s*\(|0x[0-9a-f]+|\bwaitfor\s+delay|\bbenchmark\s*\(|\bsleep\s*\()/i,
      severity: 'critical',
      action: 'block',
      category: 'injection',
      enabled: true
    });

    // XSS Rules
    this.addRule({
      id: 'WAF-010',
      name: 'Cross-Site Scripting (XSS)',
      description: 'Detects XSS attempts',
      pattern: /<script[^>]*>[\s\S]*?<\/script>|javascript:|vbscript:|onload\s*=|onerror\s*=|onclick\s*=|onmouseover\s*=|<iframe[^>]*>|<object[^>]*>|<embed[^>]*>/i,
      severity: 'high',
      action: 'block',
      category: 'xss',
      enabled: true
    });

    this.addRule({
      id: 'WAF-011',
      name: 'Advanced XSS Detection',
      description: 'Advanced XSS patterns including encoded attacks',
      pattern: /(%3C|&lt;)script|%22%3E%3Cscript|javascript%3A|%27%3Balert|eval\s*\(|String\.fromCharCode|document\.write|innerHTML\s*=/i,
      severity: 'high',
      action: 'block',
      category: 'xss',
      enabled: true
    });

    // Remote File Inclusion (RFI)
    this.addRule({
      id: 'WAF-020',
      name: 'Remote File Inclusion',
      description: 'Detects RFI attempts',
      pattern: /(http|https|ftp):\/\/[^\/\s]+\/[^\s]*\.(php|asp|jsp|txt)/i,
      severity: 'high',
      action: 'block',
      category: 'rfi',
      enabled: true
    });

    // Local File Inclusion (LFI)
    this.addRule({
      id: 'WAF-021',
      name: 'Local File Inclusion',
      description: 'Detects LFI attempts',
      pattern: /(\.\.\/|\.\.\\|\/etc\/passwd|\/etc\/hosts|\\windows\\system32|\.\.%2F|\.\.%5C)/i,
      severity: 'high',
      action: 'block',
      category: 'lfi',
      enabled: true
    });

    // Remote Code Execution (RCE)
    this.addRule({
      id: 'WAF-030',
      name: 'Remote Code Execution',
      description: 'Detects RCE attempts',
      pattern: /(system\s*\(|exec\s*\(|shell_exec\s*\(|passthru\s*\(|popen\s*\(|proc_open\s*\(|base64_decode\s*\(|eval\s*\(|cmd\.exe|\/bin\/bash|\/bin\/sh)/i,
      severity: 'critical',
      action: 'block',
      category: 'rce',
      enabled: true
    });

    // Directory Traversal
    this.addRule({
      id: 'WAF-040',
      name: 'Directory Traversal',
      description: 'Detects directory traversal attempts',
      pattern: /(\.\.\/|\.\.\\|%2e%2e%2f|%2e%2e%5c|%c0%2e%2e%2f|%uff0e%uff0e%2f)/i,
      severity: 'medium',
      action: 'block',
      category: 'traversal',
      enabled: true
    });

    // DoS Protection
    this.addRule({
      id: 'WAF-050',
      name: 'Large Payload DoS',
      description: 'Blocks extremely large payloads',
      pattern: /.{10000,}/, // More than 10KB
      severity: 'medium',
      action: 'block',
      category: 'dos',
      enabled: true
    });

    // Header Injection
    this.addRule({
      id: 'WAF-060',
      name: 'HTTP Header Injection',
      description: 'Detects HTTP header injection attempts',
      pattern: /(\r\n|\n|\r)[\s]*((content-type|content-length|set-cookie|location):|http\/)/i,
      severity: 'medium',
      action: 'block',
      category: 'injection',
      enabled: true
    });

    // Protocol Anomalies
    this.addRule({
      id: 'WAF-070',
      name: 'Protocol Anomalies',
      description: 'Detects HTTP protocol anomalies',
      pattern: /\x00|\x0d\x0a|%00|%0d%0a/i,
      severity: 'medium',
      action: 'block',
      category: 'injection',
      enabled: true
    });

    logger.info(`WAF initialized with ${this.rules.size} rules`);
  }

  /**
   * Add a new WAF rule
   */
  addRule(rule: WAFRule): void {
    this.rules.set(rule.id, rule);
    logger.info(`WAF rule added: ${rule.name} (${rule.id})`);
  }

  /**
   * Rate limiting check
   */
  private async checkRateLimit(clientIP: string): Promise<boolean> {
    const now = Date.now();
    const limit = this.ipRateLimits.get(clientIP);
    
    if (!limit) {
      this.ipRateLimits.set(clientIP, { count: 1, resetTime: now + 60000 }); // 1 minute window
      return false;
    }

    if (now > limit.resetTime) {
      this.ipRateLimits.set(clientIP, { count: 1, resetTime: now + 60000 });
      return false;
    }

    limit.count++;
    
    // 100 requests per minute threshold
    if (limit.count > 100) {
      await this.blockIPTemporarily(clientIP, 300000); // 5 minutes
      return true;
    }

    return false;
  }

  /**
   * Handle attack detection
   */
  private async handleAttackDetection(detection: AttackDetection): Promise<void> {
    // Log the attack
    logger.error('WAF Attack Detected', detection);
    
    // Auto-block IP for critical attacks
    if (detection.severity === 'critical') {
      await this.blockIPTemporarily(detection.clientIP, 3600000); // 1 hour
    }

    // Create security incident for high severity attacks
    if (detection.severity === 'high' || detection.severity === 'critical') {
      await incidentResponseService.detectIncident(
        'injection_attack',
        detection.severity as any,
        {
          sourceIp: detection.clientIP,
          attackType: detection.ruleName,
          payload: detection.payload,
          userAgent: detection.userAgent,
          url: detection.requestURL
        }
      );
    }

    // Update threat intelligence
    if (detection.severity === 'critical') {
      // Could add the IP to threat intelligence feeds
      logger.info(`Flagging IP ${detection.clientIP} in threat intelligence`);
    }
  }

  /**
   * Block request with specific reason
   */
  private blockRequest(res: Response, code: string, message: string): void {
    res.status(403).json({
      error: 'Request Blocked',
      code,
      message,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Temporarily block an IP address
   */
  private async blockIPTemporarily(ip: string, duration: number): Promise<void> {
    this.blockedIPs.add(ip);
    
    setTimeout(() => {
      this.blockedIPs.delete(ip);
      logger.info(`IP unblocked: ${ip}`);
    }, duration);
    
    logger.warn(`IP temporarily blocked: ${ip} for ${duration/1000} seconds`);
  }

  /**
   * Get client IP address
   */
  private getClientIP(req: Request): string {
    return (req.get('x-forwarded-for') || 
            req.get('x-real-ip') || 
            req.connection.remoteAddress || 
            req.ip || 
            'unknown').split(',')[0].trim();
  }

  /**
   * Sanitize payload for logging
   */
  private sanitizePayload(payload: string): string {
    return payload.length > 1000 ? 
           payload.substring(0, 1000) + '...' : 
           payload;
  }

  /**
   * Get WAF statistics
   */
  getStatistics(): any {
    return {
      totalRules: this.rules.size,
      enabledRules: Array.from(this.rules.values()).filter(r => r.enabled).length,
      blockedIPs: this.blockedIPs.size,
      rateLimitedIPs: this.ipRateLimits.size,
      rulesByCategory: this.getRulesByCategory(),
      rulesBySeverity: this.getRulesBySeverity()
    };
  }

  /**
   * Update WAF configuration
   */
  updateConfiguration(config: {
    enableRule?: string;
    disableRule?: string;
    addCustomRule?: WAFRule;
    updateRateLimit?: { ip: string; limit: number };
  }): void {
    if (config.enableRule) {
      const rule = this.rules.get(config.enableRule);
      if (rule) {
        rule.enabled = true;
        logger.info(`WAF rule enabled: ${config.enableRule}`);
      }
    }

    if (config.disableRule) {
      const rule = this.rules.get(config.disableRule);
      if (rule) {
        rule.enabled = false;
        logger.info(`WAF rule disabled: ${config.disableRule}`);
      }
    }

    if (config.addCustomRule) {
      this.addRule(config.addCustomRule);
    }
  }

  private getRulesByCategory(): any {
    const categories: any = {};
    for (const rule of this.rules.values()) {
      categories[rule.category] = (categories[rule.category] || 0) + 1;
    }
    return categories;
  }

  private getRulesBySeverity(): any {
    const severities: any = {};
    for (const rule of this.rules.values()) {
      severities[rule.severity] = (severities[rule.severity] || 0) + 1;
    }
    return severities;
  }
}

export const advancedWAFService = new AdvancedWAFService();
export default advancedWAFService;
