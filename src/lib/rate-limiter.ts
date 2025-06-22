import { Redis } from '@upstash/redis';
import { NextRequest } from 'next/server';
import * as Sentry from "@sentry/nextjs";

// Rate limiter configuration
interface RateLimitConfig {
  windowMs: number;        // Time window in milliseconds
  maxRequests: number;     // Maximum requests per window
  keyGenerator?: (req: NextRequest) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  onLimitReached?: (key: string, req: NextRequest) => void;
}

// Rate limit result
interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetTime: number;
  totalHits: number;
}

// Predefined rate limit configurations for different endpoints
export const RATE_LIMIT_CONFIGS = {
  // API endpoints - general
  api_general: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
  },
  
  // Authentication endpoints - stricter
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
  },
  
  // Banking API endpoints - very strict
  banking_api: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 10,
  },
  
  // Export endpoints - moderate
  export: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 20,
  },
  
  // File upload endpoints
  upload: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 50,
  },
  
  // Password reset - very strict
  password_reset: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3,
  },
  
  // OTP verification - strict
  otp_verification: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 10,
  },
} as const;

export class RateLimiter {
  private redis: Redis;
  private enabled: boolean;

  constructor() {
    // Initialize Redis connection
    this.enabled = !!process.env.REDIS_URL;
    
    if (this.enabled) {
      this.redis = new Redis({
        url: process.env.REDIS_URL!,
        token: process.env.REDIS_TOKEN,
      });
    } else {
      // Fallback for development/testing without Redis
      console.warn('Redis not configured - rate limiting disabled');
    }
  }

  // Check if request should be rate limited
  async checkRateLimit(
    req: NextRequest,
    config: RateLimitConfig
  ): Promise<RateLimitResult> {
    if (!this.enabled) {
      // Return success if Redis is not configured (development mode)
      return {
        success: true,
        remaining: config.maxRequests,
        resetTime: Date.now() + config.windowMs,
        totalHits: 0,
      };
    }

    try {
      const key = config.keyGenerator ? config.keyGenerator(req) : this.generateKey(req);
      const window = Math.floor(Date.now() / config.windowMs);
      const redisKey = `rate_limit:${key}:${window}`;

      // Increment counter and set expiry
      const pipeline = this.redis.pipeline();
      pipeline.incr(redisKey);
      pipeline.expire(redisKey, Math.ceil(config.windowMs / 1000));
      
      const results = await pipeline.exec();
      const count = results[0] as number;

      const remaining = Math.max(0, config.maxRequests - count);
      const resetTime = (window + 1) * config.windowMs;
      const success = count <= config.maxRequests;

      if (!success) {
        // Rate limit exceeded
        await this.handleRateLimitExceeded(key, req, config);
      }

      return {
        success,
        remaining,
        resetTime,
        totalHits: count,
      };

    } catch (error) {
      // If Redis fails, allow the request but log the error
      console.error('Rate limiter error:', error);
      Sentry.captureException(error, {
        tags: {
          'rate_limiter.error': true,
        },
      });

      return {
        success: true,
        remaining: config.maxRequests,
        resetTime: Date.now() + config.windowMs,
        totalHits: 0,
      };
    }
  }

  // Generate rate limit key from request
  private generateKey(req: NextRequest): string {
    // Try to get user ID from request (if authenticated)
    const userId = this.extractUserId(req);
    if (userId) {
      return `user:${userId}`;
    }

    // Fall back to IP address
    const ip = this.getClientIP(req);
    return `ip:${ip}`;
  }

  // Extract user ID from request
  private extractUserId(req: NextRequest): string | null {
    try {
      // This would depend on your authentication implementation
      // Example implementations:
      
      // From JWT token in Authorization header
      const authHeader = req.headers.get('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        // Parse JWT and extract user ID
        // This is a simplified example - use your JWT library
        const token = authHeader.substring(7);
        // const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // return decoded.sub || decoded.userId;
      }

      // From session cookie
      const sessionCookie = req.cookies.get('session')?.value;
      if (sessionCookie) {
        // Parse session and extract user ID
        // return parseSession(sessionCookie).userId;
      }

      // From X-User-ID header (if using a proxy that sets this)
      const userIdHeader = req.headers.get('x-user-id');
      if (userIdHeader) {
        return userIdHeader;
      }

      return null;
    } catch (error) {
      console.error('Error extracting user ID:', error);
      return null;
    }
  }

  // Get client IP address
  private getClientIP(req: NextRequest): string {
    // Check various headers for client IP
    const forwardedFor = req.headers.get('x-forwarded-for');
    if (forwardedFor) {
      return forwardedFor.split(',')[0].trim();
    }

    const realIP = req.headers.get('x-real-ip');
    if (realIP) {
      return realIP;
    }

    const cfConnectingIP = req.headers.get('cf-connecting-ip');
    if (cfConnectingIP) {
      return cfConnectingIP;
    }

    // Fallback
    return req.ip || 'unknown';
  }

  // Handle rate limit exceeded
  private async handleRateLimitExceeded(
    key: string,
    req: NextRequest,
    config: RateLimitConfig
  ): Promise<void> {
    const ip = this.getClientIP(req);
    const userAgent = req.headers.get('user-agent') || 'unknown';
    const endpoint = req.nextUrl.pathname;

    // Log rate limit violation
    console.warn(`Rate limit exceeded for key: ${key}, IP: ${ip}, endpoint: ${endpoint}`);

    // Send to Sentry for monitoring
    Sentry.captureMessage('Rate limit exceeded', {
      level: 'warning',
      tags: {
        'rate_limit.exceeded': true,
        'endpoint': endpoint,
      },
      extra: {
        key,
        ip,
        userAgent,
        maxRequests: config.maxRequests,
        windowMs: config.windowMs,
      },
    });

    // Call custom handler if provided
    if (config.onLimitReached) {
      config.onLimitReached(key, req);
    }

    // For financial endpoints, this might trigger additional security measures
    if (endpoint.includes('/api/banking') || endpoint.includes('/api/auth')) {
      await this.handleSuspiciousActivity(key, ip, endpoint);
    }
  }

  // Handle suspicious activity (multiple rate limit violations)
  private async handleSuspiciousActivity(
    key: string,
    ip: string,
    endpoint: string
  ): Promise<void> {
    try {
      const suspiciousKey = `suspicious:${key}`;
      const count = await this.redis.incr(suspiciousKey);
      await this.redis.expire(suspiciousKey, 3600); // 1 hour

      if (count >= 3) {
        // Multiple violations - potential attack
        Sentry.captureMessage('Potential attack detected', {
          level: 'error',
          tags: {
            'security.attack': true,
            'rate_limit.violations': count,
          },
          extra: {
            key,
            ip,
            endpoint,
            violations: count,
          },
        });

        // Could implement additional measures here:
        // - Temporary IP blocking
        // - Account suspension
        // - Alerting security team
      }
    } catch (error) {
      console.error('Error handling suspicious activity:', error);
    }
  }

  // Get rate limit status for a key
  async getRateLimitStatus(
    req: NextRequest,
    config: RateLimitConfig
  ): Promise<RateLimitResult> {
    if (!this.enabled) {
      return {
        success: true,
        remaining: config.maxRequests,
        resetTime: Date.now() + config.windowMs,
        totalHits: 0,
      };
    }

    try {
      const key = config.keyGenerator ? config.keyGenerator(req) : this.generateKey(req);
      const window = Math.floor(Date.now() / config.windowMs);
      const redisKey = `rate_limit:${key}:${window}`;

      const count = await this.redis.get(redisKey) || 0;
      const remaining = Math.max(0, config.maxRequests - Number(count));
      const resetTime = (window + 1) * config.windowMs;

      return {
        success: Number(count) <= config.maxRequests,
        remaining,
        resetTime,
        totalHits: Number(count),
      };
    } catch (error) {
      console.error('Error getting rate limit status:', error);
      return {
        success: true,
        remaining: config.maxRequests,
        resetTime: Date.now() + config.windowMs,
        totalHits: 0,
      };
    }
  }

  // Reset rate limit for a key (admin function)
  async resetRateLimit(req: NextRequest, config: RateLimitConfig): Promise<void> {
    if (!this.enabled) return;

    try {
      const key = config.keyGenerator ? config.keyGenerator(req) : this.generateKey(req);
      const window = Math.floor(Date.now() / config.windowMs);
      const redisKey = `rate_limit:${key}:${window}`;

      await this.redis.del(redisKey);
    } catch (error) {
      console.error('Error resetting rate limit:', error);
    }
  }

  // Clean up expired keys (maintenance function)
  async cleanup(): Promise<void> {
    if (!this.enabled) return;

    try {
      // This would be implemented based on your specific needs
      // Redis automatically expires keys, but you might want additional cleanup
      console.log('Rate limiter cleanup completed');
    } catch (error) {
      console.error('Error during rate limiter cleanup:', error);
    }
  }
}

// Singleton instance
export const rateLimiter = new RateLimiter();

// Convenience function to create rate limiting middleware
export function createRateLimitMiddleware(
  configKey: keyof typeof RATE_LIMIT_CONFIGS,
  customConfig?: Partial<RateLimitConfig>
) {
  return async (req: NextRequest) => {
    const baseConfig = RATE_LIMIT_CONFIGS[configKey];
    const config = { ...baseConfig, ...customConfig };
    
    const result = await rateLimiter.checkRateLimit(req, config);
    
    if (!result.success) {
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          message: 'Too many requests. Please try again later.',
          retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': config.maxRequests.toString(),
            'X-RateLimit-Remaining': result.remaining.toString(),
            'X-RateLimit-Reset': Math.ceil(result.resetTime / 1000).toString(),
            'Retry-After': Math.ceil((result.resetTime - Date.now()) / 1000).toString(),
          },
        }
      );
    }

    return null; // Continue processing
  };
}

// Helper function for API routes
export async function withRateLimit<T>(
  req: NextRequest,
  configKey: keyof typeof RATE_LIMIT_CONFIGS,
  handler: () => Promise<T>,
  customConfig?: Partial<RateLimitConfig>
): Promise<T | Response> {
  const middleware = createRateLimitMiddleware(configKey, customConfig);
  const rateLimitResponse = await middleware(req);
  
  if (rateLimitResponse) {
    return rateLimitResponse;
  }
  
  return handler();
}