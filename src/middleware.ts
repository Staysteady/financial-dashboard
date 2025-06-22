import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { rateLimiter, RATE_LIMIT_CONFIGS } from '@/lib/rate-limiter';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Apply rate limiting first for security
  const rateLimitResult = await applyRateLimit(request);
  if (rateLimitResult) {
    return rateLimitResult;
  }

  // Skip Supabase auth check if environment variables are not set (for testing)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  let user = null;

  if (supabaseUrl && supabaseKey) {
    const supabase = createServerClient(
      supabaseUrl,
      supabaseKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            );
            response = NextResponse.next({
              request,
            });
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    // Refresh session if expired - required for Server Components
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      user = authUser;
    } catch (error) {
      console.warn('Supabase auth check failed:', error);
    }
  }

  // Protected routes that require authentication
  const protectedRoutes = ['/dashboard', '/api/accounts', '/api/transactions', '/api/budgets'];
  const isProtectedRoute = protectedRoutes.some(route => 
    request.nextUrl.pathname.startsWith(route)
  );

  // Auth routes that should redirect if already authenticated
  const authRoutes = ['/auth/login', '/auth/signup', '/auth/reset-password'];
  const isAuthRoute = authRoutes.some(route => 
    request.nextUrl.pathname.startsWith(route)
  );

  // Redirect unauthenticated users from protected routes to login
  // TODO: Re-enable once auth pages are created
  // if (isProtectedRoute && !user) {
  //   const redirectUrl = new URL('/auth/login', request.url);
  //   redirectUrl.searchParams.set('redirectTo', request.nextUrl.pathname);
  //   return NextResponse.redirect(redirectUrl);
  // }

  // Redirect authenticated users from auth routes to dashboard
  if (isAuthRoute && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Security headers for all routes
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co wss://*.supabase.co;"
  );

  return response;
}

// Apply rate limiting based on route
async function applyRateLimit(request: NextRequest): Promise<Response | null> {
  const pathname = request.nextUrl.pathname;
  
  // Determine rate limit configuration based on route
  let configKey: keyof typeof RATE_LIMIT_CONFIGS = 'api_general';
  
  if (pathname.startsWith('/api/auth')) {
    configKey = 'auth';
  } else if (pathname.includes('/api/banking') || pathname.includes('/api/integrations')) {
    configKey = 'banking_api';
  } else if (pathname.includes('/api/export')) {
    configKey = 'export';
  } else if (pathname.includes('/api/upload')) {
    configKey = 'upload';
  } else if (pathname.includes('/reset-password')) {
    configKey = 'password_reset';
  } else if (pathname.includes('/verify-otp')) {
    configKey = 'otp_verification';
  } else if (!pathname.startsWith('/api/')) {
    // Don't rate limit non-API routes as strictly
    return null;
  }

  const config = RATE_LIMIT_CONFIGS[configKey];
  const result = await rateLimiter.checkRateLimit(request, config);
  
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

  return null;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
