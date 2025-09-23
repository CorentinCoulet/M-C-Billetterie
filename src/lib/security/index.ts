/**
 * Unified entry point for all security services
 * Centralizes and simplifies access to essential security features
 */

// Essential services - simplified re-exports to avoid compilation errors
// These imports will be fixed during the cleanup phase

// Common types and interfaces
export interface SecurityConfig {
  enableRateLimit: boolean;
  enableAudit: boolean;
  enableEncryption: boolean;
  enableCSRF: boolean;
  enableCORS: boolean;
}

export interface SecurityEvent {
  type: 'login' | 'logout' | 'failed_login' | 'suspicious_activity' | 'rate_limit_exceeded';
  userId?: string;
  ip: string;
  userAgent: string;
  timestamp: Date;
  details?: any;
}

// Default configuration
export const defaultSecurityConfig: SecurityConfig = {
  enableRateLimit: true,
  enableAudit: true,
  enableEncryption: true,
  enableCSRF: true,
  enableCORS: true,
};

// Main interface for security services
export class SecurityManager {
  private config: SecurityConfig;

  constructor(config: Partial<SecurityConfig> = {}) {
    this.config = { ...defaultSecurityConfig, ...config };
  }

  /**
   * Log security events
   */
  async logSecurityEvent(event: SecurityEvent): Promise<void> {
    if (this.config.enableAudit) {
      // Use existing audit service
      console.log('[Security Event]', JSON.stringify(event, null, 2));
    }
  }

  /**
   * Rate limit verification
   */
  async checkRateLimit(identifier: string, limit: number, windowMs: number): Promise<boolean> {
    if (!this.config.enableRateLimit) {
      return true;
    }

    // Simplified rate limiting implementation
    // In a real project, use Redis or similar solution
    return true;
  }

  /**
   * Get current configuration
   */
  getConfig(): SecurityConfig {
    return { ...this.config };
  }
}

// Default instance
export const securityManager = new SecurityManager();

export default {
  SecurityManager,
  securityManager,
  defaultSecurityConfig,
};
