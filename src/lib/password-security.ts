import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import prisma from './prisma';
import { PASSWORD_POLICY } from './security-config';

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  strength: 'weak' | 'medium' | 'strong' | 'very-strong';
  score: number;
}

export interface PasswordHistory {
  id: string;
  userId: string;
  passwordHash: string;
  createdAt: Date;
}

export class PasswordSecurityService {
  /**
   * Validates password strength with comprehensive checks
   */
  static validatePasswordStrength(password: string, userInfo?: { 
    email?: string; 
    firstName?: string; 
    lastName?: string; 
  }): PasswordValidationResult {
    const errors: string[] = [];
    let score = 0;

    // Length check
    if (!password || password.length < PASSWORD_POLICY.MIN_LENGTH) {
      errors.push(`Le mot de passe doit contenir au moins ${PASSWORD_POLICY.MIN_LENGTH} caractères`);
    } else {
      score += Math.min(password.length * 2, 20);
    }

    // Character requirements
    if (PASSWORD_POLICY.REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) {
      errors.push('Le mot de passe doit contenir au moins une majuscule');
    } else if (/[A-Z]/.test(password)) {
      score += 10;
    }

    if (PASSWORD_POLICY.REQUIRE_LOWERCASE && !/[a-z]/.test(password)) {
      errors.push('Le mot de passe doit contenir au moins une minuscule');
    } else if (/[a-z]/.test(password)) {
      score += 10;
    }

    if (PASSWORD_POLICY.REQUIRE_NUMBERS && !/\d/.test(password)) {
      errors.push('Le mot de passe doit contenir au moins un chiffre');
    } else if (/\d/.test(password)) {
      score += 10;
    }

    if (PASSWORD_POLICY.REQUIRE_SPECIAL_CHARS && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Le mot de passe doit contenir au moins un caractère spécial');
    } else if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      score += 15;
    }

    // Advanced checks
    if (password.length >= 16) score += 10;
    if (/[A-Z].*[A-Z]/.test(password)) score += 5;
    if (/\d.*\d/.test(password)) score += 5;
    if (/[!@#$%^&*(),.?":{}|<>].*[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 5;

    // Common password check
    if (PASSWORD_POLICY.FORBIDDEN_PASSWORDS.includes(password.toLowerCase())) {
      errors.push('Ce mot de passe est trop commun et n\'est pas autorisé');
      score = 0;
    }

    // Personal information check
    if (userInfo) {
      const personalInfo = [
        userInfo.email?.split('@')[0],
        userInfo.firstName,
        userInfo.lastName
      ].filter(Boolean);

      for (const info of personalInfo) {
        if (info && password.toLowerCase().includes(info.toLowerCase())) {
          errors.push('Le mot de passe ne doit pas contenir d\'informations personnelles');
          score -= 20;
          break;
        }
      }
    }

    // Sequential characters check
    if (/123|abc|qwe/i.test(password)) {
      errors.push('Le mot de passe ne doit pas contenir de séquences évidentes');
      score -= 15;
    }

    // Repeated characters check
    if (/(.)\1{2,}/.test(password)) {
      errors.push('Le mot de passe ne doit pas contenir plus de 2 caractères identiques consécutifs');
      score -= 10;
    }

    // Determine strength
    let strength: 'weak' | 'medium' | 'strong' | 'very-strong';
    if (score < 30) strength = 'weak';
    else if (score < 60) strength = 'medium';
    else if (score < 80) strength = 'strong';
    else strength = 'very-strong';

    return {
      isValid: errors.length === 0 && score >= 50,
      errors,
      strength,
      score: Math.max(0, score)
    };
  }

  /**
   * Checks if password was used recently (password history)
   */
  static async checkPasswordHistory(userId: string, newPassword: string): Promise<boolean> {
    try {
      const passwordHistory = await prisma.passwordHistory.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: PASSWORD_POLICY.PASSWORD_HISTORY,
      });

      for (const history of passwordHistory) {
        const isReused = await bcrypt.compare(newPassword, history.passwordHash);
        if (isReused) {
          return false; // Password was used recently
        }
      }

      return true; // Password is not in recent history
    } catch (error) {
      console.error('Error checking password history:', error);
      return true; // Allow change if history check fails
    }
  }

  /**
   * Saves password to history when changed
   */
  static async saveToPasswordHistory(userId: string, passwordHash: string): Promise<void> {
    try {
      // Add new password to history
      await prisma.passwordHistory.create({
        data: {
          userId,
          passwordHash,
          createdAt: new Date(),
        },
      });

      // Clean up old history entries
      const oldEntries = await prisma.passwordHistory.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: PASSWORD_POLICY.PASSWORD_HISTORY,
      });

      if (oldEntries.length > 0) {
        await prisma.passwordHistory.deleteMany({
          where: {
            id: { in: oldEntries.map((entry: any) => entry.id) }
          }
        });
      }
    } catch (error) {
      console.error('Error saving password history:', error);
    }
  }

  /**
   * Checks if user needs to change password (rotation policy)
   */
  static async checkPasswordRotation(userId: string): Promise<{
    needsRotation: boolean;
    daysSinceLastChange: number;
    maxDays: number;
  }> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { passwordChangedAt: true }
      });

      if (!user?.passwordChangedAt) {
        return { needsRotation: true, daysSinceLastChange: 999, maxDays: 90 };
      }

      const daysSinceLastChange = Math.floor(
        (Date.now() - user.passwordChangedAt.getTime()) / (1000 * 60 * 60 * 24)
      );

      const maxDays = 90; // Force password change every 90 days

      return {
        needsRotation: daysSinceLastChange >= maxDays,
        daysSinceLastChange,
        maxDays
      };
    } catch (error) {
      console.error('Error checking password rotation:', error);
      return { needsRotation: false, daysSinceLastChange: 0, maxDays: 90 };
    }
  }

  /**
   * Generates a secure random password
   */
  static generateSecurePassword(length: number = 16): string {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const special = '!@#$%^&*(),.?":{}|<>';
    
    let password = '';
    
    // Ensure at least one character from each category
    password += uppercase[crypto.randomInt(0, uppercase.length)];
    password += lowercase[crypto.randomInt(0, lowercase.length)];
    password += numbers[crypto.randomInt(0, numbers.length)];
    password += special[crypto.randomInt(0, special.length)];
    
    // Fill the rest randomly
    const allChars = uppercase + lowercase + numbers + special;
    for (let i = 4; i < length; i++) {
      password += allChars[crypto.randomInt(0, allChars.length)];
    }
    
    // Shuffle the password
    return password.split('').sort(() => crypto.randomInt(-1, 2)).join('');
  }

  /**
   * Hash password with secure settings
   */
  static async hashPassword(password: string): Promise<string> {
    const saltRounds = process.env.BCRYPT_ROUNDS ? 
      parseInt(process.env.BCRYPT_ROUNDS) : 12;
    return await bcrypt.hash(password, saltRounds);
  }

  /**
   * Verify password against hash
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash);
  }

  /**
   * Check for compromised passwords (basic implementation)
   */
  static async checkCompromisedPassword(password: string): Promise<boolean> {
    // In a real implementation, you would check against services like HaveIBeenPwned
    // For now, we'll just check against common passwords
    const commonPasswords = [
      'password', '123456', 'password123', 'admin', 'qwerty',
      '123456789', '12345678', '12345', '1234567890', '1234567',
      'password1', '1234', 'welcome', 'login', 'admin123'
    ];
    
    return commonPasswords.includes(password.toLowerCase());
  }
}

export default PasswordSecurityService;
