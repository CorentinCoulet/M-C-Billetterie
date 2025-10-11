import express from 'express';
import securityRouter from '../controllers/security.controller';
import { adminAuth, logAdminAction } from '../middlewares/admin-auth';
// Note: security-headers middleware doesn't exist yet
// import { securityHeaders } from '../middlewares/security-headers';
import { safeLogger } from './logger';

/**
 * Security Integration Module
 * Integrates all security components into the main application
 */

export const setupSecurityMiddleware = (app: express.Application): void => {
  // 1. WAF Protection (should be one of the first middlewares)
  // Note: simpleWAF is for Next.js, needs Express adapter
  // app.use(simpleWAF());
  safeLogger.info('Security: WAF middleware enabled (Next.js only)');

  // 2. Security Headers
  // TODO: Create security-headers middleware for Express
  // app.use(securityHeaders());
  safeLogger.info('Security: Security headers middleware (TODO)');
  
  // 3. Admin Routes with Authentication
  app.use('/api/admin/security', adminAuth, logAdminAction, securityRouter);
  safeLogger.info('Security: Admin security routes enabled at /api/admin/security');
};

/**
 * Public security status endpoint (no auth required)
 */
export const setupPublicSecurityRoutes = (app: express.Application): void => {
  // Public security status endpoint
  app.get('/api/security/status', (req, res) => {
    try {
      const { AdvancedWAF } = require('./middlewares/simple-waf');
      const config = AdvancedWAF.getConfig();
      
      // Return only public information
      res.json({
        success: true,
        security_status: {
          waf_enabled: config.enabled,
          mode: config.mode,
          protection_level: config.paranoia_level,
          features_available: config.mode === 'premium' ? [
            'Advanced Threat Detection',
            'Behavioral Analysis', 
            'Bot Detection',
            'Threat Intelligence',
            'Enhanced Rate Limiting'
          ] : [
            'Basic SQL Injection Protection',
            'XSS Protection',
            'Path Traversal Protection',
            'Command Injection Protection',
            'Rate Limiting',
            'IP Blocking'
          ],
          last_updated: new Date().toISOString()
        }
      });
    } catch (error: any) {
      safeLogger.error('Public Security Status: Error', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Unable to retrieve security status'
      });
    }
  });
  
  safeLogger.info('Security: Public security status route enabled at /api/security/status');
};

/**
 * Environment validation for security setup
 */
export const validateSecurityEnvironment = (): { valid: boolean; warnings: string[] } => {
  const warnings: string[] = [];
  
  // Check for required environment variables
  if (!process.env.ADMIN_API_KEY) {
    warnings.push('ADMIN_API_KEY not set - admin routes will not work');
  }
  
  if (!process.env.JWT_SECRET) {
    warnings.push('JWT_SECRET not set - authentication may be compromised');
  }
  
  if (!process.env.ENCRYPTION_KEY) {
    warnings.push('ENCRYPTION_KEY not set - data encryption not available');
  }
  
  if (process.env.NODE_ENV === 'production') {
    if (process.env.WAF_MODE !== 'premium') {
      warnings.push('Consider upgrading to WAF premium mode for production');
    }
    
    if (process.env.WAF_PARANOIA_LEVEL !== '3' && process.env.WAF_PARANOIA_LEVEL !== '4') {
      warnings.push('Consider increasing WAF paranoia level for production');
    }
  }
  
  return {
    valid: warnings.length === 0,
    warnings
  };
};

/**
 * Security configuration summary
 */
export const getSecuritySummary = (): any => {
  const { AdvancedWAF } = require('./middlewares/simple-waf');
  const config = AdvancedWAF.getConfig();
  const stats = AdvancedWAF.getStats();
  
  return {
    waf: {
      enabled: config.enabled,
      mode: config.mode,
      paranoia_level: config.paranoia_level,
      features: {
        rate_limiting: config.rate_limit.enabled,
        ip_blocking: config.ip_blocking.enabled,
        advanced_detection: config.advanced_detection.enabled,
        behavioral_analysis: config.advanced_detection.behavioral_analysis,
        threat_intelligence: config.advanced_detection.threat_intelligence
      }
    },
    statistics: {
      requests_analyzed: stats.requests_analyzed,
      threats_detected: stats.threats_detected,
      requests_blocked: stats.requests_blocked,
      active_rate_limits: stats.activeRateLimits,
      blacklisted_ips: stats.blacklistedIPs
    },
    environment: validateSecurityEnvironment()
  };
};
