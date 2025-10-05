import crypto from 'crypto';
import { NextApiRequest, NextApiResponse } from 'next';
import { NextHandler } from 'next-connect';
import { logger } from '../lib/logger';
import prisma from '../lib/prisma';

/**
 * Advanced Bot Detection and Prevention
 * Implements multiple layers of bot detection and mitigation
 */

interface BotDetectionConfig {
  enableFingerprinting?: boolean;
  enableBehavioralAnalysis?: boolean;
  enableChallenges?: boolean;
  strictMode?: boolean;
  blockDuration?: number;
}

interface RequestFingerprint {
  userAgent: string;
  acceptLanguage: string;
  acceptEncoding: string;
  connection: string;
  upgradeInsecureRequests?: string;
  dnt?: string;
  cacheControl?: string;
}

interface BehavioralPattern {
  requestsPerMinute: number;
  uniqueEndpoints: Set<string>;
  statusCodes: Map<number, number>;
  averageResponseTime: number;
  mouseMovements?: number;
  keystrokes?: number;
  scrollEvents?: number;
}

class BotDetector {
  private suspiciousIPs = new Map<string, {
    score: number;
    lastSeen: number;
    patterns: BehavioralPattern;
    violations: string[];
  }>();

  private readonly config: Required<BotDetectionConfig>;
  private readonly commonBotSignatures: RegExp[];
  private readonly suspiciousHeaders: string[];

  constructor(config: BotDetectionConfig = {}) {
    this.config = {
      enableFingerprinting: config.enableFingerprinting ?? true,
      enableBehavioralAnalysis: config.enableBehavioralAnalysis ?? true,
      enableChallenges: config.enableChallenges ?? true,
      strictMode: config.strictMode ?? false,
      blockDuration: config.blockDuration ?? 3600000 // 1 hour
    };

    this.commonBotSignatures = [
      /bot/i, /crawl/i, /spider/i, /scan/i, /scrape/i,
      /python/i, /curl/i, /wget/i, /axios/i, /fetch/i,
      /headless/i, /phantom/i, /selenium/i, /puppeteer/i,
      /postman/i, /insomnia/i, /httpie/i
    ];

    this.suspiciousHeaders = [
      'x-forwarded-for',
      'x-real-ip',
      'x-originating-ip',
      'x-remote-ip',
      'x-remote-addr'
    ];
  }

  /**
   * Analyze request fingerprint
   */
  private analyzeFingerprint(req: NextApiRequest): number {
    let score = 0;
    const userAgent = req.headers['user-agent'] || '';

    // Check for bot signatures in user agent
    if (this.commonBotSignatures.some(pattern => pattern.test(userAgent))) {
      score += 50;
    }

    // Check for missing or suspicious headers
    if (!req.headers['accept-language']) score += 20;
    if (!req.headers['accept-encoding']) score += 15;
    if (!req.headers['accept']) score += 10;

    // Check for automation tools
    if (userAgent.includes('automation') || userAgent.includes('webdriver')) {
      score += 40;
    }

    // Check for suspicious header combinations
    const hasMultipleForwardedHeaders = this.suspiciousHeaders
      .filter(header => req.headers[header]).length > 1;
    if (hasMultipleForwardedHeaders) score += 25;

    // Very short or very long user agents are suspicious
    if (userAgent.length < 20 || userAgent.length > 500) {
      score += 15;
    }

    // Check for programmatic patterns
    if (userAgent.match(/^[A-Za-z]+\/[\d.]+$/)) { // Simple "Name/Version" pattern
      score += 30;
    }

    return Math.min(score, 100);
  }

  /**
   * Analyze behavioral patterns
   */
  private analyzeBehavior(ip: string, req: NextApiRequest): number {
    const now = Date.now();
    let ipData = this.suspiciousIPs.get(ip);

    if (!ipData) {
      ipData = {
        score: 0,
        lastSeen: now,
        patterns: {
          requestsPerMinute: 0,
          uniqueEndpoints: new Set(),
          statusCodes: new Map(),
          averageResponseTime: 0
        },
        violations: []
      };
    }

    // Update behavioral data
    ipData.patterns.uniqueEndpoints.add(req.url || '');
    ipData.lastSeen = now;

    let score = 0;

    // High request frequency
    const timeSinceLastRequest = now - ipData.lastSeen;
    if (timeSinceLastRequest < 100) { // Less than 100ms between requests
      score += 30;
      ipData.violations.push('HIGH_FREQUENCY_REQUESTS');
    }

    // Limited endpoint diversity (accessing same endpoint repeatedly)
    const uniqueEndpoints = ipData.patterns.uniqueEndpoints.size;
    const estimatedRequests = Math.max(1, (now - (ipData.lastSeen - 60000)) / 1000);
    const diversityRatio = uniqueEndpoints / estimatedRequests;
    
    if (diversityRatio < 0.1) { // Less than 10% endpoint diversity
      score += 25;
      ipData.violations.push('LOW_ENDPOINT_DIVERSITY');
    }

    // Suspicious request patterns
    const url = req.url || '';
    if (url.includes('/api/') && req.method === 'GET' && !req.headers['referer']) {
      score += 20;
      ipData.violations.push('API_WITHOUT_REFERER');
    }

    // Missing typical browser headers
    if (!req.headers['accept-language'] || !req.headers['accept-encoding']) {
      score += 15;
      ipData.violations.push('MISSING_BROWSER_HEADERS');
    }

    ipData.score = Math.min(ipData.score + score, 100);
    this.suspiciousIPs.set(ip, ipData);

    return ipData.score;
  }

  /**
   * Generate proof-of-work challenge
   */
  private generateChallenge(): { challenge: string; difficulty: number } {
    const challenge = crypto.randomBytes(16).toString('hex');
    const difficulty = 4; // Number of leading zeros required
    
    return { challenge, difficulty };
  }

  /**
   * Verify proof-of-work solution
   */
  private verifyChallenge(challenge: string, nonce: string, difficulty: number): boolean {
    const hash = crypto.createHash('sha256')
      .update(challenge + nonce)
      .digest('hex');
    
    return hash.startsWith('0'.repeat(difficulty));
  }

  /**
   * Main bot detection middleware
   */
  detect() {
    return async (req: NextApiRequest, res: NextApiResponse, next: NextHandler) => {
      const ip = this.getClientIP(req);
      let suspicionScore = 0;

      try {
        // Check if IP is already blocked
        const blockedIP = await prisma.blockedIP.findFirst({
          where: {
            ipAddress: ip,
            expiresAt: { gt: new Date() }
          }
        });

        if (blockedIP) {
          logger.warn('Blocked IP attempted access', { ip, reason: blockedIP.reason });
          return res.status(429).json({
            error: 'Access temporarily blocked',
            retryAfter: Math.ceil((blockedIP.expiresAt.getTime() - Date.now()) / 1000)
          });
        }

        // Fingerprinting analysis
        if (this.config.enableFingerprinting) {
          const fingerprintScore = this.analyzeFingerprint(req);
          suspicionScore += fingerprintScore;
          
          if (fingerprintScore > 40) {
            logger.info('Suspicious fingerprint detected', {
              ip, 
              userAgent: req.headers['user-agent'],
              score: fingerprintScore
            });
          }
        }

        // Behavioral analysis
        if (this.config.enableBehavioralAnalysis) {
          const behaviorScore = this.analyzeBehavior(ip, req);
          suspicionScore += behaviorScore;
        }

        // Log security event
        await prisma.securityLog.create({
          data: {
            type: 'bot_detection_scan',
            ip,
            userAgent: req.headers['user-agent'] || null,
            url: req.url,
            data: JSON.stringify({
              suspicionScore,
              method: req.method,
              fingerprintEnabled: this.config.enableFingerprinting,
              behaviorEnabled: this.config.enableBehavioralAnalysis
            })
          }
        });

        // Challenge suspicious requests
        if (suspicionScore > 60 && this.config.enableChallenges) {
          const challengeToken = req.headers['x-bot-challenge'] as string;
          const challengeNonce = req.headers['x-bot-nonce'] as string;

          if (!challengeToken || !challengeNonce) {
            const challenge = this.generateChallenge();
            
            logger.info('Issuing bot challenge', { ip, suspicionScore });
            
            return res.status(202).json({
              challenge: challenge.challenge,
              difficulty: challenge.difficulty,
              message: 'Complete the challenge to continue'
            });
          }

          // Verify challenge solution
          if (!this.verifyChallenge(challengeToken, challengeNonce, 4)) {
            logger.warn('Failed bot challenge', { ip });
            suspicionScore += 30;
          } else {
            logger.info('Bot challenge passed', { ip });
            suspicionScore = Math.max(0, suspicionScore - 30);
          }
        }

        // Block highly suspicious requests
        if (suspicionScore > 80 || (this.config.strictMode && suspicionScore > 50)) {
          await this.blockIP(ip, suspicionScore, 'High bot suspicion score');
          
          logger.warn('IP blocked due to bot detection', {
            ip,
            suspicionScore,
            userAgent: req.headers['user-agent']
          });

          return res.status(429).json({
            error: 'Access blocked due to suspicious activity',
            retryAfter: this.config.blockDuration / 1000
          });
        }

        // Add suspicion score to request for downstream middleware
        (req as any).suspicionScore = suspicionScore;

        return next();

      } catch (error) {
        logger.error('Bot detection error', { error, ip });
        // Fail open - don't block legitimate users due to detection errors
        return next();
      }
    };
  }

  /**
   * Block IP address
   */
  private async blockIP(ip: string, score: number, reason: string): Promise<void> {
    try {
      await prisma.blockedIP.upsert({
        where: { ipAddress: ip },
        create: {
          ipAddress: ip,
          reason: `Bot detection: ${reason} (score: ${score})`,
          expiresAt: new Date(Date.now() + this.config.blockDuration),
          blockCount: 1
        },
        update: {
          blockCount: { increment: 1 },
          expiresAt: new Date(Date.now() + this.config.blockDuration),
          reason: `Bot detection: ${reason} (score: ${score})`
        }
      });
    } catch (error) {
      logger.error('Failed to block IP', { error, ip });
    }
  }

  /**
   * Get client IP address
   */
  private getClientIP(req: NextApiRequest): string {
    const forwarded = req.headers['x-forwarded-for'] as string;
    const real = req.headers['x-real-ip'] as string;
    const ip = forwarded?.split(',')[0] || real || req.socket.remoteAddress || 'unknown';
    
    return ip.trim();
  }

  /**
   * Get bot detection statistics
   */
  async getStats(): Promise<{
    totalBlocked: number;
    activeBlocks: number;
    topBlockedIPs: Array<{ ip: string; count: number; reason: string }>;
  }> {
    const [totalBlocked, activeBlocks, topBlocked] = await Promise.all([
      prisma.blockedIP.count(),
      prisma.blockedIP.count({
        where: { expiresAt: { gt: new Date() } }
      }),
      prisma.blockedIP.findMany({
        orderBy: { blockCount: 'desc' },
        take: 10,
        select: {
          ipAddress: true,
          blockCount: true,
          reason: true
        }
      })
    ]);

    return {
      totalBlocked,
      activeBlocks,
      topBlockedIPs: topBlocked.map(b => ({
        ip: b.ipAddress,
        count: b.blockCount,
        reason: b.reason
      }))
    };
  }

  /**
   * Clean expired data
   */
  cleanup(): void {
    const now = Date.now();
    const expiredThreshold = 3600000; // 1 hour

    for (const [ip, data] of this.suspiciousIPs.entries()) {
      if (now - data.lastSeen > expiredThreshold) {
        this.suspiciousIPs.delete(ip);
      }
    }
  }
}

// Export singleton instance
export const botDetector = new BotDetector({
  enableFingerprinting: true,
  enableBehavioralAnalysis: true,
  enableChallenges: true,
  strictMode: process.env.NODE_ENV === 'production',
  blockDuration: 3600000 // 1 hour
});

// Cleanup expired data every 10 minutes
setInterval(() => botDetector.cleanup(), 600000);

export default botDetector;
