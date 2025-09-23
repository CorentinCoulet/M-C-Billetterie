import crypto from 'crypto';
import Redis from 'ioredis';
import AuditService from './audit-service';
import prisma from './prisma';
import { SESSION_SECURITY } from './security-config';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export interface SessionData {
  id: string;
  userId: string;
  userEmail: string;
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
  lastActivityAt: Date;
  expiresAt: Date;
  isActive: boolean;
  deviceInfo?: {
    browser: string;
    os: string;
    device: string;
  };
}

export interface CreateSessionOptions {
  userId: string;
  userEmail: string;
  ipAddress: string;
  userAgent: string;
  rememberMe?: boolean;
}

export class SessionSecurityService {
  private static readonly SESSION_PREFIX = 'session:';
  private static readonly USER_SESSIONS_PREFIX = 'user_sessions:';
  private static readonly ACTIVE_SESSIONS_PREFIX = 'active_sessions:';

  /**
   * Create a new secure session
   */
  static async createSession(options: CreateSessionOptions): Promise<{
    sessionId: string;
    token: string;
    expiresAt: Date;
  }> {
    const sessionId = this.generateSessionId();
    const token = this.generateSessionToken();
    
    // Check concurrent session limit
    await this.enforceSessionLimit(options.userId);

    // Calculate expiration
    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + (options.rememberMe ? 
        SESSION_SECURITY.ABSOLUTE_TIMEOUT * 7 : // 7x longer for "remember me"
        SESSION_SECURITY.ABSOLUTE_TIMEOUT
      )
    );

    // Parse user agent for device info
    const deviceInfo = this.parseUserAgent(options.userAgent);

    const sessionData: SessionData = {
      id: sessionId,
      userId: options.userId,
      userEmail: options.userEmail,
      ipAddress: options.ipAddress,
      userAgent: options.userAgent,
      createdAt: now,
      lastActivityAt: now,
      expiresAt,
      isActive: true,
      deviceInfo
    };

    // Store session in Redis
    const sessionKey = this.SESSION_PREFIX + sessionId;
    await redis.setex(
      sessionKey,
      Math.floor((expiresAt.getTime() - now.getTime()) / 1000),
      JSON.stringify(sessionData)
    );

    // Add to user's active sessions
    await redis.sadd(this.USER_SESSIONS_PREFIX + options.userId, sessionId);

    // Store in database for persistent tracking
    await prisma.userSession.create({
      data: {
        id: sessionId,
        userId: options.userId,
        token: await this.hashToken(token),
        ipAddress: options.ipAddress,
        userAgent: options.userAgent,
        deviceInfo: deviceInfo ? JSON.stringify(deviceInfo) : null,
        createdAt: now,
        lastActivityAt: now,
        expiresAt,
        isActive: true,
      }
    });

    // Log session creation
    await AuditService.logAuthentication(
      'login',
      options.userId,
      options.userEmail,
      options.ipAddress,
      options.userAgent,
      { sessionId, deviceInfo }
    );

    return { sessionId, token, expiresAt };
  }

  /**
   * Validate and refresh session
   */
  static async validateSession(sessionId: string, token: string, ipAddress: string): Promise<{
    isValid: boolean;
    sessionData?: SessionData;
    reason?: string;
  }> {
    try {
      // Get session from Redis
      const sessionKey = this.SESSION_PREFIX + sessionId;
      const sessionDataStr = await redis.get(sessionKey);
      
      if (!sessionDataStr) {
        return { isValid: false, reason: 'session_not_found' };
      }

      const sessionData: SessionData = JSON.parse(sessionDataStr);

      // Check if session is expired
      if (new Date() > sessionData.expiresAt) {
        await this.destroySession(sessionId, 'expired');
        return { isValid: false, reason: 'session_expired' };
      }

      // Verify token hash
      const dbSession = await prisma.userSession.findUnique({
        where: { id: sessionId }
      });

      if (!dbSession || !await this.verifyToken(token, dbSession.token)) {
        return { isValid: false, reason: 'invalid_token' };
      }

      // Check for suspicious IP change (optional strict mode)
      if (process.env.STRICT_IP_VALIDATION === 'true' && sessionData.ipAddress !== ipAddress) {
        await AuditService.logSecurityEvent(
          'suspicious_activity',
          ipAddress,
          undefined,
          {
            sessionId,
            originalIP: sessionData.ipAddress,
            newIP: ipAddress,
            reason: 'ip_address_change'
          }
        );
        
        await this.destroySession(sessionId, 'ip_change');
        return { isValid: false, reason: 'ip_address_changed' };
      }

      // Check idle timeout
      const idleTime = Date.now() - sessionData.lastActivityAt.getTime();
      if (idleTime > SESSION_SECURITY.IDLE_TIMEOUT) {
        await this.destroySession(sessionId, 'idle_timeout');
        return { isValid: false, reason: 'idle_timeout' };
      }

      // Update last activity
      sessionData.lastActivityAt = new Date();
      await redis.setex(
        sessionKey,
        Math.floor((sessionData.expiresAt.getTime() - Date.now()) / 1000),
        JSON.stringify(sessionData)
      );

      await prisma.userSession.update({
        where: { id: sessionId },
        data: { lastActivityAt: new Date() }
      });

      return { isValid: true, sessionData };
    } catch (error) {
      console.error('Session validation error:', error);
      return { isValid: false, reason: 'validation_error' };
    }
  }

  /**
   * Destroy a session
   */
  static async destroySession(sessionId: string, reason: string = 'logout'): Promise<void> {
    try {
      // Get session data for logging
      const sessionKey = this.SESSION_PREFIX + sessionId;
      const sessionDataStr = await redis.get(sessionKey);
      
      if (sessionDataStr) {
        const sessionData: SessionData = JSON.parse(sessionDataStr);
        
        // Remove from Redis
        await redis.del(sessionKey);
        await redis.srem(this.USER_SESSIONS_PREFIX + sessionData.userId, sessionId);

        // Update database
        await prisma.userSession.update({
          where: { id: sessionId },
          data: {
            isActive: false,
            destroyedAt: new Date(),
            destroyReason: reason
          }
        });

        // Log session destruction
        await AuditService.logAuthentication(
          'logout',
          sessionData.userId,
          sessionData.userEmail,
          sessionData.ipAddress,
          sessionData.userAgent,
          { sessionId, reason }
        );
      }
    } catch (error) {
      console.error('Error destroying session:', error);
    }
  }

  /**
   * Enforce concurrent session limit
   */
  static async enforceSessionLimit(userId: string): Promise<void> {
    try {
      const userSessionsKey = this.USER_SESSIONS_PREFIX + userId;
      const sessionIds = await redis.smembers(userSessionsKey);

      if (sessionIds.length >= SESSION_SECURITY.MAX_CONCURRENT_SESSIONS) {
        // Get session details to find oldest
        const sessionPromises = sessionIds.map(async (sessionId) => {
          const sessionData = await redis.get(this.SESSION_PREFIX + sessionId);
          return sessionData ? { id: sessionId, ...JSON.parse(sessionData) } : null;
        });

        const sessions = (await Promise.all(sessionPromises)).filter(Boolean);
        
        // Sort by creation date and destroy oldest sessions
        sessions.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        
        const sessionsToDestroy = sessions.slice(0, sessionIds.length - SESSION_SECURITY.MAX_CONCURRENT_SESSIONS + 1);
        
        for (const session of sessionsToDestroy) {
          await this.destroySession(session.id, 'concurrent_limit_exceeded');
        }
      }
    } catch (error) {
      console.error('Error enforcing session limit:', error);
    }
  }

  /**
   * Get active sessions for a user
   */
  static async getUserSessions(userId: string): Promise<SessionData[]> {
    try {
      const userSessionsKey = this.USER_SESSIONS_PREFIX + userId;
      const sessionIds = await redis.smembers(userSessionsKey);

      const sessionPromises = sessionIds.map(async (sessionId) => {
        const sessionData = await redis.get(this.SESSION_PREFIX + sessionId);
        return sessionData ? JSON.parse(sessionData) : null;
      });

      const sessions = (await Promise.all(sessionPromises)).filter(Boolean);
      return sessions.filter(session => session.isActive);
    } catch (error) {
      console.error('Error getting user sessions:', error);
      return [];
    }
  }

  /**
   * Destroy all sessions for a user (force logout)
   */
  static async destroyAllUserSessions(userId: string, reason: string = 'admin_action'): Promise<number> {
    try {
      const sessions = await this.getUserSessions(userId);
      
      for (const session of sessions) {
        await this.destroySession(session.id, reason);
      }

      return sessions.length;
    } catch (error) {
      console.error('Error destroying all user sessions:', error);
      return 0;
    }
  }

  /**
   * Clean up expired sessions
   */
  static async cleanupExpiredSessions(): Promise<number> {
    try {
      const expiredSessions = await prisma.userSession.findMany({
        where: {
          OR: [
            { expiresAt: { lt: new Date() } },
            { 
              lastActivityAt: { 
                lt: new Date(Date.now() - SESSION_SECURITY.IDLE_TIMEOUT) 
              }
            }
          ],
          isActive: true
        }
      });

      let cleanedCount = 0;
      for (const session of expiredSessions) {
        await this.destroySession(session.id, 'expired_cleanup');
        cleanedCount++;
      }

      return cleanedCount;
    } catch (error) {
      console.error('Error cleaning up expired sessions:', error);
      return 0;
    }
  }

  /**
   * Rotate session ID (for security after sensitive operations)
   */
  static async rotateSessionId(oldSessionId: string): Promise<string | null> {
    try {
      const sessionKey = this.SESSION_PREFIX + oldSessionId;
      const sessionDataStr = await redis.get(sessionKey);
      
      if (!sessionDataStr) {
        return null;
      }

      const sessionData: SessionData = JSON.parse(sessionDataStr);
      const newSessionId = this.generateSessionId();

      // Create new session with same data
      sessionData.id = newSessionId;
      const newSessionKey = this.SESSION_PREFIX + newSessionId;
      
      const ttl = await redis.ttl(sessionKey);
      await redis.setex(newSessionKey, ttl, JSON.stringify(sessionData));

      // Update user sessions set
      await redis.srem(this.USER_SESSIONS_PREFIX + sessionData.userId, oldSessionId);
      await redis.sadd(this.USER_SESSIONS_PREFIX + sessionData.userId, newSessionId);

      // Update database
      await prisma.userSession.update({
        where: { id: oldSessionId },
        data: { id: newSessionId }
      });

      // Destroy old session
      await redis.del(sessionKey);

      return newSessionId;
    } catch (error) {
      console.error('Error rotating session ID:', error);
      return null;
    }
  }

  /**
   * Generate cryptographically secure session ID
   */
  private static generateSessionId(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Generate secure session token
   */
  private static generateSessionToken(): string {
    return crypto.randomBytes(64).toString('base64url');
  }

  /**
   * Hash session token
   */
  private static async hashToken(token: string): Promise<string> {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Verify token against hash
   */
  private static async verifyToken(token: string, hash: string): Promise<boolean> {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(tokenHash), Buffer.from(hash));
  }

  /**
   * Parse user agent for device information
   */
  private static parseUserAgent(userAgent: string): any {
    // Basic user agent parsing - in production, use a library like 'ua-parser-js'
    const info = {
      browser: 'Unknown',
      os: 'Unknown',
      device: 'Unknown'
    };

    if (userAgent.includes('Chrome')) info.browser = 'Chrome';
    else if (userAgent.includes('Firefox')) info.browser = 'Firefox';
    else if (userAgent.includes('Safari')) info.browser = 'Safari';
    else if (userAgent.includes('Edge')) info.browser = 'Edge';

    if (userAgent.includes('Windows')) info.os = 'Windows';
    else if (userAgent.includes('Mac')) info.os = 'macOS';
    else if (userAgent.includes('Linux')) info.os = 'Linux';
    else if (userAgent.includes('Android')) info.os = 'Android';
    else if (userAgent.includes('iOS')) info.os = 'iOS';

    if (userAgent.includes('Mobile')) info.device = 'Mobile';
    else if (userAgent.includes('Tablet')) info.device = 'Tablet';
    else info.device = 'Desktop';

    return info;
  }

  /**
   * Get session statistics for monitoring
   */
  static async getSessionStats(): Promise<{
    activeSessions: number;
    activeUsers: number;
    averageSessionDuration: number;
    topDevices: Array<{ device: string; count: number }>;
  }> {
    try {
      const [activeSessions, recentSessions] = await Promise.all([
        prisma.userSession.count({
          where: { isActive: true }
        }),
        prisma.userSession.findMany({
          where: {
            createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
          },
          select: { userId: true, deviceInfo: true, createdAt: true, lastActivityAt: true }
        })
      ]);

      const activeUsers = new Set(recentSessions.map((s: any) => s.userId)).size;
      
      const durations = recentSessions.map((s: any) => 
        s.lastActivityAt.getTime() - s.createdAt.getTime()
      );
      const averageSessionDuration = durations.length > 0 
        ? durations.reduce((a: any, b: any) => a + b, 0) / durations.length 
        : 0;

      const deviceCounts: Record<string, number> = {};
      recentSessions.forEach((session: any) => {
        if (session.deviceInfo) {
          const device = JSON.parse(session.deviceInfo).device || 'Unknown';
          deviceCounts[device] = (deviceCounts[device] || 0) + 1;
        }
      });

      const topDevices = Object.entries(deviceCounts)
        .map(([device, count]) => ({ device, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      return {
        activeSessions,
        activeUsers,
        averageSessionDuration,
        topDevices
      };
    } catch (error) {
      console.error('Error getting session stats:', error);
      return {
        activeSessions: 0,
        activeUsers: 0,
        averageSessionDuration: 0,
        topDevices: []
      };
    }
  }
}

export default SessionSecurityService;
