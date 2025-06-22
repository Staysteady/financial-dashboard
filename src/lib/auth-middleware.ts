import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from './supabase';

export interface AuthenticatedRequest extends NextRequest {
  user: {
    id: string;
    email: string;
  };
}

/**
 * Middleware to protect API routes and extract user information
 */
export async function withAuth(
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    try {
      const supabase = createServerSupabaseClient();
      
      // Get the user from the session
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error || !user) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }

      // Add user to request object
      const authenticatedReq = req as AuthenticatedRequest;
      authenticatedReq.user = {
        id: user.id,
        email: user.email!,
      };

      return await handler(authenticatedReq);
    } catch (error) {
      console.error('Auth middleware error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  };
}

/**
 * Rate limiting middleware for API routes
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function withRateLimit(
  handler: (req: NextRequest) => Promise<NextResponse>,
  options: {
    maxRequests: number;
    windowMs: number;
  } = { maxRequests: 100, windowMs: 15 * 60 * 1000 } // 100 requests per 15 minutes
) {
  return async (req: NextRequest) => {
    const ip = req.ip || req.headers.get('x-forwarded-for') || 'unknown';
    const now = Date.now();
    const windowStart = now - options.windowMs;

    // Clean up old entries
    for (const [key, value] of rateLimitMap.entries()) {
      if (value.resetTime < windowStart) {
        rateLimitMap.delete(key);
      }
    }

    const current = rateLimitMap.get(ip) || { count: 0, resetTime: now + options.windowMs };

    if (current.count >= options.maxRequests && current.resetTime > now) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { 
          status: 429,
          headers: {
            'Retry-After': Math.ceil((current.resetTime - now) / 1000).toString(),
          }
        }
      );
    }

    current.count++;
    rateLimitMap.set(ip, current);

    return await handler(req);
  };
}

/**
 * Input validation middleware
 */
export function withValidation<T>(
  handler: (req: NextRequest, validatedData: T) => Promise<NextResponse>,
  schema: {
    validate: (data: any) => { success: boolean; data?: T; error?: any };
  }
) {
  return async (req: NextRequest) => {
    try {
      const body = await req.json();
      const validation = schema.validate(body);

      if (!validation.success) {
        return NextResponse.json(
          { error: 'Invalid input', details: validation.error },
          { status: 400 }
        );
      }

      return await handler(req, validation.data!);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid JSON' },
        { status: 400 }
      );
    }
  };
}

/**
 * CORS middleware for API routes
 */
export function withCors(
  handler: (req: NextRequest) => Promise<NextResponse>,
  options: {
    origin?: string[];
    methods?: string[];
    headers?: string[];
  } = {}
) {
  const {
    origin = ['http://localhost:3001'],
    methods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    headers = ['Content-Type', 'Authorization'],
  } = options;

  return async (req: NextRequest) => {
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': origin.join(', '),
          'Access-Control-Allow-Methods': methods.join(', '),
          'Access-Control-Allow-Headers': headers.join(', '),
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    const response = await handler(req);

    // Add CORS headers to response
    response.headers.set('Access-Control-Allow-Origin', origin.join(', '));
    response.headers.set('Access-Control-Allow-Methods', methods.join(', '));
    response.headers.set('Access-Control-Allow-Headers', headers.join(', '));

    return response;
  };
}

/**
 * Combine multiple middleware functions
 */
export function combineMiddleware(
  ...middlewares: Array<(handler: any) => any>
) {
  return (handler: any) => {
    return middlewares.reduceRight((acc, middleware) => middleware(acc), handler);
  };
}
