import { createHash, randomBytes, pbkdf2Sync } from 'crypto';

/**
 * Security utilities for the financial dashboard
 */

/**
 * Generate a secure random token
 */
export function generateSecureToken(length: number = 32): string {
  return randomBytes(length).toString('hex');
}

/**
 * Hash a password using PBKDF2
 */
export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const saltBuffer = salt ? Buffer.from(salt, 'hex') : randomBytes(32);
  const hash = pbkdf2Sync(password, saltBuffer, 100000, 64, 'sha512');
  
  return {
    hash: hash.toString('hex'),
    salt: saltBuffer.toString('hex'),
  };
}

/**
 * Verify a password against a hash
 */
export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const { hash: computedHash } = hashPassword(password, salt);
  return computedHash === hash;
}

/**
 * Generate a SHA-256 hash of input data
 */
export function sha256Hash(data: string): string {
  return createHash('sha256').update(data).digest('hex');
}

/**
 * Sanitize user input to prevent XSS attacks
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove < and > characters
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  score: number;
  feedback: string[];
} {
  const feedback: string[] = [];
  let score = 0;

  // Length check
  if (password.length >= 8) {
    score += 1;
  } else {
    feedback.push('Password must be at least 8 characters long');
  }

  // Uppercase check
  if (/[A-Z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Password must contain at least one uppercase letter');
  }

  // Lowercase check
  if (/[a-z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Password must contain at least one lowercase letter');
  }

  // Number check
  if (/\d/.test(password)) {
    score += 1;
  } else {
    feedback.push('Password must contain at least one number');
  }

  // Special character check
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Password must contain at least one special character');
  }

  // Common password check
  const commonPasswords = [
    'password', '123456', '123456789', 'qwerty', 'abc123',
    'password123', 'admin', 'letmein', 'welcome', 'monkey'
  ];
  
  if (commonPasswords.includes(password.toLowerCase())) {
    score = 0;
    feedback.push('Password is too common');
  }

  return {
    isValid: score >= 5 && feedback.length === 0,
    score,
    feedback,
  };
}

/**
 * Generate a secure API key
 */
export function generateApiKey(): string {
  const prefix = 'fd_'; // financial dashboard prefix
  const key = generateSecureToken(24);
  return `${prefix}${key}`;
}

/**
 * Mask sensitive data for logging
 */
export function maskSensitiveData(data: any): any {
  if (typeof data !== 'object' || data === null) {
    return data;
  }

  const sensitiveFields = [
    'password', 'token', 'secret', 'key', 'credential',
    'ssn', 'social_security', 'credit_card', 'bank_account',
    'routing_number', 'account_number', 'pin', 'cvv'
  ];

  const masked = { ...data };

  for (const [key, value] of Object.entries(masked)) {
    const lowerKey = key.toLowerCase();
    
    if (sensitiveFields.some(field => lowerKey.includes(field))) {
      if (typeof value === 'string' && value.length > 0) {
        // Show first 2 and last 2 characters, mask the rest
        if (value.length <= 4) {
          masked[key] = '*'.repeat(value.length);
        } else {
          masked[key] = value.slice(0, 2) + '*'.repeat(value.length - 4) + value.slice(-2);
        }
      } else {
        masked[key] = '[MASKED]';
      }
    } else if (typeof value === 'object' && value !== null) {
      masked[key] = maskSensitiveData(value);
    }
  }

  return masked;
}

/**
 * Rate limiting helper
 */
export class RateLimiter {
  private requests: Map<string, number[]> = new Map();

  constructor(
    private maxRequests: number,
    private windowMs: number
  ) {}

  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // Get existing requests for this identifier
    const requests = this.requests.get(identifier) || [];

    // Filter out requests outside the window
    const validRequests = requests.filter(time => time > windowStart);

    // Check if under the limit
    if (validRequests.length < this.maxRequests) {
      validRequests.push(now);
      this.requests.set(identifier, validRequests);
      return true;
    }

    return false;
  }

  reset(identifier: string): void {
    this.requests.delete(identifier);
  }

  cleanup(): void {
    const now = Date.now();
    for (const [identifier, requests] of this.requests.entries()) {
      const validRequests = requests.filter(time => time > now - this.windowMs);
      if (validRequests.length === 0) {
        this.requests.delete(identifier);
      } else {
        this.requests.set(identifier, validRequests);
      }
    }
  }
}

/**
 * Input validation helpers
 */
export const validators = {
  email: (email: string): boolean => isValidEmail(email),
  
  amount: (amount: number): boolean => {
    return typeof amount === 'number' && 
           !isNaN(amount) && 
           isFinite(amount) && 
           amount >= -999999999.99 && 
           amount <= 999999999.99;
  },
  
  currency: (currency: string): boolean => {
    const validCurrencies = ['GBP', 'USD', 'EUR', 'JPY', 'CAD', 'AUD'];
    return validCurrencies.includes(currency.toUpperCase());
  },
  
  date: (date: string): boolean => {
    const parsedDate = new Date(date);
    return !isNaN(parsedDate.getTime()) && 
           parsedDate >= new Date('1900-01-01') && 
           parsedDate <= new Date('2100-12-31');
  },
  
  uuid: (uuid: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  },
};
