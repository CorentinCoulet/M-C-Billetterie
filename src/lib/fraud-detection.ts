/**
 * Fraud Detection Service
 * Advanced fraud detection for payments and user behavior
 */

import type { Order, User } from '../generated/prisma';
import { AuditService } from './audit-service';
import { logger } from './logger';
import prisma from './prisma';

interface FraudScore {
  score: number; // 0-100, higher = more suspicious
  risk: 'low' | 'medium' | 'high' | 'critical';
  reasons: string[];
  blocked: boolean;
}

interface UserBehaviorPattern {
  userId: string;
  recentLogins: number;
  deviceChanges: number;
  locationChanges: number;
  failedAttempts: number;
  paymentVelocity: number;
  suspiciousPatterns: string[];
}

interface PaymentPattern {
  orderId: string;
  amount: number;
  currency: string;
  velocity: number;
  cardFingerprint?: string;
  ipAddress: string;
  deviceInfo?: string;
  suspicious: boolean;
}

export class FraudDetectionService {
  private readonly HIGH_RISK_COUNTRIES = [
    'NG', 'GH', 'ID', 'PK', 'BD', 'VN', 'PH', 'EG'
  ];
  
  private readonly SUSPICIOUS_EMAIL_DOMAINS = [
    '10minutemail.com', 'guerrillamail.com', 'mailinator.com',
    'throwaway.email', 'temp-mail.org'
  ];

  /**
   * Analyze user behavior for fraud patterns
   */
  async analyzeUserBehavior(userId: string, ipAddress: string, userAgent?: string): Promise<FraudScore> {
    const pattern = await this.getUserBehaviorPattern(userId, ipAddress, userAgent);
    const score = this.calculateUserRiskScore(pattern);
    
    return this.createFraudScore(score, pattern.suspiciousPatterns);
  }

  /**
   * Analyze payment for fraud patterns
   */
  async analyzePayment(
    order: Order & { user: User },
    paymentData: {
      amount: number;
      currency: string;
      cardFingerprint?: string;
      ipAddress: string;
      deviceInfo?: string;
    }
  ): Promise<FraudScore> {
    const pattern = await this.getPaymentPattern(order, paymentData);
    const score = this.calculatePaymentRiskScore(pattern, order.user);
    
    const reasons = this.buildPaymentRiskReasons(pattern, order.user);
    return this.createFraudScore(score, reasons);
  }

  /**
   * Check for velocity-based fraud
   */
  async checkPaymentVelocity(userId: string, amount: number): Promise<boolean> {
    const now = new Date();
    const oneHour = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDay = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Check payments in last hour
    const hourlyPayments = await prisma.order.findMany({
      where: {
        userId,
        createdAt: { gte: oneHour },
        status: { in: ['paid', 'pending_payment'] }
      },
      select: { totalPrice: true }
    });

    // Check payments in last day
    const dailyPayments = await prisma.order.findMany({
      where: {
        userId,
        createdAt: { gte: oneDay },
        status: { in: ['paid', 'pending_payment'] }
      },
      select: { totalPrice: true }
    });

    const hourlyTotal = hourlyPayments.reduce((sum, p) => sum + p.totalPrice, 0);
    const dailyTotal = dailyPayments.reduce((sum, p) => sum + p.totalPrice, 0);

    // Velocity thresholds
    const suspiciousHourly = hourlyTotal > 500; // More than €500/hour
    const suspiciousDaily = dailyTotal > 2000; // More than €2000/day
    const suspiciousCount = hourlyPayments.length > 5; // More than 5 payments/hour

    return suspiciousHourly || suspiciousDaily || suspiciousCount;
  }

  /**
   * Check for duplicate card usage
   */
  async checkCardDuplication(cardFingerprint: string, userId: string): Promise<boolean> {
    if (!cardFingerprint) return false;

    const cardUsage = await prisma.payment.findMany({
      where: {
        transactionId: { contains: cardFingerprint }, // Assuming we store card fingerprint in transaction data
        order: {
          userId: { not: userId }
        }
      },
      include: {
        order: {
          select: { userId: true }
        }
      }
    });

    // Same card used by more than 3 different users = suspicious
    const uniqueUsers = new Set(cardUsage.map(p => p.order.userId));
    return uniqueUsers.size > 3;
  }

  /**
   * Check for suspicious login patterns
   */
  async checkSuspiciousLogins(userId: string): Promise<{
    suspicious: boolean;
    reasons: string[];
  }> {
    const reasons: string[] = [];
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Get recent login attempts
    const recentLogins = await prisma.loginAttempt.findMany({
      where: {
        userId,
        timestamp: { gte: oneDayAgo }
      },
      orderBy: { timestamp: 'desc' }
    });

    if (recentLogins.length === 0) return { suspicious: false, reasons: [] };

    // Check for rapid succession logins
    const rapidLogins = recentLogins.filter((login, index) => {
      if (index === 0) return false;
      const timeDiff = login.timestamp.getTime() - recentLogins[index - 1].timestamp.getTime();
      return timeDiff < 10000; // Less than 10 seconds apart
    });

    if (rapidLogins.length > 3) {
      reasons.push('Multiple rapid login attempts');
    }

    // Check for geographic inconsistencies
    const uniqueIPs = [...new Set(recentLogins.map(l => l.ipAddress))];
    if (uniqueIPs.length > 5) {
      reasons.push('Multiple IP addresses used');
    }

    // Check for unusual times (middle of the night for user's timezone)
    const nightLogins = recentLogins.filter(login => {
      const hour = login.timestamp.getUTCHours();
      return hour >= 2 && hour <= 5; // 2 AM - 5 AM UTC
    });

    if (nightLogins.length > 3) {
      reasons.push('Multiple logins during unusual hours');
    }

    // Check failed attempts followed by immediate success
    const failedThenSuccess = recentLogins.some((login, index) => {
      if (index === 0 || !login.success) return false;
      const prevLogin = recentLogins[index - 1];
      return !prevLogin.success && 
             (login.timestamp.getTime() - prevLogin.timestamp.getTime()) < 30000;
    });

    if (failedThenSuccess) {
      reasons.push('Failed attempts followed by immediate success');
    }

    return {
      suspicious: reasons.length > 0,
      reasons
    };
  }

  /**
   * Analyze account takeover indicators
   */
  async detectAccountTakeover(userId: string, currentSession: {
    ipAddress: string;
    userAgent?: string;
    deviceInfo?: string;
  }): Promise<FraudScore> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        loginAttempts: {
          where: {
            timestamp: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
          },
          orderBy: { timestamp: 'desc' }
        }
      }
    });

    if (!user) {
      return this.createFraudScore(0, []);
    }

    const reasons: string[] = [];
    let score = 0;

    // Check for sudden change in access patterns
    const recentLogins = user.loginAttempts.slice(0, 10);
    const historicalLogins = user.loginAttempts.slice(10);

    if (historicalLogins.length > 0) {
      // Check IP address changes
      const recentIPs = new Set(recentLogins.map(l => l.ipAddress));
      const historicalIPs = new Set(historicalLogins.map(l => l.ipAddress));
      
      const newIPs = [...recentIPs].filter(ip => !historicalIPs.has(ip));
      if (newIPs.length > 0 && recentIPs.size === newIPs.length) {
        score += 40;
        reasons.push('Complete change in IP address patterns');
      }

      // Check user agent changes
      const recentUserAgents = new Set(recentLogins.map(l => l.userAgent).filter(Boolean));
      const historicalUserAgents = new Set(historicalLogins.map(l => l.userAgent).filter(Boolean));
      
      const newUserAgents = [...recentUserAgents].filter(ua => !historicalUserAgents.has(ua));
      if (newUserAgents.length > 0 && recentUserAgents.size === newUserAgents.length) {
        score += 30;
        reasons.push('Complete change in device/browser patterns');
      }
    }

    // Check for password changes after suspicious activity
    if (user.passwordChangedAt && user.passwordChangedAt > new Date(Date.now() - 24 * 60 * 60 * 1000)) {
      const suspiciousLogins = await this.checkSuspiciousLogins(userId);
      if (suspiciousLogins.suspicious) {
        score += 25;
        reasons.push('Password changed after suspicious login activity');
      }
    }

    // Check for rapid account modifications
    const recentLogs = await prisma.auditLog.findMany({
      where: {
        userId,
        timestamp: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        action: { in: ['user.profile_update', 'user.email_change', 'user.password_change'] }
      }
    });

    if (recentLogs.length > 3) {
      score += 20;
      reasons.push('Multiple rapid account modifications');
    }

    return this.createFraudScore(score, reasons);
  }

  /**
   * Block user if fraud score is too high
   */
  async processRiskAssessment(userId: string, fraudScore: FraudScore): Promise<void> {
    if (fraudScore.blocked) {
      // Block user account
      await prisma.blockedUser.upsert({
        where: { userId },
        update: { 
          reason: `Fraud detection: ${fraudScore.reasons.join(', ')}` 
        },
        create: {
          userId,
          reason: `Fraud detection: ${fraudScore.reasons.join(', ')}`
        }
      });

      // Log the blocking
      await AuditService.logEvent({
        action: 'security.user_blocked_fraud',
        resourceType: 'user',
        resourceId: userId,
        details: { 
          fraudScore: fraudScore.score,
          reasons: fraudScore.reasons
        },
        result: 'success',
        riskLevel: 'critical',
        ipAddress: 'system'
      });

      logger.warn(`User ${userId} blocked due to fraud detection`, fraudScore);
    } else if (fraudScore.risk === 'high') {
      // Log high-risk activity but don't block
      await AuditService.logEvent({
        action: 'security.high_risk_activity',
        resourceType: 'user',
        resourceId: userId,
        details: {
          fraudScore: fraudScore.score,
          reasons: fraudScore.reasons
        },
        result: 'success',
        riskLevel: 'high',
        ipAddress: 'system'
      });

      logger.warn(`High-risk activity detected for user ${userId}`, fraudScore);
    }
  }

  /**
   * Helper methods
   */
  private async getUserBehaviorPattern(userId: string, ipAddress: string, userAgent?: string): Promise<UserBehaviorPattern> {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const recentLogins = await prisma.loginAttempt.count({
      where: {
        userId,
        timestamp: { gte: oneDayAgo },
        success: true
      }
    });

    const failedAttempts = await prisma.loginAttempt.count({
      where: {
        userId,
        timestamp: { gte: oneDayAgo },
        success: false
      }
    });

    const recentPayments = await prisma.order.count({
      where: {
        userId,
        createdAt: { gte: oneDayAgo }
      }
    });

    const suspiciousPatterns: string[] = [];

    // Check for suspicious patterns
    if (recentLogins > 20) suspiciousPatterns.push('Excessive login frequency');
    if (failedAttempts > 10) suspiciousPatterns.push('High number of failed login attempts');
    if (recentPayments > 10) suspiciousPatterns.push('Unusually high payment activity');

    return {
      userId,
      recentLogins,
      deviceChanges: 0, // Simplified for now
      locationChanges: 0, // Would need IP geolocation
      failedAttempts,
      paymentVelocity: recentPayments,
      suspiciousPatterns
    };
  }

  private async getPaymentPattern(
    order: Order & { user: User },
    paymentData: any
  ): Promise<PaymentPattern> {
    const velocity = await this.checkPaymentVelocity(order.userId, order.totalPrice);
    
    return {
      orderId: order.id,
      amount: order.totalPrice,
      currency: order.currency,
      velocity: velocity ? 1 : 0,
      cardFingerprint: paymentData.cardFingerprint,
      ipAddress: paymentData.ipAddress,
      deviceInfo: paymentData.deviceInfo,
      suspicious: velocity
    };
  }

  private calculateUserRiskScore(pattern: UserBehaviorPattern): number {
    let score = 0;

    // Base scoring
    if (pattern.recentLogins > 50) score += 30;
    else if (pattern.recentLogins > 20) score += 15;

    if (pattern.failedAttempts > 20) score += 40;
    else if (pattern.failedAttempts > 10) score += 20;

    if (pattern.paymentVelocity > 20) score += 35;
    else if (pattern.paymentVelocity > 10) score += 15;

    // Pattern-based scoring
    score += pattern.suspiciousPatterns.length * 10;

    return Math.min(score, 100);
  }

  private calculatePaymentRiskScore(pattern: PaymentPattern, user: User): number {
    let score = 0;

    // Amount-based scoring
    if (pattern.amount > 1000) score += 15;
    else if (pattern.amount > 500) score += 10;

    // Velocity scoring
    if (pattern.suspicious) score += 40;

    // User-based scoring
    const accountAge = Date.now() - user.createdAt.getTime();
    const daysOld = accountAge / (1000 * 60 * 60 * 24);
    
    if (daysOld < 1) score += 25;
    else if (daysOld < 7) score += 15;

    // Email domain scoring
    const emailDomain = user.email.split('@')[1];
    if (this.SUSPICIOUS_EMAIL_DOMAINS.includes(emailDomain)) {
      score += 30;
    }

    return Math.min(score, 100);
  }

  private buildPaymentRiskReasons(pattern: PaymentPattern, user: User): string[] {
    const reasons: string[] = [];

    if (pattern.amount > 1000) reasons.push('High transaction amount');
    if (pattern.suspicious) reasons.push('Payment velocity exceeded');
    
    const accountAge = Date.now() - user.createdAt.getTime();
    const daysOld = accountAge / (1000 * 60 * 60 * 24);
    
    if (daysOld < 1) reasons.push('Very new account');
    
    const emailDomain = user.email.split('@')[1];
    if (this.SUSPICIOUS_EMAIL_DOMAINS.includes(emailDomain)) {
      reasons.push('Suspicious email domain');
    }

    return reasons;
  }

  private createFraudScore(score: number, reasons: string[]): FraudScore {
    let risk: 'low' | 'medium' | 'high' | 'critical';
    let blocked = false;

    if (score >= 80) {
      risk = 'critical';
      blocked = true;
    } else if (score >= 60) {
      risk = 'high';
    } else if (score >= 40) {
      risk = 'medium';
    } else {
      risk = 'low';
    }

    return {
      score,
      risk,
      reasons,
      blocked
    };
  }
}

export const fraudDetectionService = new FraudDetectionService();
