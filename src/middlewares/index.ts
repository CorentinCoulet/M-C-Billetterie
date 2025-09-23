/**
 * Unified Middleware Exports
 * Simplifies imports across the application
 */

// Security Middleware (Unified)
export {
    apiSecurityMiddleware, authSecurityMiddleware, getCSRFToken, publicSecurityMiddleware, securityMiddleware, webhookSecurityMiddleware, withSecurity
} from './security.middleware';

// Authentication & Authorization
export { adminAuth, generateAdminApiKey, logAdminAction } from './admin-auth';
export { hasRoles, isAuthenticated } from './auth';
export type { AuthenticatedRequest } from './auth';
export { checkMFASession, requireMFA, verifyMFACode } from './mfa';
export {
    PERMISSIONS, ROLES, hasPermission, requireAllPermissions, requireAnyPermission, requirePermission
} from './rbac';

// Rate Limiting
export { apiRateLimiter, authRateLimiter, createRateLimiter } from './appRouterRateLimit';

// Validation
export { validate, validateBody, validateParams, validateQuery } from './validation';

// Error Handling
export { errorHandler } from './errorHandler';

// Logging & Monitoring
export { LogLevel, createRequestLogger, logError, requestLogger } from './logging';
export {
    AlertThresholds, businessMetrics, cacheMonitoring, databaseMonitoring, healthChecks, performanceMonitoring, resourceMonitoring
} from './monitoring';

