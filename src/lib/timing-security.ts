import crypto from 'crypto';
import { logger } from '../lib/logger';

/**
 * Timing Attack Protection Utilities
 * Prevents timing-based attacks on authentication and sensitive operations
 */

/**
 * Constant-time string comparison to prevent timing attacks
 */
export function constantTimeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  
  return result === 0;
}

/**
 * Constant-time buffer comparison
 */
export function constantTimeBufferEquals(a: Buffer, b: Buffer): boolean {
  if (a.length !== b.length) {
    return false;
  }
  
  return crypto.timingSafeEqual(a, b);
}

/**
 * Add artificial delay to prevent timing analysis
 */
export async function artificialDelay(minMs: number = 100, maxMs: number = 500): Promise<void> {
  const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * Timing-safe authentication wrapper
 */
export async function timingSafeAuth<T>(
  authFunction: () => Promise<T | null>,
  minExecutionTime: number = 200
): Promise<T | null> {
  const startTime = Date.now();
  
  try {
    const result = await authFunction();
    
    // Ensure minimum execution time to prevent timing analysis
    const executionTime = Date.now() - startTime;
    if (executionTime < minExecutionTime) {
      await new Promise(resolve => 
        setTimeout(resolve, minExecutionTime - executionTime)
      );
    }
    
    return result;
  } catch (error) {
    // Ensure same execution time for errors
    const executionTime = Date.now() - startTime;
    if (executionTime < minExecutionTime) {
      await new Promise(resolve => 
        setTimeout(resolve, minExecutionTime - executionTime)
      );
    }
    
    throw error;
  }
}

/**
 * Generate cryptographically secure random string
 */
export function generateSecureRandom(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Secure hash comparison for passwords
 */
export async function secureHashCompare(
  inputHash: string, 
  storedHash: string,
  minTime: number = 100
): Promise<boolean> {
  const startTime = Date.now();
  
  // Always perform the same operations regardless of early failures
  let isValid = false;
  
  if (inputHash && storedHash && inputHash.length === storedHash.length) {
    isValid = constantTimeEquals(inputHash, storedHash);
  }
  
  // Add minimum execution time
  const executionTime = Date.now() - startTime;
  if (executionTime < minTime) {
    await new Promise(resolve => setTimeout(resolve, minTime - executionTime));
  }
  
  return isValid;
}

/**
 * Rate limiting with exponential backoff for failed attempts
 */
export class TimingBasedRateLimit {
  private attempts: Map<string, { count: number; lastAttempt: number; backoffUntil: number }> = new Map();
  private readonly maxAttempts: number;
  private readonly baseBackoffMs: number;
  private readonly maxBackoffMs: number;

  constructor(
    maxAttempts: number = 5,
    baseBackoffMs: number = 1000,
    maxBackoffMs: number = 3600000 // 1 hour
  ) {
    this.maxAttempts = maxAttempts;
    this.baseBackoffMs = baseBackoffMs;
    this.maxBackoffMs = maxBackoffMs;
  }

  /**
   * Check if request should be blocked
   */
  isBlocked(identifier: string): boolean {
    const now = Date.now();
    const attempt = this.attempts.get(identifier);
    
    if (!attempt) {
      return false;
    }
    
    return now < attempt.backoffUntil;
  }

  /**
   * Record failed attempt
   */
  recordFailedAttempt(identifier: string): void {
    const now = Date.now();
    const attempt = this.attempts.get(identifier) || { count: 0, lastAttempt: 0, backoffUntil: 0 };
    
    // Reset counter if last attempt was more than 1 hour ago
    if (now - attempt.lastAttempt > 3600000) {
      attempt.count = 0;
    }
    
    attempt.count++;
    attempt.lastAttempt = now;
    
    if (attempt.count >= this.maxAttempts) {
      // Exponential backoff: 2^(attempts - maxAttempts) * baseBackoff
      const backoffMultiplier = Math.pow(2, Math.min(attempt.count - this.maxAttempts, 10));
      const backoffMs = Math.min(this.baseBackoffMs * backoffMultiplier, this.maxBackoffMs);
      attempt.backoffUntil = now + backoffMs;
      
      logger.warn('Rate limit triggered with exponential backoff', {
        identifier,
        attempts: attempt.count,
        backoffUntil: new Date(attempt.backoffUntil).toISOString(),
        backoffMs
      });
    }
    
    this.attempts.set(identifier, attempt);
  }

  /**
   * Record successful attempt (resets counter)
   */
  recordSuccessfulAttempt(identifier: string): void {
    this.attempts.delete(identifier);
  }

  /**
   * Get remaining backoff time in milliseconds
   */
  getRemainingBackoff(identifier: string): number {
    const attempt = this.attempts.get(identifier);
    if (!attempt) {
      return 0;
    }
    
    const now = Date.now();
    return Math.max(0, attempt.backoffUntil - now);
  }

  /**
   * Clean expired entries
   */
  cleanup(): void {
    const now = Date.now();
    for (const [identifier, attempt] of this.attempts.entries()) {
      if (now > attempt.backoffUntil && now - attempt.lastAttempt > 3600000) {
        this.attempts.delete(identifier);
      }
    }
  }
}

/**
 * Global rate limiter instance
 */
export const globalRateLimit = new TimingBasedRateLimit();

// Cleanup expired entries every 5 minutes
setInterval(() => globalRateLimit.cleanup(), 300000);

/**
 * Secure random delay for sensitive operations
 */
export async function secureRandomDelay(baseMs: number = 100, varianceMs: number = 200): Promise<void> {
  const delay = baseMs + crypto.randomInt(0, varianceMs);
  return new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * Memory-hard function for additional protection
 */
export function memoryHardFunction(input: string, iterations: number = 1000): string {
  let result = input;
  const memory = new Array(iterations);
  
  for (let i = 0; i < iterations; i++) {
    result = crypto.createHash('sha256').update(result + i).digest('hex');
    memory[i] = result;
  }
  
  // Use memory content to prevent optimization
  const finalHash = crypto.createHash('sha256')
    .update(memory.join(''))
    .digest('hex');
  
  return finalHash;
}

export default {
  constantTimeEquals,
  constantTimeBufferEquals,
  artificialDelay,
  timingSafeAuth,
  generateSecureRandom,
  secureHashCompare,
  TimingBasedRateLimit,
  globalRateLimit,
  secureRandomDelay,
  memoryHardFunction
};
